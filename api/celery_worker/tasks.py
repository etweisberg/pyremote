import io
import contextlib
import subprocess
import sys
import importlib
from .main import celery_instance


@celery_instance.task(time_limit=500)
def execute_code(code: str, requirements: list):
    try:
        # Install requirements directly using the current interpreter's pip
        if requirements:
            try:
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", *requirements],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                importlib.invalidate_caches()
                import site

                importlib.reload(site)
            except subprocess.CalledProcessError as e:
                return {
                    "stdout": "",
                    "stderr": f"Error installing dependencies: {e.stderr.decode()}",
                }

        # Prepare to capture stdout and stderr
        stdout = io.StringIO()
        stderr = io.StringIO()

        # Execute the code
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec_locals = {}
            exec(code, exec_locals)

        return {"stdout": stdout.getvalue(), "stderr": stderr.getvalue()}

    except Exception as e:
        # Handle exceptions during execution
        return {"stdout": "", "stderr": str(e)}
