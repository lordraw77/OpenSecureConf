# OpenSecureConf Server - Production Dockerfile (Optimized)
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH


# Copy application code with correct ownership
COPY main.py config_manager.py cluster_manager.py async_logger.py ./
COPY core ./core/
COPY routes ./routes/
COPY utils ./utils/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PROMETHEUS_MULTIPROC_DIR=/app/prometheus_multiproc

# Switch to non-root user


# Expose port
EXPOSE 9000

# Improved healthcheck using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9000/ || exit 1

# Run with uvicorn
CMD ["sh", "-c", "uvicorn main:app --host ${OSC_HOST:-0.0.0.0} --port ${OSC_HOST_PORT:-9000} --workers ${OSC_WORKERS:-4}"]
