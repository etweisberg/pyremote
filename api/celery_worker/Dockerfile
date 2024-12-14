# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Create a non-root user
RUN useradd -ms /bin/bash celery_user

# Set the working directory
WORKDIR /app

# Define pip cache directory
ENV PIP_CACHE_DIR=/tmp/pip_cache

# Install common dependencies
# Replace `numpy` and `pandas` with any other commonly used packages
RUN pip install --no-cache-dir numpy pandas

# Copy application files
COPY . /app

# Install application-specific dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Change ownership of the app directory
RUN chown -R celery_user:celery_user /app /tmp/pip_cache

# Set the user to non-root
USER celery_user

# Define environment variables
ENV CELERY_BROKER_URL=redis://redis:6379/0
ENV CELERY_RESULT_BACKEND=redis://redis:6379/0

# Start the Celery worker
CMD ["celery", "-A", "celery_worker.main:celery_instance", "worker", "--loglevel=info"]
