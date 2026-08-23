# EduSmart Face Service — Flask + DeepFace (Facenet 512-D)
# Heavy (~2GB): Only deploy if you need live face. For free-tier, keep OFF and use QR.
FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV / TensorFlow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY face-service/requirements.txt ./requirements.txt
# Use CPU-only TF; pin to avoid OOM on Render free
RUN pip install --no-cache-dir -r requirements.txt

COPY face-service ./face-service

ENV FLASK_PORT=5001
ENV PYTHONUNBUFFERED=1

EXPOSE 5001

# Preload Facenet model at startup (app_deepface.py does this)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:5001/health').status==200 else 1)"

CMD ["python", "face-service/app_deepface.py"]
