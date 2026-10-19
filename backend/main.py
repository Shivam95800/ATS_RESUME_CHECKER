import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import os
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.utils.limiter import limiter
from backend.core.config import (
    ALLOWED_ORIGINS, 
    ALLOW_ORIGIN_REGEX,
    APP_DESCRIPTION, 
    APP_TITLE, 
    APP_VERSION, 
    MAX_FILE_SIZE_BYTES,
    SPACY_MODEL_PRIMARY, 
    SPACY_MODEL_SECONDARY,
    SENTENCE_TRANSFORMER_MODEL,
)
from backend.api.routes import router

logger = logging.getLogger('ats_resume_scorer')

REQUIRED_ENV_VARS = [
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "SUPABASE_JWT_SECRET",
]
OPTIONAL_ENV_VARS = [
    "SUPABASE_ANON_KEY",
    "ALLOWED_ORIGINS",
    "SENTENCE_TRANSFORMER_MODEL",
    "SPACY_MODEL",
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Starting ATS Resume Analyzer API...')

    # Startup check: verify required env vars without printing values
    missing_required = [v for v in REQUIRED_ENV_VARS if not os.getenv(v)]
    missing_optional = [v for v in OPTIONAL_ENV_VARS if not os.getenv(v)]
    if missing_required:
        logger.warning("Startup check - Missing REQUIRED environment variables: %s", ", ".join(missing_required))
    else:
        logger.info("Startup check - All required environment variables are set.")
    if missing_optional:
        logger.info("Startup check - Missing optional environment variables (defaults active): %s", ", ".join(missing_optional))

    import gc
    import spacy
    logger.info(f'Loading spaCy NLP model: {SPACY_MODEL_PRIMARY}')
    try:
        app.state.nlp = spacy.load(SPACY_MODEL_PRIMARY)
        logger.info(f'Loaded {SPACY_MODEL_PRIMARY}')
    except OSError:
        logger.warning(f'{SPACY_MODEL_PRIMARY} not found — falling back to {SPACY_MODEL_SECONDARY}')
        app.state.nlp = spacy.load(SPACY_MODEL_SECONDARY)
        logger.info(f'Loaded {SPACY_MODEL_SECONDARY} (fallback)')

    gc.collect()

    try:
        import torch
        torch.set_num_threads(1)
        logger.info(f'Loading SentenceTransformer: {SENTENCE_TRANSFORMER_MODEL}')
        from sentence_transformers import SentenceTransformer
        app.state.embedder = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
        logger.info(f'Loaded {SENTENCE_TRANSFORMER_MODEL}')
    except Exception as exc:
        logger.warning(f"SentenceTransformer preload deferred or failed: {exc}")
        app.state.embedder = None

    gc.collect()
    logger.info('API is ready to serve requests.')

    yield

    logger.info('Shutting down ATS Resume Analyzer API...')

app = FastAPI(
    title=APP_TITLE, 
    description=APP_DESCRIPTION, 
    version=APP_VERSION, 
    lifespan=lifespan,
    docs_url='/docs',
    redoc_url='/redoc'
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOW_ORIGIN_REGEX,
    allow_credentials=True, 
    allow_methods     = ['*'],
    allow_headers     = ['*'],
)

@app.middleware("http")
async def limit_request_body_size(request: Request, call_next):
    # Allow 1 MB margin over max file size for multipart form boundaries and fields
    max_allowed = MAX_FILE_SIZE_BYTES + (1024 * 1024)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > max_allowed:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request payload exceeds the maximum allowed size of {max_allowed // (1024 * 1024)} MB."}
                )
        except ValueError:
            pass
    return await call_next(request)

app.include_router(router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

@app.get('/')
async def root():
    return {
        'name':      'ATS Resume Analyzer API',
        'version':   '2.0.0',
        'endpoints': {
            'POST   /api/v1/analyze-resume': 'Analyze a resume',
            'GET    /api/v1/history':        'Get user history',
            'DELETE /api/v1/history/:id':    'Delete a history entry',
            'GET    /api/v1/health':         'Health check',
            'POST   /api/v1/generate-pdf':   'Generate PDF report from data',
        },
    }

if __name__=='__main__':
    import uvicorn
    uvicorn.run(
        'backend.main:app',
        host    = '0.0.0.0',
        port    = 8000,
        reload  = True,    # Auto-restart on code changes (dev only)
    )
