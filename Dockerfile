# ==============================================================================
# Production Dockerfile for ATS Resume Analyzer Backend
# Compatible with Render, Railway, Fly.io, or any container platform
# ==============================================================================

FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    MALLOC_ARENA_MAX=2 \
    OMP_NUM_THREADS=1 \
    TORCH_NUM_THREADS=1 \
    PORT=8000

WORKDIR /app

# Install native system libraries required for:
# - WeasyPrint (cairo, pango, gdk-pixbuf, libffi, fonts)
# - python-magic (libmagic1)
# - spaCy / NLP dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libmagic1 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (much smaller footprint and ~150MB RAM usage instead of 800MB CUDA wheel)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download lightweight NLP model and embeddings during image build
RUN python -m spacy download en_core_web_sm \
    && python -c "import torch; torch.set_num_threads(1); from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2', device='cpu')"

# Copy backend source code
COPY backend/ ./backend/

# Create a non-privileged user and switch to it
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app /home/appuser
USER appuser

EXPOSE 8000

# Render dynamically sets $PORT at runtime
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
