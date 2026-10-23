import os
import tempfile
import time
import shutil
import logging
import asyncio
import sys

try:
    import docker
    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False

logger = logging.getLogger(__name__)

ALLOW_LOCAL_FALLBACK = os.getenv("ALLOW_LOCAL_FALLBACK", "true").lower() in ("true", "1", "yes")

class ExecutionManager:
    def __init__(self, image_name: str = "coding-intelligence-sandbox"):
        self._client = None
        self._client_checked = False
        self.image_name = image_name

    @property
    def client(self):
        if not self._client_checked:
            self._client_checked = True
            if DOCKER_AVAILABLE:
                try:
                    self._client = docker.from_env()
                    # Test connectivity
                    self._client.ping()
                    logger.info("Docker daemon successfully detected and connected.")
                except Exception as e:
                    self._client = None
                    logger.warning("Docker daemon is not running (local execution fallback enabled).")
                    logger.debug(f"Docker daemon connection check failed: {e}")
            else:
                logger.warning("Docker library is not installed.")
        return self._client

    async def _run_local_async(self, code: str, language: str, timeout: int):
        import sys
        import subprocess
        temp_dir = tempfile.mkdtemp()
        lang = language.lower().strip()
        filename_map = {
            "python": "main.py",
            "javascript": "main.js",
            "java": "Main.java",
            "c": "main.c",
            "cpp": "main.cpp"
        }
        
        if lang not in filename_map:
            yield {"type": "error", "content": f"Unsupported execution language: {language}"}
            shutil.rmtree(temp_dir, ignore_errors=True)
            return

        filename = filename_map[lang]
        code_path = os.path.join(temp_dir, filename)
        
        try:
            with open(code_path, "w", encoding="utf-8") as f:
                f.write(code)

            cmd = None
            compile_cmd = None
            
            if lang == "python":
                cmd = [sys.executable, code_path]
            elif lang == "javascript":
                cmd = ["node", code_path]
            elif lang == "java":
                compile_cmd = ["javac", "-d", temp_dir, code_path]
                cmd = ["java", "-cp", temp_dir, "Main"]
            elif lang == "c":
                exec_name = "main.exe" if sys.platform == "win32" else "main"
                exec_path = os.path.join(temp_dir, exec_name)
                compile_cmd = ["gcc", "-O2", code_path, "-o", exec_path]
                cmd = [exec_path]
            elif lang == "cpp":
                exec_name = "main.exe" if sys.platform == "win32" else "main"
                exec_path = os.path.join(temp_dir, exec_name)
                compile_cmd = ["g++", "-O2", code_path, "-o", exec_path]
                cmd = [exec_path]

            loop = asyncio.get_running_loop()

            if compile_cmd:
                yield {"type": "status", "content": "Compiling source code locally..."}
                try:
                    def run_compile():
                        compile_proc = subprocess.Popen(
                            compile_cmd,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True,
                            encoding='utf-8',
                            errors='replace'
                        )
                        stdout_out, stderr_out = compile_proc.communicate()
                        return compile_proc.returncode, stdout_out, stderr_out

                    return_code, compile_stdout, compile_stderr = await loop.run_in_executor(None, run_compile)
                    
                    if return_code != 0:
                        if compile_stdout:
                            yield {"type": "stdout", "content": compile_stdout}
                        if compile_stderr:
                            yield {"type": "stderr", "content": compile_stderr}
                        yield {"type": "system", "content": f"Compilation failed with exit code {return_code}"}
                        return
                except Exception as ce:
                    yield {"type": "error", "content": f"Compilation Error: {str(ce)}"}
                    return

            yield {"type": "status", "content": "Executing code locally..."}
            
            # Start runner process
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace'
            )

            queue = asyncio.Queue()
            
            def read_stream(stream, stream_type):
                for line in iter(stream.readline, ''):
                    loop.call_soon_threadsafe(queue.put_nowait, {"type": stream_type, "content": line})
                stream.close()

            # Schedule stream reading threads
            stdout_fut = loop.run_in_executor(None, read_stream, proc.stdout, "stdout")
            stderr_fut = loop.run_in_executor(None, read_stream, proc.stderr, "stderr")
            
            # Wait for process exit in thread
            wait_fut = loop.run_in_executor(None, proc.wait)

            start_time = time.time()
            line_count = 0
            exit_code = 0
            timeout_occurred = False

            while True:
                if stdout_fut.done() and stderr_fut.done() and queue.empty():
                    break
                
                elapsed = time.time() - start_time
                if elapsed > timeout:
                    timeout_occurred = True
                    try:
                        proc.kill()
                    except:
                        pass
                    yield {"type": "error", "content": f"\n[SYSTEM_LIMIT]: Timeout limit ({timeout}s) exceeded. Execution terminated."}
                    break
                
                try:
                    log_item = await asyncio.wait_for(queue.get(), timeout=0.1)
                    yield log_item
                    line_count += 1
                    queue.task_done()
                    
                    if line_count > 5000:
                        try:
                            proc.kill()
                        except:
                            pass
                        yield {"type": "error", "content": "\n[SYSTEM_LIMIT]: Output limit (5000 lines) exceeded. Execution terminated."}
                        break
                except asyncio.TimeoutError:
                    if wait_fut.done() and stdout_fut.done() and stderr_fut.done() and queue.empty():
                        break

            if not timeout_occurred:
                exit_code = await wait_fut
                yield {"type": "system", "content": f"Execution finished with exit code {exit_code}"}

        except Exception as e:
            logger.exception("Error executing code locally")
            yield {"type": "error", "content": f"Local Runtime Exception: {str(e)}"}
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    async def execute_code_stream(self, code: str, language: str = "python", timeout: int = 5):
        if not self.client:
            if ALLOW_LOCAL_FALLBACK:
                yield {
                    "type": "status",
                    "content": "Docker daemon is unavailable. Falling back to local host execution..."
                }
                async for log_event in self._run_local_async(code, language, timeout):
                    yield log_event
                return
            else:
                yield {
                    "type": "error",
                    "content": "Execution Engine Error: Docker daemon is unavailable. Local execution fallback is disabled for security hardening."
                }
                return

        # Ensure sandbox image is built
        try:
            self.client.images.get(self.image_name)
        except Exception:
            yield {"type": "status", "content": f"Sandbox image '{self.image_name}' not found. Building, this may take a moment..."}
            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(None, self.build_sandbox)
            if not success:
                if ALLOW_LOCAL_FALLBACK:
                    yield {
                        "type": "status",
                        "content": "Sandbox Docker image unavailable. Falling back to local host execution..."
                    }
                    async for log_event in self._run_local_async(code, language, timeout):
                        yield log_event
                    return
                else:
                    yield {"type": "error", "content": "Failed to compile/build secure sandbox Docker image."}
                    return

        # Define file mappings and execution commands
        lang = language.lower().strip()
        filename_map = {
            "python": "main.py",
            "javascript": "main.js",
            "java": "Main.java",
            "c": "main.c",
            "cpp": "main.cpp"
        }
        
        if lang not in filename_map:
            yield {"type": "error", "content": f"Unsupported execution language: {language}"}
            return

        filename = filename_map[lang]
        
        # Determine internal command to execute
        if lang == "python":
            cmd = ["python", f"/app/{filename}"]
        elif lang == "javascript":
            cmd = ["node", f"/app/{filename}"]
        elif lang == "java":
            cmd = ["sh", "-c", f"javac -d /tmp /app/{filename} && java -cp /tmp Main"]
        elif lang == "c":
            cmd = ["sh", "-c", f"gcc -O2 /app/{filename} -o /tmp/main && /tmp/main"]
        elif lang == "cpp":
            cmd = ["sh", "-c", f"g++ -O2 /app/{filename} -o /tmp/main && /tmp/main"]

        # Run Docker container execution in thread executor
        loop = asyncio.get_event_loop()
        async for log_event in self._run_container_async(code, filename, cmd, timeout):
            yield log_event

    async def _run_container_async(self, code: str, filename: str, cmd: list, timeout: int):
        # Create temp dir in workspace
        temp_dir = tempfile.mkdtemp()
        code_path = os.path.join(temp_dir, filename)
        
        try:
            with open(code_path, "w", encoding="utf-8") as f:
                f.write(code)

            loop = asyncio.get_event_loop()
            # Run blocking docker container run in executor
            container = await loop.run_in_executor(
                None,
                lambda: self.client.containers.run(
                    image=self.image_name,
                    command=cmd,
                    volumes={temp_dir: {'bind': '/app', 'mode': 'ro'}},
                    detach=True,
                    mem_limit="256m",
                    nano_cpus=500000000, # 0.5 CPU
                    network_disabled=True, # Disable network access inside sandbox
                    stderr=True,
                    stdout=True,
                    remove=False
                )
            )

            start_time = time.time()
            line_count = 0
            exit_code = 0
            
            # Streaming lines
            # logs(stream=True) is blocking, so fetch logs iteratively
            log_stream = container.logs(stream=True, follow=True)
            
            while True:
                # We fetch logs inside an executor to keep WebSocket server responsive
                try:
                    line = await loop.run_in_executor(None, lambda: next(log_stream, None))
                except StopIteration:
                    break
                
                if line is None:
                    break

                line_str = line.decode('utf-8', errors='replace')
                yield {"type": "stdout", "content": line_str}
                line_count += 1

                if line_count > 5000:
                    yield {"type": "error", "content": "\n[SYSTEM_LIMIT]: Output limit (5000 lines) exceeded. Execution terminated."}
                    await loop.run_in_executor(None, container.stop)
                    break

                if time.time() - start_time > timeout:
                    yield {"type": "error", "content": f"\n[SYSTEM_LIMIT]: Timeout limit ({timeout}s) exceeded. Execution terminated."}
                    await loop.run_in_executor(None, container.stop)
                    break

            result = await loop.run_in_executor(None, container.wait)
            exit_code = result.get("StatusCode", 0)

            # Retrieve any remaining error streams if return code was non-zero
            if exit_code != 0 and line_count < 5000:
                stderr_output = container.logs(stdout=False, stderr=True).decode('utf-8', errors='replace')
                if stderr_output:
                    # Clean up double printing of errors if already streamed
                    yield {"type": "stderr", "content": stderr_output}

            yield {"type": "system", "content": f"Execution finished with exit code {exit_code}"}

        except Exception as e:
            logger.error(f"Error running Docker container: {e}")
            yield {"type": "error", "content": f"Sandbox Runtime Exception: {str(e)}"}
        finally:
            # Cleanup container
            try:
                await loop.run_in_executor(None, lambda: container.remove(force=True))
            except:
                pass
            # Cleanup temporary code folder
            shutil.rmtree(temp_dir, ignore_errors=True)

    def build_sandbox(self):
        if not self.client:
            return False
        
        try:
            self.client.images.get(self.image_name)
            return True
        except Exception:
            logger.info(f"Sandbox image '{self.image_name}' not found. Compiling...")
            current_dir = os.path.abspath(os.path.dirname(__file__))
            path = None
            check_dir = current_dir
            for _ in range(5):
                candidate = os.path.join(check_dir, "infra", "docker")
                if os.path.isdir(candidate):
                    path = candidate
                    break
                check_dir = os.path.dirname(check_dir)

            if not path or not os.path.isdir(path):
                logger.error("Could not find infra/docker directory to build sandbox image.")
                return False

            try:
                # We use build_sandbox which executes the docker build command
                self.client.images.build(path=path, dockerfile="sandbox.Dockerfile", tag=self.image_name)
                logger.info(f"Successfully built Docker sandbox image '{self.image_name}'")
                return True
            except Exception as e:
                logger.error(f"Error building sandbox Docker image: {e}")
                return False
