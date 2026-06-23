"""
Cross-platform sidecar freezer (used by CI on macOS and Windows).

Freezes engine/dymo_bluetooth/sidecar.py with PyInstaller and copies the result
to src-tauri/binaries/dymo-sidecar-<target-triple>[.exe] — the name Tauri expects
for an external binary. Run with a Python that has the engine deps + pyinstaller
installed (CI installs them into the system Python; locally use engine/.venv).
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / "engine"


def target_triple() -> str:
    out = subprocess.check_output(["rustc", "-Vv"], text=True)
    for line in out.splitlines():
        if line.startswith("host:"):
            return line.split()[1].strip()
    raise SystemExit("could not determine rustc host triple")


def main() -> None:
    triple = target_triple()
    work = ROOT / "build" / "sidecar"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    subprocess.check_call([
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--onefile", "--console",
        "--name", "dymo-sidecar",
        "--collect-all", "bleak",
        "--collect-submodules", "dymo_bluetooth",
        "--hidden-import", "PIL.Image", "--hidden-import", "PIL.ImageChops",
        "--paths", str(ENGINE),
        "--distpath", str(work / "dist"),
        "--workpath", str(work / "build"),
        "--specpath", str(work),
        str(ENGINE / "dymo_bluetooth" / "sidecar.py"),
    ])

    ext = ".exe" if os.name == "nt" else ""
    src = work / "dist" / f"dymo-sidecar{ext}"
    dst_dir = ROOT / "src-tauri" / "binaries"
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / f"dymo-sidecar-{triple}{ext}"
    shutil.copy2(src, dst)
    print(f"sidecar -> {dst} ({dst.stat().st_size / 1_048_576:.1f} MB)")


if __name__ == "__main__":
    main()
