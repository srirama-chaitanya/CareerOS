FROM python:3.12-slim

WORKDIR /app

# Install system deps for bcrypt / PDF parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache optimization)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create a writable data directory for SQLite.
# In production: mount a persistent disk to /app/data and set DB_PATH=/app/data/checkpoints.db
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Healthcheck — Render/Railway will ping this to confirm the service is up
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
