# PyRemote

Remote security-first Python code execution with a simple frontend UI powered by Kubernetes

## SetUp

1. Celery task run as a k8s deployment
   - Takes a string of code to execute + list of dependencies to install
   - Sets up virtual env in temp directory
   - Installs dependencies
   - Executes code in virtual environment
   - Cleans up temp directory after execution
   - Store job output in AWS S3
   - Implement resource constraints + timeouts on Celery task

```
import os
import subprocess
import tempfile
import shutil
from celery import Celery

app = Celery('tasks', broker='redis://redis:6379/0')

@app.task
def execute_code(code: str, requirements: list):
    """
    Executes Python code with dynamically installed requirements.
    :param code: Python code to execute as a string.
    :param requirements: List of Python dependencies to install.
    """
    # Create a temporary directory for the task
    temp_dir = tempfile.mkdtemp()
    try:
        # Set up a virtual environment
        venv_path = os.path.join(temp_dir, 'venv')
        subprocess.run(['python3', '-m', 'venv', venv_path], check=True)

        # Install requirements into the virtual environment
        pip_path = os.path.join(venv_path, 'bin', 'pip')
        subprocess.run([pip_path, 'install', *requirements], check=True)

        # Write the code to a temporary file
        code_file = os.path.join(temp_dir, 'task.py')
        with open(code_file, 'w') as f:
            f.write(code)

        # Execute the code in the virtual environment
        python_path = os.path.join(venv_path, 'bin', 'python')
        result = subprocess.run([python_path, code_file], capture_output=True, text=True)

        # Return the output
        return {"stdout": result.stdout, "stderr": result.stderr}

    except subprocess.CalledProcessError as e:
        return {"error": f"An error occurred: {str(e)}"}

    finally:
        # Clean up the temporary directory
        shutil.rmtree(temp_dir)
```

2. FastAPI for submitting code

   - has endpoint for accepting code and requirements
   - processes code and requirements to ensure security (**TBD**) before submitting Celery task
   - uses k8s deployment
   - expose FastAPI with Ingress + Ingress Controller (NGINX)

3. Simple frontend in Next.js deployed with Vercel for simplicity

   - Code editor window
   - STDOUT + STDERR displays
   - Run button (sends request to FastAPI)
