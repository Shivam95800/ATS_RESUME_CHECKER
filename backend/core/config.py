import os
from pathlib import Path

# Load .env from the project root (two levels up from this file) explicitly —
# load_dotenv() with no args relies on caller-frame inspection that can fail
# silently under uvicorn reload, leaving env vars unset.
try:
    from dotenv import load_dotenv
    _ENV_PATH = Path(__file__).resolve().parents[2] / '.env'
    load_dotenv(_ENV_PATH)
except ImportError:
    pass

#api metadata
APP_TITLE='ATS RESUME ANALYZER API'
APP_VERSION='1.0.0'
APP_DESCRIPTION='analyse resumes against job description using nlp + ml'

_raw_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000')
ALLOWED_ORIGINS = [
    origin.strip().rstrip('/')
    for origin in _raw_origins.split(',')
    if origin.strip()
]

# Support allow_origin_regex for Vercel preview URLs (https://.*\.vercel\.app) via an env flag
ALLOW_VERCEL_PREVIEWS = os.getenv('ALLOW_VERCEL_PREVIEWS', 'true').lower() in ('true', '1', 'yes')
ALLOW_ORIGIN_REGEX = r'https://.*\.vercel\.app' if ALLOW_VERCEL_PREVIEWS else None

#file 
MAX_FILE_SIZE_MB=5
MAX_FILE_SIZE_BYTES=MAX_FILE_SIZE_MB*1024*1024

#Supported MIME types and their short names
SUPPORTED_MIME_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

SUPPORTED_EXTENSIONS = {'.pdf', '.docx'}

SPACY_MODEL_PRIMARY = os.getenv("SPACY_MODEL", "en_core_web_sm")
SPACY_MODEL_SECONDARY = "en_core_web_sm"
SENTENCE_TRANSFORMER_MODEL = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")

# Canonical score component maxima (single source of truth for backend & frontend)
COMPONENT_MAXIMA = {
    "formatting": 20.0,
    "keywords": 25.0,
    "content": 25.0,
    "skill_validation": 15.0,
    "ats_compatibility": 15.0,
}
SCORE_WEIGHTS = COMPONENT_MAXIMA

# Blend weights for calculating the final overall ATS score (sum = 1.0)
BLEND_WEIGHTS = {
    "skills_and_keywords": 0.40,  # 60% keywords + 40% skill validation
    "content": 0.30,
    "formatting": 0.15,
    "ats_compatibility": 0.15,
}

SUPABASE_URL       = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY       = os.getenv('SUPABASE_KEY', '')          # service_role — DB writes (bypasses RLS)
SUPABASE_ANON_KEY  = os.getenv('SUPABASE_ANON_KEY', '')     # public anon — frontend auth calls
SUPABASE_JWT_SECRET= os.getenv('SUPABASE_JWT_SECRET', '')   # used by backend to verify access tokens
GROQ_API_KEY       = os.getenv('GROQ_API_KEY', '')


