import os
import shutil
import pathlib
import sys
import stat
import subprocess
import time

def handle_remove_readonly(func, path, exc_info):
    """Clear the read-only attribute and retry the removal."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass

def remove_path_gracefully(path: pathlib.Path, root: pathlib.Path = None):
    """Remove a file or directory, handling permissions and read-only attributes."""
    if not path.exists():
        return False
    display_path = path.relative_to(root) if root else path.name
    try:
        if path.is_file() or path.is_symlink():
            try:
                os.chmod(path, stat.S_IWRITE)
            except Exception:
                pass
            path.unlink()
            print(f"  - Removed file: {display_path}")
            return True
        elif path.is_dir():
            shutil.rmtree(path, onerror=handle_remove_readonly)
            if not path.exists():
                print(f"  - Removed directory: {display_path}")
                return True
            else:
                print(f"  ! Partially removed directory (some files locked): {display_path}")
                return False
    except Exception as e:
        print(f"  ! Failed to remove {display_path}: {e}")
        return False

def get_directory_size_bytes(directory: pathlib.Path) -> int:
    """Calculate total size of all files in a directory."""
    total = 0
    try:
        for item in directory.rglob('*'):
            if item.is_file() and not item.is_symlink():
                try:
                    total += item.stat().st_size
                except (OSError, FileNotFoundError):
                    pass
    except Exception:
        pass
    return total

def format_size(size_bytes: int) -> str:
    """Format bytes to human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

def kill_running_servers(root: pathlib.Path):
    """Stop any active backend or frontend servers locking files."""
    kill_script = root / "kill_port.py"
    if kill_script.exists():
        try:
            print("Stopping running dev servers on ports 8001 and 5173 to unlock files...")
            subprocess.call([sys.executable, str(kill_script), "8001", "5173"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(0.5)
        except Exception:
            pass

def clean_project(keep_deps: bool = False):
    root = pathlib.Path(__file__).parent.parent.resolve()
    print(f"\n=======================================================")
    print(f" Cleaning Project for Easy Sharing / Archival")
    print(f" Root: {root}")
    print(f"=======================================================")
    
    # 0. Free up locked ports/files
    kill_running_servers(root)
    
    initial_size = get_directory_size_bytes(root)
    print(f"Initial project size: {format_size(initial_size)}\n")
    
    if keep_deps:
        print("Note: --keep-deps specified. Preserving .venv and node_modules.\n")
    else:
        print("Lightweight transfer mode (Default):")
        print("  Cleaning .venv, node_modules, and build assets to reduce size to < 1 MB.\n")

    # 1. Clean .venv unless keep_deps
    if not keep_deps:
        venv_dir = root / ".venv"
        if venv_dir.exists():
            active_exec = pathlib.Path(sys.executable).resolve()
            is_running_from_venv = False
            try:
                is_running_from_venv = active_exec.is_relative_to(venv_dir)
            except (AttributeError, ValueError):
                is_running_from_venv = False
            
            if not is_running_from_venv:
                print("Removing virtual environment (.venv)...")
                remove_path_gracefully(venv_dir, root)
            else:
                print("Notice: Clean script is running with .venv Python.")
                print("Emptying site-packages and scheduling full .venv deletion...")
                for item in venv_dir.iterdir():
                    if item.name.lower() in ("scripts", "bin"):
                        continue
                    remove_path_gracefully(item, root)
                if sys.platform == "win32":
                    # Schedule self-deletion after process exits
                    cmd = f'timeout /t 1 /nobreak >nul & rmdir /s /q "{venv_dir}"'
                    subprocess.Popen(f'cmd /c "{cmd}"', shell=True)

    # 2. Large directories & build artifacts
    paths_to_remove = [
        root / ".pytest_cache",
        root / "backend" / ".pytest_cache",
        root / "frontend" / "dist",
        root / "frontend" / ".svelte-kit",
        root / "frontend" / ".next",
    ]

    if not keep_deps:
        paths_to_remove.extend([
            root / "frontend" / "node_modules",
            root / "frontend" / "public" / "vs",
        ])

    for path in paths_to_remove:
        if path.exists():
            remove_path_gracefully(path, root)

    # 3. Clean local databases in backend/data (preserve .gitkeep)
    backend_data_dir = root / "backend" / "data"
    if backend_data_dir.exists():
        for item in backend_data_dir.iterdir():
            if item.is_file() and item.name != ".gitkeep" and item.suffix in (".db", ".sqlite", ".sqlite3"):
                remove_path_gracefully(item, root)

    # 4. Walk directory to clean __pycache__, log files, and stray compiler outputs
    exclude_dirs = {".git"}
    if keep_deps:
        exclude_dirs.update({".venv", "node_modules"})

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        path_dir = pathlib.Path(dirpath)
        
        # Remove __pycache__
        if "__pycache__" in dirnames:
            pycache_path = path_dir / "__pycache__"
            remove_path_gracefully(pycache_path, root)
            dirnames.remove("__pycache__")
            
        # Clean logs
        for filename in filenames:
            if filename.endswith(".log") or filename == "npm-debug.log":
                file_path = path_dir / filename
                remove_path_gracefully(file_path, root)
                        
        # Clean stray python bytecode
        for filename in filenames:
            if filename.endswith((".pyc", ".pyo", ".pyd")):
                file_path = path_dir / filename
                remove_path_gracefully(file_path, root)

    final_size = get_directory_size_bytes(root)
    freed_size = max(0, initial_size - final_size)
    
    print("\n=======================================================")
    print(f" CLEANUP COMPLETE")
    print(f"   Space Freed:   {format_size(freed_size)}")
    print(f"   Final Size:    {format_size(final_size)}")
    print(f"=======================================================")
    print(" The project is now lightweight and ready to copy/send!")
    print(" On the new laptop:")
    print("   Open the folder in VS Code and run task 'Install and Run Tasks'")
    print("   (or press Ctrl+Shift+B) to automatically rebuild everything.")
    print("=======================================================\n")

if __name__ == "__main__":
    # By default, cleans all dependencies down to < 1 MB.
    # Use --keep-deps or -k to preserve .venv and node_modules.
    keep_deps = "--keep-deps" in sys.argv or "-k" in sys.argv
    clean_project(keep_deps=keep_deps)
