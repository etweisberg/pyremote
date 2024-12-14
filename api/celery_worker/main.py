from celery import Celery
import os

broker_url = os.getenv("CELERY_BROKER_URL")
backend_url = os.getenv("CELERY_RESULT_BACKEND")

try:
    CACHE_REQUIREMENTS_PATH = "/app/cache_requirements.txt"
    with open(CACHE_REQUIREMENTS_PATH) as f:
        CACHED_REQUIREMENTS = set(line.strip().lower() for line in f if line.strip())
    celery_instance = Celery(
        "tasks",
        broker=broker_url,
        backend=backend_url,
    )
    # Test connection
    with celery_instance.connection() as conn:
        conn.ensure_connection()

    from . import tasks
except Exception as e:
    print(f"Failed to connect to Redis: {e}")
    raise
