FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy application code
COPY . .

# Copy cache_requirements.txt
COPY fastapi_app/cache_requirements.txt /app/cache_requirements.txt

# Copy application dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose application port
EXPOSE 8000

# Run the FastAPI app with Uvicorn
CMD ["uvicorn", "fastapi_app.main:app", "--host", "0.0.0.0", "--port", "8000"]
