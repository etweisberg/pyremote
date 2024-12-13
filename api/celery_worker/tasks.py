import os
import subprocess
import tempfile
import shutil
from .main import celery_instance


@celery_instance.task(time_limit=500)
def execute_code(code: str, requirements: list):
    temp_dir = tempfile.mkdtemp(dir="/tmp")
    print(f"Temporary directory: {temp_dir}")
    print(f"Permissions for /tmp: {os.stat('/tmp')}")
    print(f"Permissions for {temp_dir}: {os.stat(temp_dir)}")
    try:
        venv_path = os.path.join(temp_dir, "venv")
        subprocess.run(["python3", "-m", "venv", venv_path], check=True)

        if requirements:
            pip_path = os.path.join(venv_path, "bin", "pip")
            subprocess.run([pip_path, "install", *requirements], check=True)

        code_file = os.path.join(temp_dir, "task.py")
        with open(code_file, "w") as f:
            f.write(code)

        python_path = os.path.join(venv_path, "bin", "python")
        result = subprocess.run(
            [python_path, code_file], capture_output=True, text=True
        )

        return {"stdout": result.stdout, "stderr": result.stderr}

    finally:
        shutil.rmtree(temp_dir)
