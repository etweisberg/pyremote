import io
import contextlib
import logging
import subprocess
import sys
import importlib
from .main import celery_instance

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


@celery_instance.task(time_limit=500)
def execute_code(code: str, requirements: list):
    logger.info(f"Starting execution at time {celery_instance.now()}")
    try:
        # Install requirements directly using the current interpreter's pip
        if requirements:
            logger.info(
                f"Installing requirements: {requirements} at time {celery_instance.now()}"
            )
            try:
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", *requirements],
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                logger.info(
                    f"Subprocess completed successfully at time {celery_instance.now()}"
                )
                importlib.invalidate_caches()
                import site

                importlib.reload(site)
                logger.info(f"Reloaded site module at time {celery_instance.now()}")
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
            logger.info(f"Executing code at time {celery_instance.now()}")
            exec(code, exec_locals)

        logger.info(f"Execution completed at time {celery_instance.now()}")
        return {"stdout": stdout.getvalue(), "stderr": stderr.getvalue()}

    except Exception as e:
        # Handle exceptions during execution
        return {"stdout": "", "stderr": str(e)}
