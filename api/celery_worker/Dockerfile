# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Create a non-root user
RUN useradd -ms /bin/bash celery_user

# Set the working directory
WORKDIR /app

# Define pip cache directory
ENV PIP_CACHE_DIR=/tmp/pip_cache

# Create the pip cache directory and set ownership
RUN mkdir -p /tmp/pip_cache && chown -R celery_user:celery_user /tmp/pip_cache

# Pre-install common dependencies from cache_requirements.txt
COPY celery_worker/cache_requirements.txt /app/cache_requirements.txt
RUN pip install -r /app/cache_requirements.txt

# Copy application files
COPY . /app

# Install application-specific dependencies
RUN pip install -r requirements.txt

# Change ownership of the application directory
RUN chown -R celery_user:celery_user /app

# Set the user to non-root
USER celery_user

# Define environment variables
ENV CELERY_BROKER_URL=redis://redis:6379/0
ENV CELERY_RESULT_BACKEND=redis://redis:6379/0

# Start the Celery worker
CMD ["celery", "-A", "celery_worker.main:celery_instance", "worker", "--loglevel=info"]
