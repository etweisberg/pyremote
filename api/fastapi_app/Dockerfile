FROM python:3.13-slim

WORKDIR /app

COPY . .

# Copy cache_requirements.txt for cached library
COPY fastapi_app/cache_requirements.txt /app/cache_requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

# Run the FastAPI app with Uvicorn
CMD ["uvicorn", "fastapi_app.main:app", "--host", "0.0.0.0", "--port", "8000"]
