from fastapi import FastAPI
from celery_worker.tasks import execute_code
from pydantic import BaseModel


app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}


class CodeExecutionRequest(BaseModel):
    code: str
    requirements: list


@app.post("/execute")
async def execute(request: CodeExecutionRequest):
    task = execute_code.delay(request.code, request.requirements)
    return {"task_id": task.id}


@app.get("/task_result/{task_id}")
async def task_result(task_id: str):
    task = execute_code.AsyncResult(task_id)
    if task.ready():
        return task.get()
    return {"status": task.status}
