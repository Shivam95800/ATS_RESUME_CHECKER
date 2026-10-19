# Comprehensive Engineering & Technical Report: AI-Powered ATS Resume Intelligence Platform

**Author:** Shivam Soni  
**GitHub Repository:** [https://github.com/Shivam95800/ATS_RESUME_CHECKER](https://github.com/Shivam95800/ATS_RESUME_CHECKER)  
**Live Production Web App:** [https://ats-resume-checker-nine-lake.vercel.app](https://ats-resume-checker-nine-lake.vercel.app)  
**Live Backend API & Swagger Docs:** [https://ats-resume-checker-api-soji.onrender.com/docs](https://ats-resume-checker-api-soji.onrender.com/docs)  
**Date of Release:** October 2026  
**Document Version:** 1.0.0 (Production Release)

---

## Executive Summary

The **AI-Powered ATS Resume Scorer & Career Intelligence Platform** is an end-to-end, full-stack, enterprise-grade application engineered to bridge the gap between job candidates and modern Applicant Tracking Systems (ATS). Traditional keyword-stuffing techniques frequently fail against modern recruitment algorithms, which evaluate contextual relevance, semantic similarity, and substantiated proof of skills.

This project delivers a high-throughput, low-latency scoring engine that combines **Natural Language Processing (spaCy)**, **Dense Vector Embeddings (SentenceTransformers `all-MiniLM-L6-v2`)**, and **Large Language Models (Groq Llama 3.3 70B)** with a **Next.js 16 App Router** frontend, **Supabase PostgreSQL & Authentication**, and containerized **Docker** microservices deployed on Render and Vercel.

---

## 1. Problem Statement & Motivation

### 1.1 The Modern ATS Bottleneck
Over 90% of Fortune 500 companies and growing tech startups utilize automated screening tools (Workday, Taleo, Greenhouse, Lever). Candidates face critical friction points:
1. **Semantic Misalignment**: Candidates use synonyms or industry-standard phrasing that strict keyword matchers reject.
2. **Unsubstantiated Keyword Claims**: Candidates list skills in a "Skills" section without demonstrable evidence in project or experience sections.
3. **Format & Parsing Failures**: Multi-column layouts, non-standard fonts, graphics, and unreadable tables cause parsers to output garbled text, resulting in immediate auto-rejection.
4. **Lack of Actionable Feedback**: Job seekers receive generic rejection emails without guidance on what failed or how to improve.

### 1.2 The Engineering Objective
Develop a unified, scalable web platform that:
- Ingests PDF and DOCX resumes up to 5 MB.
- Provides immediate general ATS compliance scores or job-description-tailored semantic alignment.
- Validates claimed skills against contextual project evidence.
- Generates downloadable, audit-ready PDF reports.
- Maintains user privacy with cryptographic JWT verification and Row Level Security.
- Deploys within cost-effective cloud resource constraints (Render Free 512 MB RAM + Vercel Edge).

---

## 2. System Architecture & Engineering Design

```mermaid
graph TD
    subgraph Client Layer
        Browser["User Browser (Desktop / Mobile)"]
    end

    subgraph "Frontend — Vercel Edge Network"
        NextJS["Next.js 16.4.2 (App Router)"]
        UI["Tailwind CSS v4 + Lucide React"]
        Charts["Recharts Score Progression"]
        State["@supabase/ssr Auth & Session"]
        NextJS --> UI
        NextJS --> Charts
        NextJS --> State
    end

    subgraph "Auth & Storage — Supabase"
        Auth["Supabase Auth (JWT / Google OAuth)"]
        DB[("PostgreSQL (analyses table with RLS)")]
    end

    subgraph "Backend Microservice — Render Docker"
        Uvicorn["Uvicorn Async Worker (Port 8000)"]
        FastAPI["FastAPI 0.110+ Router"]
        Limiter["SlowAPI Rate Limiter (15 req/min)"]
        Security["JWT Cryptographic Verifier (HS256)"]

        subgraph "AI & NLP Pipeline"
            Parser["Document Parser (pdfplumber + python-docx)"]
            SpaCy["spaCy en_core_web_sm (POS & Lemmatization)"]
            Embedder["SentenceTransformers all-MiniLM-L6-v2 (CPU-optimized)"]
            GroqEngine["Groq API (Llama 3.3 70B) + Heuristic Fallback"]
            Scorer["Canonical ATS Scorer & Feedback Engine"]
            PDFGen["ReportLab & WeasyPrint PDF Engine"]
        end

        Uvicorn --> FastAPI
        FastAPI --> Limiter
        FastAPI --> Security
        Security --> Parser
        Parser --> SpaCy
        Parser --> Embedder
        Parser --> GroqEngine
        GroqEngine --> Scorer
        SpaCy --> Scorer
        Embedder --> Scorer
        Scorer --> PDFGen
    end

    Browser -->|HTTPS| NextJS
    Browser -->|OAuth / Password| Auth
    NextJS -->|Bearer JWT Token| FastAPI
    FastAPI -->|Async REST (Service Role)| DB
```

---

## 3. Core Algorithms & Mathematical Formulations

### 3.1 Semantic Similarity (Dense Vector Embeddings)
To compare resume content against job description expectations, the system converts arbitrary-length text segments into 384-dimensional dense vectors using the pre-trained `all-MiniLM-L6-v2` transformer model:

$$\vec{u} = \text{Embed}(\text{Resume}_{1:5000}), \quad \vec{v} = \text{Embed}(\text{JobDescription}_{1:5000})$$

The contextual cosine similarity is calculated as:

$$\text{Cosine Similarity} = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|_2 \|\vec{v}\|_2} = \frac{\sum_{i=1}^{n} u_i v_i}{\sqrt{\sum_{i=1}^n u_i^2} \sqrt{\sum_{i=1}^n v_i^2}}$$

The result is clamped to $[0.0, 1.0]$. If the neural embedder is unavailable, the system invokes a deterministic Jaccard token-overlap fallback:

$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

### 3.2 Canonical Component Scoring Matrix
The overall ATS score is evaluated on a 100-point scale partitioned across five canonical pillars:

| Pillar | Maximum Points | Weight in Composite | Evaluated Factors |
|---|---|---|---|
| **Formatting & Layout** | 20.0 pts | 15% | Single-column parsing, standard headings, bullet-point consistency, contact links |
| **Keywords & Terminology** | 25.0 pts | 24% | Density of role-specific technical skills, industry terms, domain vocabulary |
| **Content Quality & Impact** | 25.0 pts | 30% | Action verb intensity, quantifiable metrics (Google XYZ formula), bullet structure |
| **Skill Validation** | 15.0 pts | 16% | Verification that listed skills appear in project or work experience bullet points |
| **ATS Compatibility** | 15.0 pts | 15% | Date readability, length compliance, email/phone hygiene, privacy risk detection |
| **Total** | **100.0 pts** | **100%** | **Final Weighted Composite ATS Score** |

$$\text{Final Score} = 0.15 \times S_{\text{format}} + 0.24 \times S_{\text{kw}} + 0.30 \times S_{\text{content}} + 0.16 \times S_{\text{skills}} + 0.15 \times S_{\text{ats}}$$

### 3.3 Substantiated Skill Validation Algorithm
Unlike superficial keyword counters, the system isolates each declared technical skill $s \in S_{\text{declared}}$ and computes fuzzy substring matching ($\text{threshold} \ge 80$) and semantic proximity against candidate project blocks $P = \{p_1, p_2, \dots, p_k\}$:

$$\text{IsValidated}(s) = \exists p \in P \quad \text{s.t.} \quad \text{FuzzyRatio}(s, p) \ge 80 \quad \lor \quad \text{CosSim}(\vec{e}_s, \vec{e}_p) \ge 0.72$$

Skills lacking concrete project references are tagged as `unvalidated` and flagged on the user's report cards with targeted recommendations.

---

## 4. Technology Stack Deep Dive

### 4.1 Frontend Layer (`/web`)
- **Next.js 16.4.2 (App Router)**: Utilizing React Server Components (RSC) and client-side interactive widgets.
- **TypeScript 5.0**: Complete end-to-end type safety with OpenAPI generated schemas (`web/src/lib/api-types.ts`).
- **Tailwind CSS v4**: Dynamic dark/light mode with CSS variables and glassmorphism backdrops.
- **Recharts 3.10**: Responsive SVG line charts for historical score progression.
- **@supabase/ssr 0.12**: Secure cookie-based session hydration and automatic token refresh interceptor on HTTP 401.

### 4.2 Backend Layer (`/backend`)
- **FastAPI 0.110+**: Asynchronous ASGI framework with auto-generated OpenAPI / Swagger UI.
- **spaCy 3.8 (`en_core_web_sm`)**: High-speed tokenization, POS tagging, and lemmatization optimized for low memory.
- **SentenceTransformers (`all-MiniLM-L6-v2`)**: Semantic dense embedding model initialized with single-threaded PyTorch CPU backend.
- **Groq Llama 3.3 70B Versatile**: Sub-second LLM inference with structured JSON validation and heuristic fallback parser.
- **Dual PDF Engine**: Primary WeasyPrint HTML-to-PDF compiler with ReportLab pure-Python fallback.

### 4.3 Database & Cloud Infrastructure
- **Supabase PostgreSQL**: Relational analysis storage with Row Level Security (RLS) guaranteeing data tenancy.
- **Render Cloud (Docker)**: Multi-stage Linux container with pre-compiled C/Cairo libraries and pre-cached HuggingFace weights.
- **Vercel Edge Network**: Global edge distribution with security headers (CSP, HSTS, X-Frame-Options).

---

## 5. Overcoming Production Engineering Challenges

### Challenge 1: Render Free Tier Memory Limit (512 MB RAM OOM)
- **Problem**: Default PyTorch wheels bundle CUDA binaries (~800 MB), pushing container memory to >550 MB upon import and triggering OS Out-Of-Memory (OOM) kills.
- **Solution**: 
  1. Configured Dockerfile to install explicit CPU-only PyTorch:
     ```dockerfile
     RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
     ```
  2. Set memory allocator constraints: `MALLOC_ARENA_MAX=2`, `OMP_NUM_THREADS=1`, `TORCH_NUM_THREADS=1`.
  3. Purged legacy Streamlit, Pandas, Pyarrow, and Scipy libraries from `requirements.txt`, reducing container build footprint by over 300 MB.
  4. Switched from `en_core_web_md` (200 MB RAM) to `en_core_web_sm` (25 MB RAM).
- **Result**: Container baseline memory dropped from ~580 MB down to **~140 MB**, running comfortably within Render's 512 MB ceiling.

### Challenge 2: Port Binding Timeout on Cold Starts
- **Problem**: On Render Free tier (0.1 CPU), loading transformer models synchronously during FastAPI's `lifespan` took 70+ seconds, exceeding Render's port scan timeout.
- **Solution**: Decoupled server socket binding from model loading. Uvicorn binds port 8000 in **under 1 second**, while `SentenceTransformer` loads asynchronously in the background. Added `HEAD` route handlers to satisfy Render's health pings.
- **Result**: Port scan timeout eliminated; container transitions to **Live** instantly.

### Challenge 3: HuggingFace Cache Permissions
- **Problem**: Pre-downloaded weights in Docker build were saved under `/root/.cache`, inaccessible by the non-root `appuser`.
- **Solution**: Explicitly set `ENV HF_HOME=/app/cache/huggingface` and granted ownership via `chown -R appuser:appuser /app/cache`.
- **Result**: Model loads locally from disk in 0.05 seconds with zero network latency.

---

## 6. Verification & Test Metrics

### 6.1 Backend Test Suite (Pytest) — 19/19 Passed (100%)
```text
tests/test_phase1_sanity.py .......                                      [ 36%]
tests/test_phase2_endpoints.py ....                                      [ 57%]
tests/test_phase3_features.py ........                                   [100%]
======================= 19 passed, 1 warning in 11.31s ========================
```
- **Phase 1 Sanity**: Verifies text extraction from clean and malformed PDF/DOCX files, file size limits (5 MB), and unsupported extension rejections.
- **Phase 2 Endpoints**: Tests authentication gates, health check status codes, and rate limiting thresholds.
- **Phase 3 Features**: Tests general analysis scoring, job description comparison, skill validation, issue cards, and PDF report generation.

### 6.2 Frontend E2E Smoke Suite (Playwright Chromium) — 4/4 Passed (100%)
- `Landing page renders properly`: Confirms hero typography, CTA buttons, and feature cards.
- `Login page renders`: Validates dual-tab switching (Sign In / Sign Up) and Google OAuth integration.
- `Scorer rejects non-PDF/DOCX file upload`: Uploads invalid binary files and asserts explicit error banner display.
- `Resources page displays guidelines`: Confirms rendering of categorized action verbs and ATS Do's and Don'ts.

### 6.3 Live End-to-End Production Verification
- **Test File**: `Shivam_Soni_Resume_Updated.pdf` (6.9 KB)
- **User Account**: `shivam301102@gmail.com`
- **Computed Overall Score**: **64 / 100** (Moderate Match)
- **Keywords & Terminology**: **23.0 / 25 pts (92%)**
- **Formatting & Layout**: **12.0 / 20 pts (60%)**
- **Content & Impact**: **10.5 / 25 pts (42%)**
- **PDF Report**: Downloaded and verified with structured breakdown tables.

---

## 7. Security & Compliance Architecture

1. **Zero Raw HTML Injection**: Enforced strict policy against `dangerouslySetInnerHTML` across all React/Next.js components.
2. **Row Level Security (RLS)**: Enforced at the PostgreSQL kernel level in Supabase. Even with direct API access, users can only execute `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on records matching `auth.uid() = user_id`.
3. **Cryptographic JWT Validation**: Backend extracts `Authorization: Bearer <token>` and validates signature against `SUPABASE_JWT_SECRET` via `PyJWT` (HS256).
4. **Rate Limiting**: Protects against DoS and API exhaustion with SlowAPI limits (15 requests/minute per client).
5. **Security Headers (`vercel.json`)**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 8. Conclusion & Future Roadmap

The ATS Resume Intelligence platform demonstrates how modern NLP models, vector embeddings, and LLMs can be harmoniously integrated into a production-grade web application under tight cloud resource constraints. 

### Future Roadmap:
- **Multi-Resume Comparison**: Side-by-side comparative analysis of multiple resume revisions.
- **Automated AI Rewriting**: One-click bullet point enhancement utilizing the Google XYZ formula via Groq LLM streaming.
- **LinkedIn Profile Synchronizer**: Browser extension to scrape and score LinkedIn profiles against live job postings.

---

*Report authored by **Shivam Soni** — October 2026.*
