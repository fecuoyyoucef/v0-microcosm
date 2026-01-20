FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Clone OpenDevin (now called OpenHands)
RUN git clone https://github.com/All-Hands-AI/OpenHands.git .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install additional dependencies for API
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    pydantic \
    python-multipart

# Copy custom API server
COPY api_server.py /app/
COPY config.toml /app/

# Expose API port
EXPOSE 8080

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV OPENDEVIN_API_HOST=0.0.0.0
ENV OPENDEVIN_API_PORT=8080

# Run API server
CMD ["python", "api_server.py"]
