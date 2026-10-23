FROM python:3.11-slim

# Prevent python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies, including compiler (GCC/G++), Java JDK, and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    openjdk-17-jdk-headless \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install high-performance scientific and data libraries for Python tasks
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    scikit-learn \
    scipy \
    requests

# Create a non-root user for security
RUN useradd -m sandboxuser
RUN chown -R sandboxuser:sandboxuser /app

# Run as non-root user
USER sandboxuser
