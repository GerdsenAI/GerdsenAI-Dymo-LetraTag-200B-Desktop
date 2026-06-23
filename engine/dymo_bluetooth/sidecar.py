"""
Long-running stdio JSON-RPC bridge around the dymo_bluetooth engine.

The desktop app (Tauri/Rust) spawns this process once and keeps it alive, so a
Bluetooth connection can persist across calls and the print loop can stream
progress. Communication is newline-delimited JSON, one object per line:

  Request:  {"id": <int>, "method": <str>, "params": {...}}
  Response: {"id": <int>, "result": {...}}  |  {"id": <int>, "error": {"message": <str>}}
  Event:    {"event": <str>, ...}            (no id; unsolicited, e.g. print progress)

stdout carries ONLY protocol JSON. Everything human-readable goes to stderr, so
the host can keep the two streams cleanly separated.

Methods
-------
  ping                                  -> {"ok": true, "version": <str>}
  scan    {timeout?, ensure_mac?}       -> {"printers": [{address, name, rssi}]}
  connect {address}                     -> {"connected": true, "address", "name"}
  disconnect                            -> {"connected": false}
  print   {png_base64, stretch?,        -> {"code": <0-7>, "name": <str>}
           address?}
      emits: {"event":"print_stage", "stage":"rasterizing"|"sending"}
             {"event":"print_progress", "sent", "total", "percent"}

The frontend is the single source of truth for pixels: it bakes text, padding and
invert into the 30px-tall PNG it sends here, so the sidecar only thresholds it to a
Canvas and applies the horizontal `stretch` before handing it to the print head.
That keeps the live preview byte-for-byte identical to what is printed.
"""

import asyncio
import base64
import json
import sys
import threading
import traceback
from io import BytesIO
from typing import Any, Dict, List, Optional

VERSION = "0.1.0"


def _log(*args: Any) -> None:
    """Diagnostics go to stderr only — stdout is reserved for protocol JSON."""
    print("[sidecar]", *args, file=sys.stderr, flush=True)


class Sidecar:
    def __init__(self) -> None:
        # Lazily imported so an `import error` surfaces as a clean JSON error
        # rather than killing the process before the host can read it.
        self._printer = None
        self._devices: Dict[str, Any] = {}
        self._out_lock = threading.Lock()

    # ----- wire I/O -------------------------------------------------------

    def _write(self, obj: Dict[str, Any]) -> None:
        line = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
        with self._out_lock:
            sys.stdout.write(line + "\n")
            sys.stdout.flush()

    def _event(self, event: str, **fields: Any) -> None:
        payload = {"event": event}
        payload.update(fields)
        self._write(payload)

    # ----- methods --------------------------------------------------------

    async def _scan(self, timeout: int, ensure_mac: bool) -> List[Dict[str, Any]]:
        from bleak import BleakScanner
        from dymo_bluetooth.bluetooth import SERVICE_UUID, is_espressif

        found: Dict[str, Dict[str, Any]] = {}
        devices: Dict[str, Any] = {}
        waited = 0.0
        async with BleakScanner(service_uuids=[SERVICE_UUID]) as scanner:
            while True:
                pairs = scanner.discovered_devices_and_advertisement_data.values()
                for device, adv in pairs:
                    name = device.name or ""
                    is_match = name.startswith("Letratag")
                    # On non-macOS the engine also requires the advertised name to
                    # end with the MAC (mirrors discover_printers()).
                    if sys.platform != "darwin" and is_match:
                        is_match = name.endswith(device.address.replace(":", ""))
                    if not is_match:
                        continue
                    if ensure_mac and sys.platform != "darwin":
                        try:
                            if not is_espressif(device.address):
                                continue
                        except Exception:
                            pass
                    found[device.address] = {
                        "address": device.address,
                        "name": device.name or "DYMO LetraTag 200B",
                        "rssi": getattr(adv, "rssi", None),
                    }
                    devices[device.address] = device
                if found or waited >= timeout:
                    break
                await asyncio.sleep(0.5)
                waited += 0.5
        self._devices.update(devices)
        return list(found.values())

    async def _connect(self, address: str) -> Dict[str, Any]:
        from dymo_bluetooth.bluetooth import Printer

        if not address:
            raise ValueError("connect requires an 'address'")
        # Drop any prior connection first.
        if self._printer is not None:
            try:
                await self._printer.disconnect()
            except Exception as exc:  # noqa: BLE001
                _log("disconnect-before-connect failed:", exc)
        device = self._devices.get(address)
        try:
            printer = Printer(device) if device is not None else Printer.from_address(address)
            await printer.connect()
        except Exception as exc:  # noqa: BLE001
            # A cached scan handle can go stale (WinRT especially); fall back to a
            # plain address connection before giving up.
            if device is None:
                raise
            _log(f"connect via cached device failed ({exc!r}); retrying by address")
            printer = Printer.from_address(address)
            await printer.connect()
        self._printer = printer
        return {"connected": True, "address": printer.address, "name": "DYMO LetraTag 200B"}

    async def _disconnect(self) -> Dict[str, Any]:
        if self._printer is not None:
            try:
                await self._printer.disconnect()
            finally:
                self._printer = None
        return {"connected": False}

    async def _print(self, params: Dict[str, Any]) -> Dict[str, Any]:
        from PIL import Image
        from dymo_bluetooth.bluetooth import convert_image_to_canvas

        raw = params.get("png_base64") or ""
        if "," in raw[:64] and raw.lstrip().startswith("data:"):
            raw = raw.split(",", 1)[1]
        png = base64.b64decode(raw)
        stretch = int(params.get("stretch", 2) or 1)
        address = params.get("address") or (self._printer.address if self._printer is not None else None)

        self._event("print_stage", stage="rasterizing")
        image = Image.open(BytesIO(png))
        # The PNG is already 1-bit black/white (the frontend thresholded it), so no
        # dithering — black pixels become ink.
        canvas = convert_image_to_canvas(image, dither=False, trim=False)
        if stretch and stretch != 1:
            canvas = canvas.stretch(stretch)

        def on_progress(sent: int, total: int) -> None:
            self._event(
                "print_progress",
                sent=sent,
                total=total,
                percent=round(sent * 100 / total) if total else 100,
            )

        async def attempt() -> Dict[str, Any]:
            self._event("print_stage", stage="sending")
            result = await self._printer.print(canvas, on_progress=on_progress)
            return {"code": result.value, "name": result.name}

        # The LetraTag drops idle BLE links, so a connection from the Connect screen
        # may be dead by print time (WinRT then reports "Could not get GATT services:
        # Unreachable"). Try the current link; on ANY failure, reconnect fresh and
        # retry once — matching the engine's connect-then-print pattern.
        try:
            if self._printer is None or not self._printer.is_connected:
                if not address:
                    raise RuntimeError("Printer is not connected")
                await self._connect(address)
            return await attempt()
        except Exception as exc:  # noqa: BLE001
            _log(f"print failed ({exc!r}); reconnecting and retrying")
            if not address:
                raise
            await asyncio.sleep(0.4)
            await self._connect(address)
            return await attempt()

    async def _dispatch(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if method == "ping":
            return {"ok": True, "version": VERSION, "platform": sys.platform}
        if method == "scan":
            printers = await self._scan(
                int(params.get("timeout", 5)),
                bool(params.get("ensure_mac", False)),
            )
            return {"printers": printers}
        if method == "connect":
            return await self._connect(params.get("address", ""))
        if method == "disconnect":
            return await self._disconnect()
        if method == "print":
            return await self._print(params)
        raise ValueError(f"unknown method: {method!r}")

    async def _handle(self, line: str) -> None:
        try:
            msg = json.loads(line)
        except Exception as exc:  # noqa: BLE001
            self._write({"id": None, "error": {"message": f"invalid JSON: {exc}"}})
            return
        rid = msg.get("id")
        method = msg.get("method", "")
        params = msg.get("params") or {}
        try:
            result = await self._dispatch(method, params)
            self._write({"id": rid, "result": result})
        except Exception as exc:  # noqa: BLE001
            _log("error handling", method, "->", repr(exc))
            _log(traceback.format_exc())
            self._write({"id": rid, "error": {"message": str(exc) or exc.__class__.__name__}})

    async def serve(self) -> None:
        loop = asyncio.get_running_loop()
        queue: "asyncio.Queue[Optional[str]]" = asyncio.Queue()

        def reader() -> None:
            # Blocking stdin reads live on their own thread; lines are handed to the
            # asyncio loop. This is the portable way to read a pipe on Windows, where
            # loop.add_reader() is unavailable on the Proactor loop.
            try:
                for raw in sys.stdin:
                    loop.call_soon_threadsafe(queue.put_nowait, raw)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        threading.Thread(target=reader, name="stdin-reader", daemon=True).start()
        self._event("ready", version=VERSION)
        _log(f"ready (v{VERSION}, {sys.platform})")

        while True:
            line = await queue.get()
            if line is None:
                break
            line = line.strip()
            if not line:
                continue
            await self._handle(line)
        _log("stdin closed, exiting")


def main() -> None:
    try:
        sys.stdin.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")  # type: ignore[union-attr]
    except Exception:  # noqa: BLE001
        pass
    try:
        asyncio.run(Sidecar().serve())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
