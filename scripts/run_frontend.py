import os
import sys
import subprocess
import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"

def kill_port(port: int):
    kill_script = ROOT / "kill_port.py"
    if kill_script.exists():
        try:
            subprocess.call([sys.executable, str(kill_script), str(port)])
        except Exception as e:
            print(f"Warning: Failed to run kill_port.py: {e}")

def get_npm_cmd():
    if sys.platform == "win32":
        npm_path = shutil.which("npm.cmd") or shutil.which("npm")
        if not npm_path:
            # Check common Windows installation directories
            candidates = [
                Path(os.environ.get("ProgramFiles", "C:\\Program Files")) / "nodejs" / "npm.cmd",
                Path(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")) / "nodejs" / "npm.cmd",
                Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "node" / "npm.cmd",
                Path(os.environ.get("APPDATA", "")) / "npm" / "npm.cmd",
            ]
            for c in candidates:
                if c.exists():
                    npm_path = str(c)
                    break
        return npm_path or "npm.cmd"
    return shutil.which("npm") or "npm"

def ensure_monaco_assets():
    """Ensure Monaco Editor local assets are present in public/vs."""
    public_vs = FRONTEND_DIR / "public" / "vs"
    monaco_src = FRONTEND_DIR / "node_modules" / "monaco-editor" / "min" / "vs"
    loader_file = public_vs / "loader.js"
    if not loader_file.exists() and monaco_src.exists():
        print("Ensuring Monaco editor local assets exist in frontend/public/vs...")
        try:
            public_vs.mkdir(parents=True, exist_ok=True)
            shutil.copytree(str(monaco_src), str(public_vs), dirs_exist_ok=True)
            print("Monaco editor assets copied successfully.")
        except Exception as e:
            print(f"Warning: Could not copy monaco assets: {e}")

def install_dependencies():
    print("Installing/updating frontend dependencies...")
    npm = get_npm_cmd()
    try:
        ret = subprocess.call([npm, "install"], cwd=str(FRONTEND_DIR), shell=(sys.platform == "win32"))
        if ret != 0:
            print("Notice: Initial npm install encountered an issue, retrying...")
            subprocess.call([npm, "install"], cwd=str(FRONTEND_DIR), shell=(sys.platform == "win32"))
    except FileNotFoundError:
        print("\n" + "="*70)
        print("ERROR: Node.js / npm is not installed or not found in PATH.")
        print("Please download and install Node.js (LTS version) from https://nodejs.org/")
        print("After installing, restart VS Code or your terminal.")
        print("="*70 + "\n")
        sys.exit(1)
    ensure_monaco_assets()

def run_dev(port: int = 5173):
    kill_port(port)
    ensure_monaco_assets()
    print(f"Starting Vite development server on port {port}...")
    npm = get_npm_cmd()
    try:
        subprocess.run([npm, "run", "dev"], cwd=str(FRONTEND_DIR), shell=(sys.platform == "win32"))
    except FileNotFoundError:
        print("\n" + "="*70)
        print("ERROR: Node.js / npm is not installed or not found in PATH.")
        print("Please download and install Node.js (LTS version) from https://nodejs.org/")
        print("="*70 + "\n")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nFrontend server stopped.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cross-platform runner for ACPIS frontend server.")
    parser.add_argument("--install", action="store_true", help="Install or update npm dependencies before running.")
    parser.add_argument("--port", type=int, default=5173, help="Port to bind to (default: 5173).")
    
    args = parser.parse_args()
    
    node_modules_dir = FRONTEND_DIR / "node_modules"
    public_vs_dir = FRONTEND_DIR / "public" / "vs"
    
    if args.install or not node_modules_dir.exists() or not (public_vs_dir / "loader.js").exists():
        install_dependencies()
        
    run_dev(port=args.port)
