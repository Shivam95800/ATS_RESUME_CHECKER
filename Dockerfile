# ==============================================================================
# Production Dockerfile for ATS Resume Analyzer Backend
# Compatible with Render, Railway, Fly.io, or any container platform
# ==============================================================================

FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
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

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download NLP models during image build so startup is fast on Render
RUN python -m spacy download en_core_web_md \
    && python -m spacy download en_core_web_sm \
    && python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy backend source code
COPY backend/ ./backend/

# Create a non-privileged user and switch to it
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app /home/appuser
USER appuser

EXPOSE 8000

# Render dynamically sets $PORT at runtime
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
