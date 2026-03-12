# inference-service/Dockerfile

# Use slim Python 3.11 base — smaller than full image
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# ── System dependencies for OpenCV headless ──────────────────────────────────
# libgl1 and libglib2.0 are required even for headless OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
COPY main.py preprocess.py predict.py ./

# ── Model files ───────────────────────────────────────────────────────────────
COPY models/ ./models/

# ── Gunicorn config ───────────────────────────────────────────────────────────
# workers=1 because TFLite interpreter is not thread-safe across workers
# threads=8 handles concurrent requests within one worker
# timeout=120 for slow cold starts on first request
ENV PORT=8080
CMD exec gunicorn \
    --workers=1 \
    --threads=8 \
    --timeout=120 \
    --bind=0.0.0.0:$PORT \
    --access-logfile=- \
    --error-logfile=- \
    main:app
