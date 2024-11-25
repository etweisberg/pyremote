# PyRemote

Remote security-first Python code execution with a simple frontend UI powered by Kubernetes

## k8s Startup

1. Build the images. From the `api` directory build the images using the following two commands

```
docker build . -f fastapi_app/Dockerfile -t etweisberg/fastapi-app:latest
docker build . -f celery_worker/Dockerfile -t etweisberg/celery-worker:latest
```

2. Create a kubernetes cluster

```
kind create cluster --name cis1912
```

3. Load images into cluster

```
kind load docker-image etweisberg/celery-worker:latest --name cis1912
kind load docker-image etweisberg/fastapi-app:latest --name cis1912
```

4. Create the namespace first

```
kubectl apply -f k8s/namespace.yaml
```

5. Apply all other k8s deployments and services

```
kubectl apply -f k8s/
```

6. Port-forward to test out the API locally

```
kubectl port-forward svc/fastapi-service 8000:8000 -n api-apps
```

## TODO

- [ ] Update Celery worker image
  - [ ] Non-root user
  - [ ] Read-only file system
  - [ ] Restrict Linux OS capabilities
- [ ] Update Celery deployment
  - [ ] Resource limits
  - [ ] Security context (for non-root user and read-only files)
  - [ ] Readiness / Liveness probes
  - [ ] HPA (horizontal pod autoscaler) + PDB (pod disruption budget)
- [ ] Add static code analysis to FastAPI
  - [ ] `bandit` and `safety` modules
- [ ] All of the frontend LOL 😅

## SetUp

1. Celery task run as a k8s deployment

   - Takes a string of code to execute + list of dependencies to install
   - Sets up virtual env in temp directory
   - Installs dependencies
   - Executes code in virtual environment
   - Cleans up temp directory after execution
   - Store job output in AWS S3
   - Implement resource constraints + timeouts on Celery task

2. FastAPI for submitting code

   - has endpoint for accepting code and requirements
   - processes code and requirements to ensure security (**TBD**) before submitting Celery task
   - uses k8s deployment
   - expose FastAPI with Ingress + Ingress Controller (NGINX)

3. Simple frontend in Next.js deployed with Vercel for simplicity

   - Code editor window
   - STDOUT + STDERR displays
   - Run button (sends request to FastAPI)
