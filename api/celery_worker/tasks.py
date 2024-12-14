import io
import contextlib
import subprocess
import tempfile
import shutil
import os
from .main import celery_instance


@celery_instance.task(time_limit=500)
def execute_code(code: str, requirements: list):
    temp_dir = tempfile.mkdtemp(dir="/tmp")
    print(f"Temporary directory: {temp_dir}")
    print(f"Permissions for /tmp: {os.stat('/tmp')}")
    print(f"Permissions for {temp_dir}: {os.stat(temp_dir)}")

    try:
        # If there are requirements, create the virtual environment
        if requirements:
            venv_path = os.path.join(temp_dir, "venv")
            subprocess.run(["python3", "-m", "venv", venv_path], check=True)

            # Install requirements inside the virtual environment
            pip_path = os.path.join(venv_path, "bin", "pip")
            subprocess.run([pip_path, "install", *requirements], check=True)

            # Use the virtual environment's Python interpreter to execute code
            python_path = os.path.join(venv_path, "bin", "python")
        else:
            # If no requirements, use the system's Python interpreter
            python_path = "python3"

        # Capture stdout and stderr using StringIO
        stdout = io.StringIO()
        stderr = io.StringIO()

        # If requirements exist, use the virtual environment's Python interpreter to execute the code
        if requirements:
            # Execute code within the context of the virtual environment
            exec_locals = {}
            code_obj = compile(code, "<string>", "exec")

            print("Running code in virtual environment: ", python_path)
            try:
                res = subprocess.run(
                    [python_path, "-c", f"exec({repr(code)})"],
                    capture_output=True,
                    check=True,
                )
                return {"stdout": res.stdout.decode(), "stderr": res.stderr.decode()}
            except subprocess.CalledProcessError as e:
                print("Error in subprocess.run: error ", e)

        else:
            # No requirements, run the code directly in the system environment
            exec_locals = {}
            code_obj = compile(code, "<string>", "exec")

            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                exec(code_obj, exec_locals)

        return {"stdout": stdout.getvalue(), "stderr": stderr.getvalue()}

    finally:
        # Clean up the temporary directory if the venv was created
        if requirements:
            shutil.rmtree(temp_dir)
