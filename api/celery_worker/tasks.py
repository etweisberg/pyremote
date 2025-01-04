import redis
import sys
import io
import logging
import contextlib
import importlib
import subprocess
import os
from .main import celery_instance
from .main import CACHED_REQUIREMENTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

redis_client = redis.StrictRedis(host=os.getenv("REDIS_HOST"), port=6379, db=0)


class RedisStream(io.StringIO):
    def __init__(self, task_id, stream_name):
        super().__init__()
        self.task_id = task_id
        self.stream_name = stream_name

    def write(self, data):
        super().write(data)
        # Push updated data to Redis
        redis_client.hset(self.task_id, self.stream_name, self.getvalue())


@celery_instance.task(bind=True, time_limit=500)
def execute_code(self, code: str, requirements: list):
    task_id = self.request.id
    logger.info(
        f"Starting execution at time {celery_instance.now()} for task {task_id}"
    )
    redis_client.hmset(task_id, {"stdout": "", "stderr": "", "status": "IN PROGRESS"})

    try:
        if requirements:
            requirements_set = {req.lower() for req in requirements}
            to_install = requirements_set - CACHED_REQUIREMENTS

            if to_install:
                try:
                    logger.info(f"Installing requirements: {to_install}")
                    subprocess.run(
                        [sys.executable, "-m", "pip", "install", *to_install],
                        check=True,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                    )
                    importlib.invalidate_caches()
                    import site

                    importlib.reload(site)
                except subprocess.CalledProcessError as e:
                    redis_client.hmset(
                        task_id,
                        {
                            "stdout": "",
                            "stderr": f"Error installing dependencies: {e.stderr.decode()}",
                            "status": "FAILED",
                        },
                    )
                    return

        # Prepare custom streams
        stdout = RedisStream(task_id, "stdout")
        stderr = RedisStream(task_id, "stderr")

        # Execute the code and capture output
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec_locals = {}
            exec(code, exec_locals)

        # Mark task as successful
        redis_client.hmset(
            task_id,
            {
                "stdout": stdout.getvalue(),
                "stderr": stderr.getvalue(),
                "status": "SUCCESS",
            },
        )
        return {"stdout": stdout.getvalue(), "stderr": stderr.getvalue()}

    except Exception as e:
        logger.exception("Error during task execution")
        redis_client.hmset(
            task_id,
            {
                "stdout": stdout.getvalue() if "stdout" in locals() else "",
                "stderr": str(e),
                "status": "FAILED",
            },
        )
        return {
            "stdout": stdout.getvalue() if "stdout" in locals() else "",
            "stderr": str(e),
        }
