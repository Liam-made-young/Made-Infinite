# Optimized Dockerfile for Google Cloud Run with Demucs
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy Python requirements and install first (for better caching)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Pre-download Demucs models during build (not runtime)
RUN python3 -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')" || echo "htdemucs download skipped"
RUN python3 -c "import demucs.pretrained; demucs.pretrained.get_model('mdx_extra')" || echo "mdx_extra download skipped"

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p temp-processing stems-output

# Set environment variables
ENV PYTHONPATH=/usr/local/lib/python3.10/site-packages
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Use exec form to ensure proper signal handling
CMD ["node", "server.js"] 