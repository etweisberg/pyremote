import tempfile
import os
import logging
from fastapi.logger import logger as fastapi_logger
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from celery_worker.tasks import execute_code
from pydantic import BaseModel, Field
from bandit.core.manager import BanditManager
from bandit.core.config import BanditConfig
from bandit.core.node_visitor import BanditNodeVisitor
from bandit.core.test_set import BanditTestSet
from bandit.core.metrics import Metrics
import redis

"""
Logging configuration
"""
logger = logging.getLogger("uvicorn.error")

"""
FastAPI application
"""
app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://pyremote.com",
    "https://www.pyremote.com/",
    "https://pyremote.com/",
    "https://www.pyremote.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
Bandit configuration
"""
config = BanditConfig()
test_set = BanditTestSet(config)
metrics = Metrics()

"""
Redis
"""
redis_client = redis.StrictRedis(host=os.getenv("REDIS_HOST"), port=6379, db=0)


def check_code_security(code: str) -> list:
    """
    Analyze Python code for security issues using Bandit.
    :param code: Python code as a string
    :return: List of security issues
    """
    # Create a temporary file for the code
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as temp_file:
        temp_file.write(code)
        temp_file.flush()  # Ensure content is written to disk
        temp_filename = temp_file.name

    # Analyze the file with Bandit
    try:
        manager = BanditManager(config, metrics)
        manager.discover_files([temp_filename])
        manager.run_tests()

        # Collect results
        issues = []
        for issue in manager.results:
            issues.append(
                {
                    "filename": issue.fname,
                    "line_number": issue.lineno,
                    "issue_text": issue.text,
                    "severity": issue.severity,
                    "confidence": issue.confidence,
                    "test_name": issue.test,
                }
            )
        return issues
    except Exception as e:
        logger.error(f"Error during code analysis: {e}")
        return []
    finally:
        # Clean up the temporary file
        os.unlink(temp_filename)


"""
Routes
"""


@app.get("/")
async def root():
    """
    Root route - unused
    """
    return {"message": "Hello World"}


class CodeExecutionRequest(BaseModel):
    """
    Code execution request data model
    """

    code: str = Field(..., title="Code to execute")
    requirements: list = Field(default=None, title="Dependencies to install")


@app.post("/execute")
async def execute(request: CodeExecutionRequest):
    """
    Create code execution task
    """
    # Check code for security issues
    issues = check_code_security(request.code)

    if issues:
        logger.info(f"Security issues found: {issues}")
        raise HTTPException(
            status_code=400,
            detail={"message": "Security issues found", "issues": issues},
        )

    # Execute code if no issues found
    task = execute_code.delay(request.code, request.requirements)
    return {"task_id": task.id}


@app.get("/task_result/{task_id}")
async def task_result(task_id: str):
    """
    Get task result, including intermediate output
    """
    task_status = redis_client.hgetall(task_id)
    if not task_status:
        return {"status": "PENDING", "stdout": "", "stderr": ""}

    return {
        "status": task_status[b"status"].decode(),
        "stdout": task_status[b"stdout"].decode(),
        "stderr": task_status[b"stderr"].decode(),
    }
