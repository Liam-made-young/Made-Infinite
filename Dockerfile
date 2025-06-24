# Use Node.js 18 with Python support
FROM node:18-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    ffmpeg \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install Python dependencies for Demucs
RUN pip3 install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip3 install demucs

# Pre-download Demucs models to avoid runtime downloads
RUN python3 -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')"

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p temp-processing stems-output

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"] 