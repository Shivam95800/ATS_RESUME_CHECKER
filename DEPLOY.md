# Production Deployment Guide: ATS Resume Checker

This guide outlines the complete end-to-end deployment procedure for the ATS Resume Checker application:
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL with Row-Level Security + Auth)
- **Backend API**: [Render](https://render.com) (FastAPI Docker container with spaCy & SentenceTransformers)
- **Frontend App**: [Vercel](https://vercel.com) (Next.js 16 App Router with Tailwind CSS & TypeScript)
- **LLM Engine**: [Groq](https://groq.com) (Llama 3.3 70B Versatile with heuristic fallback)

---

## Architecture Diagram

```
+-------------------------------------------------------------+
|                      User Browser                           |
+-------------------------------------------------------------+
         |                                           |
         | Next.js App (:3000 or Vercel)             | Supabase Auth
         v                                           v
+-----------------------+                 +---------------------+
|    Vercel Frontend    |                 |   Supabase Auth     |
|       (/web)          |                 |  (JWT / OAuth)      |
+-----------------------+                 +---------------------+
         |
         | Bearer <access_token>
         v
+-------------------------------------------------------------+
|               Render Docker Backend (FastAPI)               |
|                                                             |
|  - JWT Verification (SUPABASE_JWT_SECRET)                   |
|  - NLP Pipeline (spaCy + SentenceTransformers)              |
|  - Groq LLM (with heuristic fallbacks)                      |
|  - PDF Generation (WeasyPrint / ReportLab fallback)         |
+-------------------------------------------------------------+
         |
         | Service Role Key (REST)
         v
+-------------------------------------------------------------+
|                  Supabase PostgreSQL DB                     |
|                 (public.analyses table)                     |
+-------------------------------------------------------------+
```

---

## Step 1: Supabase Configuration

### 1.1 Create Supabase Project
1. Go to [database.new](https://database.new) and create a new project.
2. Under **Project Settings -> API**, copy down:
   - **Project URL** (`https://<project-id>.supabase.co`)
   - **anon (public)** key
   - **service_role (secret)** key
   - **JWT Secret** (under API Settings -> JWT Settings)

### 1.2 Initialize Database Schema & RLS
1. In the Supabase dashboard, open the **SQL Editor**.
2. Run the SQL script from [`supabase/schema.sql`](supabase/schema.sql):
```sql
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    filename TEXT,
    job_title TEXT,
    ats_score FLOAT,
    keyword_match FLOAT,
    missing_keywords JSONB DEFAULT '[]'::jsonb,
    analysis_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own analyses"
    ON public.analyses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
    ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
    ON public.analyses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
    ON public.analyses FOR DELETE USING (auth.uid() = user_id);
```

### 1.3 Configure Authentication & Redirects
1. Go to **Authentication -> URL Configuration**.
2. Set **Site URL**:
   - Production: `https://<your-app>.vercel.app`
   - Local: `http://localhost:3000`
3. Add **Redirect URLs**:
   - `https://<your-app>.vercel.app/auth/callback`
   - `https://*-<your-team>.vercel.app/auth/callback` (for Vercel preview branch builds)
   - `http://localhost:3000/auth/callback`
4. (Optional) In **Authentication -> Providers -> Google**:
   - Provide your Google Cloud OAuth Client ID and Secret if enabling Google Sign In.

---

## Step 2: Render Backend Deployment (Docker)

The backend runs as a containerized FastAPI application defined in [`Dockerfile`](Dockerfile) and configured via [`render.yaml`](render.yaml).

### Option A: Deploy via Render Blueprint (Recommended)
1. Push your repository to GitHub.
2. In the Render Dashboard, click **New + -> Blueprint**.
3. Select your repository. Render will automatically read `render.yaml`.
4. Fill in the sensitive environment variables when prompted.

### Option B: Deploy via Manual Web Service
1. In the Render Dashboard, click **New + -> Web Service**.
2. Choose **Build and deploy from a Git repository**.
3. Set:
   - **Language**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Instance Type**: `Starter` (0.5 CPU, 512 MB or 1 GB RAM recommended for spaCy and SentenceTransformers)
   - **Health Check Path**: `/api/v1/health`
4. Add the following **Environment Variables**:

| Variable Name | Required | Example / Description |
|---|---|---|
| `PORT` | Yes | `8000` |
| `GROQ_API_KEY` | Optional* | `gsk_...` (*heuristic fallback active if omitted) |
| `SUPABASE_URL` | Yes | `https://<project-id>.supabase.co` |
| `SUPABASE_KEY` | Yes | Supabase `service_role` secret key |
| `SUPABASE_JWT_SECRET`| Yes | Supabase JWT secret |
| `ALLOWED_ORIGINS` | Yes | `https://<your-app>.vercel.app,http://localhost:3000` |
| `ALLOW_VERCEL_PREVIEWS` | Yes | `true` (enables CORS on `https://*.vercel.app`) |
| `SENTENCE_TRANSFORMER_MODEL` | No | `all-MiniLM-L6-v2` |
| `SPACY_MODEL` | No | `en_core_web_md` |

5. Click **Create Web Service**. Once deployed, copy your backend URL (e.g. `https://ats-resume-checker-api.onrender.com`).

---

## Step 3: Vercel Frontend Deployment (Next.js)

The Next.js 16 frontend is located in [`/web`](web).

1. In the [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
2. In the configuration screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click "Edit" and choose `web`
3. Add the following **Environment Variables**:

| Variable Name | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-id>.supabase.co` | Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhb...` | Public anonymous key |
| `NEXT_PUBLIC_BACKEND_URL` | `https://ats-resume-checker-api.onrender.com` | Live Render backend URL |

4. Click **Deploy**.
5. After deployment, update the `ALLOWED_ORIGINS` variable in your Render backend with your assigned Vercel domain if not already included.

---

## Step 4: Post-Deployment Smoke Test Checklist

Execute these checks to verify the production deployment:

1. **Backend Health Check**:
   - Open `https://<your-backend>.onrender.com/api/v1/health` in your browser.
   - Verify it returns HTTP 200:
     ```json
     {"status": "healthy", "nlp_loaded": true, "embedder_loaded": true}
     ```
2. **CORS Check**:
   - Send an `OPTIONS` preflight request from your Vercel domain to ensure `access-control-allow-origin` matches.
3. **Frontend Landing Page**:
   - Visit `https://<your-app>.vercel.app`. Verify styles, typography, and CTA buttons load properly.
4. **Authentication Flow**:
   - Navigate to `/login`.
   - Sign up with a test email or use Google OAuth.
   - Verify session creation and redirect to `/scorer`.
5. **Resume Scoring & Skill Validation**:
   - Upload a test resume (`.pdf` or `.docx`).
   - Run the scan.
   - Verify the score gauge, keyword breakdown, issue cards, and validated skill proof table appear.
6. **PDF Report Export**:
   - Click **Download PDF Report**.
   - Verify PDF downloads correctly and contains formatted score cards.
7. **History & Analytics**:
   - Navigate to `/history`.
   - Verify the newly analyzed resume appears in the progression chart and history table.
   - Click to inspect details and test deletion.

---

## Local Development Quickstart

To run both backend and frontend locally:

### 1. Backend
```bash
# Set up Python virtual environment
python -m venv venv
venv\Scripts\activate       # On Windows
source venv/bin/activate    # On Linux/macOS

# Install dependencies and spaCy model
pip install -r requirements.txt
python -m spacy download en_core_web_md

# Configure environment
copy .env.example .env      # Edit .env with your credentials

# Start FastAPI server on port 8000
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend
```bash
cd web

# Configure environment
copy .env.example .env.local  # Set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Install dependencies
npm install

# Run dev server on port 3000
npm run dev

# Run quality checks & E2E smoke tests
npm run lint
npx tsc --noEmit
npm run test:e2e
```
