# OpenSecureConf Web GUI - Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY gui-requirements.txt .
RUN pip install --no-cache-dir -r gui-requirements.txt

# Copy application
COPY gui.py .

# Expose Streamlit port
EXPOSE 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8501/_stcore/health || exit 1

# Run the application
CMD ["streamlit", "run", "gui.py", "--server.port=8501", "--server.address=0.0.0.0"]
