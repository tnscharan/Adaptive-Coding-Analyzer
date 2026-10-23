import sys
import subprocess

def kill_ports(ports):
    for port in ports:
        print(f"Checking process on port {port}...")
        try:
            if sys.platform == 'win32':
                # Windows netstat check (safe for non-English locales and any encoding)
                output = subprocess.check_output("netstat -ano", shell=True).decode(errors="ignore")
                pids_killed = set()
                for line in output.strip().splitlines():
                    parts = line.strip().split()
                    if len(parts) >= 4:
                        # Find local address column and pid
                        # Usually: Proto, Local Address, Foreign Address, [State], PID
                        local_addr = parts[1]
                        if local_addr.endswith(f":{port}") or local_addr.endswith(f":[{port}]"):
                            pid = parts[-1]
                            if pid.isdigit() and pid not in pids_killed and pid not in ('0', '4'):
                                print(f"Killing process {pid} using port {port}...")
                                subprocess.call(f"taskkill /F /PID {pid} >nul 2>&1", shell=True)
                                pids_killed.add(pid)
            else:
                # Unix check: try lsof, then fuser
                pids_killed = set()
                try:
                    output = subprocess.check_output(f"lsof -t -i:{port} 2>/dev/null", shell=True).decode(errors="ignore").strip()
                    if output:
                        for pid in output.split():
                            if pid.strip().isdigit() and pid.strip() not in pids_killed:
                                print(f"Killing process {pid.strip()} using port {port}...")
                                subprocess.call(f"kill -9 {pid.strip()} 2>/dev/null", shell=True)
                                pids_killed.add(pid.strip())
                except Exception:
                    pass

                # Fallback to fuser if lsof didn't find or is missing
                if not pids_killed:
                    try:
                        subprocess.call(f"fuser -k {port}/tcp >/dev/null 2>&1", shell=True)
                    except Exception:
                        pass
            print(f"Port {port} check/cleanup completed.")
        except subprocess.CalledProcessError:
            print(f"Port {port} check completed.")
        except Exception as e:
            print(f"Error checking port {port}: {e}")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        ports = [int(p) for p in sys.argv[1:]]
        kill_ports(ports)
    else:
        print("No ports specified. Usage: python kill_port.py <port1> [port2] ...")
