# OpenSecureConf Server - Production Dockerfile
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1     PYTHONDONTWRITEBYTECODE=1     PIP_NO_CACHE_DIR=1     PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update &&     apt-get install -y --no-install-recommends     gcc     && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api.py ./
COPY config_manager.py ./
COPY cluster_manager.py ./
COPY async_logger.py ./

# Create directory for data persistence
RUN mkdir -p /app/data

# Expose port (configurable via environment variable)
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3     CMD python -c "import requests; requests.get('http://localhost:9000/', timeout=5)"

# Run the application with uvicorn
CMD ["sh", "-c", "uvicorn api:app --host ${OSC_HOST:-0.0.0.0} --port ${OSC_HOST_PORT:-9000} --workers ${OSC_WORKERS:-4}"]
