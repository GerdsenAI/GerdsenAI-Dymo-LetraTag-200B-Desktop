//! GerdsenAI Label Studio — Tauri shell.
//!
//! Bridges the React frontend to the Python `dymo_bluetooth` engine, which runs as
//! a long-lived child process ("sidecar") speaking newline-delimited JSON-RPC over
//! stdio. We spawn it once, correlate responses by id, and relay the engine's
//! `print_progress` / `print_stage` events to the webview via Tauri events.
//!
//! In a debug build the sidecar is the engine's Python module run from the local
//! venv (fast iteration). In a release build it is the PyInstaller-frozen binary
//! bundled next to the app executable.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStdin, Command};
use tokio::sync::{oneshot, Mutex};

/// Shared handle to the running sidecar process.
struct Bridge {
    stdin: Mutex<ChildStdin>,
    pending: Mutex<HashMap<u64, oneshot::Sender<Value>>>,
    next_id: AtomicU64,
    /// Kept alive so the child isn't reaped; `kill_on_drop` is the backstop, but the
    /// primary shutdown path is the child seeing EOF on stdin when the app exits.
    _child: Mutex<tokio::process::Child>,
}

type SharedBridge = Arc<Bridge>;

/// Picks the base command: dev runs the venv Python module, release runs the
/// frozen binary bundled next to the app executable.
fn base_sidecar_command() -> std::process::Command {
    #[cfg(debug_assertions)]
    {
        // Dev: run the engine module straight from the local venv. cwd = engine/ so
        // `python -m dymo_bluetooth.sidecar` can import the package.
        let engine = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("engine");
        let python = if cfg!(windows) {
            engine.join(".venv").join("Scripts").join("python.exe")
        } else {
            engine.join(".venv").join("bin").join("python")
        };
        let mut c = std::process::Command::new(python);
        c.arg("-m").arg("dymo_bluetooth.sidecar");
        c.current_dir(&engine);
        c
    }

    #[cfg(not(debug_assertions))]
    {
        // Release: the frozen sidecar binary sits next to the app executable.
        let dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."));
        let bin = if cfg!(windows) {
            dir.join("dymo-sidecar.exe")
        } else {
            dir.join("dymo-sidecar")
        };
        std::process::Command::new(bin)
    }
}

/// Builds the OS command that launches the sidecar, applying the Windows
/// no-console flag.
fn sidecar_std_command() -> std::process::Command {
    #[allow(unused_mut)]
    let mut cmd = base_sidecar_command();
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW — don't flash a console for the sidecar.
        cmd.creation_flags(0x0800_0000);
    }
    cmd
}

/// Spawns the sidecar, wires up the stdout reader + stderr logger, and registers the
/// bridge as managed state. Runs to completion (synchronously, via block_on) during
/// `setup` so the bridge exists before any command can be invoked.
async fn start_sidecar(app: AppHandle) -> Result<(), String> {
    let mut command = Command::from(sidecar_std_command());
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    let mut child = command
        .spawn()
        .map_err(|e| format!("failed to launch sidecar: {e}"))?;

    let stdin = child.stdin.take().ok_or("sidecar stdin unavailable")?;
    let stdout = child.stdout.take().ok_or("sidecar stdout unavailable")?;
    let stderr = child.stderr.take();

    let bridge: SharedBridge = Arc::new(Bridge {
        stdin: Mutex::new(stdin),
        pending: Mutex::new(HashMap::new()),
        next_id: AtomicU64::new(1),
        _child: Mutex::new(child),
    });
    app.manage(bridge.clone());

    // Forward sidecar diagnostics to our own stderr.
    if let Some(stderr) = stderr {
        tauri::async_runtime::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[sidecar:err] {line}");
            }
        });
    }

    // Read protocol JSON from the sidecar: responses resolve pending requests,
    // events get emitted to the frontend.
    let reader_app = app.clone();
    let reader_bridge = bridge.clone();
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let value: Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => {
                    eprintln!("[sidecar] non-json line: {line}");
                    continue;
                }
            };
            if let Some(id) = value.get("id").and_then(Value::as_u64) {
                if let Some(tx) = reader_bridge.pending.lock().await.remove(&id) {
                    let _ = tx.send(value);
                }
            } else if let Some(event) = value.get("event").and_then(Value::as_str) {
                match event {
                    "print_progress" => {
                        let _ = reader_app.emit("print-progress", value.clone());
                    }
                    "print_stage" => {
                        let _ = reader_app.emit("print-stage", value.clone());
                    }
                    "ready" => eprintln!("[sidecar] ready"),
                    other => eprintln!("[sidecar] event: {other}"),
                }
            }
        }
        eprintln!("[sidecar] stdout closed");
        let _ = reader_app.emit("sidecar-exit", json!({}));
    });

    Ok(())
}

/// Sends one JSON-RPC request and awaits its correlated response.
async fn rpc(
    bridge: &SharedBridge,
    method: &str,
    params: Value,
    timeout: Duration,
) -> Result<Value, String> {
    let id = bridge.next_id.fetch_add(1, Ordering::SeqCst);
    let (tx, rx) = oneshot::channel();
    bridge.pending.lock().await.insert(id, tx);

    let request = json!({ "id": id, "method": method, "params": params });
    let line = format!("{}\n", serde_json::to_string(&request).unwrap());
    {
        let mut stdin = bridge.stdin.lock().await;
        stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| format!("write to sidecar failed: {e}"))?;
        stdin
            .flush()
            .await
            .map_err(|e| format!("flush to sidecar failed: {e}"))?;
    }

    match tokio::time::timeout(timeout, rx).await {
        Ok(Ok(value)) => {
            if let Some(err) = value.get("error") {
                let msg = err
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or("sidecar error")
                    .to_string();
                Err(msg)
            } else {
                Ok(value.get("result").cloned().unwrap_or(Value::Null))
            }
        }
        Ok(Err(_)) => Err("sidecar connection closed".into()),
        Err(_) => {
            bridge.pending.lock().await.remove(&id);
            Err(format!("'{method}' timed out"))
        }
    }
}

#[tauri::command]
async fn sidecar_ping(bridge: State<'_, SharedBridge>) -> Result<Value, String> {
    rpc(bridge.inner(), "ping", json!({}), Duration::from_secs(5)).await
}

#[tauri::command]
async fn scan(
    bridge: State<'_, SharedBridge>,
    timeout: Option<u64>,
    ensure_mac: Option<bool>,
) -> Result<Value, String> {
    let t = timeout.unwrap_or(5);
    rpc(
        bridge.inner(),
        "scan",
        json!({ "timeout": t, "ensure_mac": ensure_mac.unwrap_or(false) }),
        Duration::from_secs(t + 8),
    )
    .await
}

#[tauri::command]
async fn connect(bridge: State<'_, SharedBridge>, address: String) -> Result<Value, String> {
    rpc(
        bridge.inner(),
        "connect",
        json!({ "address": address }),
        Duration::from_secs(25),
    )
    .await
}

#[tauri::command]
async fn disconnect(bridge: State<'_, SharedBridge>) -> Result<Value, String> {
    rpc(
        bridge.inner(),
        "disconnect",
        json!({}),
        Duration::from_secs(10),
    )
    .await
}

#[tauri::command]
async fn print_label(
    bridge: State<'_, SharedBridge>,
    png_base64: String,
    stretch: Option<u32>,
    address: Option<String>,
) -> Result<Value, String> {
    let mut params = json!({ "png_base64": png_base64, "stretch": stretch.unwrap_or(2) });
    if let Some(addr) = address {
        params["address"] = json!(addr);
    }
    rpc(bridge.inner(), "print", params, Duration::from_secs(120)).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            // Block briefly so the bridge is managed before the UI can call it.
            tauri::async_runtime::block_on(async move {
                if let Err(err) = start_sidecar(handle).await {
                    eprintln!("[sidecar] start failed: {err}");
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sidecar_ping,
            scan,
            connect,
            disconnect,
            print_label
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
