import os
import sys
import subprocess
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
VENV_DIR = ROOT / ".venv"

def kill_port(port: int):
    kill_script = ROOT / "kill_port.py"
    if kill_script.exists():
        try:
            subprocess.call([sys.executable, str(kill_script), str(port)])
        except Exception as e:
            print(f"Warning: Failed to run kill_port.py: {e}")

def get_venv_python() -> Path:
    if sys.platform == "win32":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"

def is_dependencies_installed() -> bool:
    venv_python = get_venv_python()
    if not venv_python.exists():
        return False
    # Check if core server dependencies are importable
    ret = subprocess.call(
        [str(venv_python), "-c", "import uvicorn, fastapi, sqlalchemy"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    return ret == 0

def ensure_venv():
    venv_python = get_venv_python()
    if not venv_python.exists():
        print(f"Creating virtual environment at {VENV_DIR} (this might take a minute)...")
        try:
            import venv
            venv.create(str(VENV_DIR), with_pip=True)
            print("Virtual environment created successfully.")
        except Exception as e:
            print(f"Notice: Standard venv creation with ensurepip had an issue: {e}")
            print("Attempting alternative virtual environment creation...")
            subprocess.call([sys.executable, "-m", "venv", str(VENV_DIR)])
            if venv_python.exists():
                subprocess.call([str(venv_python), "-m", "ensurepip", "--upgrade"])

def install_dependencies():
    ensure_venv()
    venv_python = get_venv_python()
    if not venv_python.exists():
        print(f"Error: Unable to create virtual environment python at {venv_python}")
        sys.exit(1)
        
    print("Checking pip in virtual environment...")
    try:
        subprocess.call([
            str(venv_python), "-m", "pip", "install", "--upgrade", "pip",
            "--default-timeout", "60", "--retries", "2"
        ])
    except Exception:
        pass
        
    req_file = BACKEND_DIR / "requirements.txt"
    if req_file.exists():
        print("Installing/updating dependencies from backend/requirements.txt...")
        ret = subprocess.call([
            str(venv_python), "-m", "pip", "install",
            "--default-timeout", "120",
            "--retries", "5",
            "--prefer-binary",
            "-r", str(req_file)
        ])
        if ret != 0:
            print("Notice: Initial pip install failed, retrying with extended timeout...")
            subprocess.call([
                str(venv_python), "-m", "pip", "install",
                "--default-timeout", "300",
                "--retries", "10",
                "--prefer-binary",
                "-r", str(req_file)
            ])

def run_server(host="127.0.0.1", port=8001, reload=True):
    kill_port(port)
    ensure_venv()
    venv_python = get_venv_python()
    
    if not venv_python.exists():
        print(f"Error: Python executable not found at {venv_python}")
        sys.exit(1)
        
    print(f"Starting Uvicorn backend server on http://{host}:{port}...")
    cmd = [
        str(venv_python), "-m", "uvicorn", "app.main:app",
        "--host", host,
        "--port", str(port),
        "--log-level", "info"
    ]
    if reload:
        cmd.append("--reload")
        
    try:
        subprocess.run(cmd, cwd=str(BACKEND_DIR))
    except KeyboardInterrupt:
        print("\nBackend server stopped.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cross-platform runner for Adaptive Cognitive Analyzer backend server.")
    parser.add_argument("--install", action="store_true", help="Install or update dependencies before running.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind to (default: 127.0.0.1).")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind to (default: 8001).")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload.")
    
    args = parser.parse_args()
    
    if args.install or not is_dependencies_installed():
        install_dependencies()
        
    run_server(host=args.host, port=args.port, reload=not args.no_reload)
