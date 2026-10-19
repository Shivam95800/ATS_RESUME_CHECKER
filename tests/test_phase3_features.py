import io
import os
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.api.auth import get_current_user
from backend.services.feedback_engine import analyze_issues
from backend.services.groq_parser import (
    parse_resume,
    parse_job_description,
    _fallback_parse_resume,
    _fallback_parse_jd,
)
from backend.services.report_generator import generate_html_reports
from backend.services.pdf_export import generate_combined_pdf
from backend.models.schemas import AnalysisResponse, ComponentScores

# Mock auth dependency for unit/integration tests
app.dependency_overrides[get_current_user] = lambda: "test-user-id"
client = TestClient(app)

SAMPLE_RESUME_TEXT = """
Jane Doe
jane.doe@example.com | (555) 123-4567 | linkedin.com/in/janedoe | github.com/janedoe
San Francisco, CA

PROFESSIONAL SUMMARY
Experienced Full-Stack Software Engineer with 4+ years of expertise in Python, FastAPI, React, and cloud architecture.

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, SQL
Frameworks: FastAPI, Django, React, Node.js
Tools: Docker, Kubernetes, AWS, Git, PostgreSQL

WORK EXPERIENCE
Senior Backend Engineer — TechCorp (2022 - Present)
• Developed scalable REST APIs using FastAPI and PostgreSQL handling 50,000 daily requests.
• Automated CI/CD deployment pipelines using Docker and GitHub Actions, cutting build times by 40%.
• Engineered real-time data sync with Redis caching, reducing query latency by 60%.

PROJECTS
Cloud Analytics Platform
• Built an end-to-end monitoring dashboard using React, FastAPI, and AWS.
• Implemented authentication with JWT and rate limiting with Redis.

EDUCATION
B.Tech in Computer Science — California State University (2018 - 2022)
"""

SAMPLE_JD_TEXT = """
Job Title: Senior Backend Engineer
We are seeking a Senior Backend Engineer to join our team.

Requirements:
- Strong experience in Python, FastAPI, and Docker
- Deep understanding of Go, Kubernetes, and Microservices
- Experience with PostgreSQL and Redis

Preferred:
- Experience with GraphQL and AWS
"""

def test_feedback_engine_jd_missing_keywords():
    jd_comparison = {
        "match_percentage": 45.0,
        "semantic_similarity": 0.65,
        "matched_keywords": ["python", "fastapi", "docker"],
        "missing_keywords": ["go", "kubernetes", "microservices", "graphql"],
        "skills_gap": ["go", "kubernetes"],
    }
    issues = analyze_issues(
        resume_text=SAMPLE_RESUME_TEXT,
        parsed_resume={"skills": ["Python", "FastAPI"], "experience": [{"description": "Dev"}], "projects": []},
        skills=["Python", "FastAPI"],
        projects=[],
        action_verbs=["Developed"],
        skill_validation={"validated_skills": ["Python"], "unvalidated_skills": []},
        scores={"formatting_score": 18.0},
        jd_comparison=jd_comparison,
    )
    titles = [i.issue_title for i in issues]
    assert "Missing Key Job Description Terms" in titles
    assert "Skills Gap Against Target Role" in titles

    jd_issue = next(i for i in issues if i.issue_title == "Missing Key Job Description Terms")
    assert jd_issue.severity_level == "High"
    assert "go" in jd_issue.where_it_appears.lower()
    assert len(jd_issue.action_items) > 0

def test_feedback_engine_grammar_and_privacy_issues():
    grammar_results = {
        "total_errors": 2,
        "critical_errors": ["Repeated word detected: 'the the'"],
        "moderate_errors": [],
        "minor_errors": ["1 line(s) contain inconsistent double spaces"],
        "penalty_applied": 2.5,
        "_component_status": "available",
    }
    location_results = {
        "location_found": True,
        "detected_locations": [{"text": "123 Main St", "type": "address"}, {"text": "94105", "type": "zip"}],
        "privacy_risk": "high",
        "recommendations": ["Remove full street addresses"],
        "penalty_applied": 5.0,
        "_component_status": "available",
    }
    issues = analyze_issues(
        resume_text=SAMPLE_RESUME_TEXT,
        parsed_resume={"skills": ["Python"], "experience": [{"description": "Dev"}], "projects": []},
        skills=["Python"],
        projects=[],
        action_verbs=["Developed"],
        skill_validation={},
        scores={},
        grammar_results=grammar_results,
        location_results=location_results,
    )
    titles = [i.issue_title for i in issues]
    assert "Grammar & Text Quality Errors" in titles
    assert "Excessive Location & Privacy Risk" in titles

def test_groq_fallback_parser_resume():
    res = _fallback_parse_resume(SAMPLE_RESUME_TEXT)
    assert res["name"] == "Jane Doe"
    assert res["email"] == "jane.doe@example.com"
    assert "Python" in res["skills"]
    assert "FastAPI" in res["skills"]
    assert len(res["experience"]) >= 1
    assert len(res["education"]) >= 1
    assert any("Developed" in v or "Automated" in v or "Engineered" in v for v in res["action_verbs"])

def test_groq_fallback_parser_jd():
    res = _fallback_parse_jd(SAMPLE_JD_TEXT)
    assert "Senior Backend Engineer" in res["job_title"]
    assert "Python" in res["required_skills"]
    assert "FastAPI" in res["required_skills"]
    assert "GraphQL" in res["preferred_skills"] or "GraphQL" in res["keywords"]

def test_parse_resume_offline_fallback(monkeypatch):
    # Ensure no Groq key is present to test graceful fallback
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    # Clear client singleton
    import backend.services.groq_parser as gp
    gp._client = None

    parsed = parse_resume(SAMPLE_RESUME_TEXT)
    assert isinstance(parsed, dict)
    assert "skills" in parsed
    assert "email" in parsed
    assert parsed["email"] == "jane.doe@example.com"

def test_pdf_export_and_report_generator():
    html_docs = generate_html_reports({
        "ats_score": 88.0,
        "job_title": "Full-Stack Engineer",
        "component_scores": {
            "formatting": 18.0,
            "keywords": 22.0,
            "content": 21.0,
            "skill_validation": 14.0,
            "ats_compatibility": 13.0,
        },
        "strengths": ["Well-structured experience section", "Strong skill validation"],
        "detailed_feedback": [],
    })
    assert "summary" in html_docs
    assert "skill_report" in html_docs

    pdf_bytes = generate_combined_pdf(html_docs)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF-")

def test_generate_pdf_endpoint():
    payload = {
        "ats_score": 85.0,
        "component_scores": {
            "formatting": 18.0,
            "keywords": 20.0,
            "content": 22.0,
            "skill_validation": 12.0,
            "ats_compatibility": 13.0,
        },
        "job_title": "Software Engineer",
        "keyword_match": 80.0,
        "missing_keywords": ["Kafka"],
        "matched_keywords": ["Python", "FastAPI"],
        "suggestions": ["Add numbers to bullet points"],
        "strengths": ["Clear skills section"],
        "critical_issues": [],
        "skills": ["Python", "Docker"],
        "detailed_feedback": [],
    }
    res = client.post("/api/v1/generate-pdf", json=payload)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 500
    assert res.content.startswith(b"%PDF-")

def test_analyze_resume_endpoint_full_pipeline():
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    doc.build([
        Paragraph(
            "Jane Doe\njane.doe@example.com\nSenior Python Developer proficient in FastAPI, Docker, and PostgreSQL.\n"
            "EDUCATION\nB.Tech in Computer Science\n"
            "EXPERIENCE\nSoftware Engineer at TechCorp\n"
            "• Built microservices using FastAPI handling 50K requests/day.",
            getSampleStyleSheet()["Normal"]
        )
    ])
    pdf_bytes = buf.getvalue()

    with TestClient(app) as test_client:
        res = test_client.post(
            "/api/v1/analyze-resume",
            files={"resume": ("resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            data={"job_description": "We need a Senior Python Developer with FastAPI and Docker experience."}
        )
        assert res.status_code == 200
        data = res.json()
        assert "ats_score" in data
        assert data["ats_score"] > 0
        assert "component_scores" in data
        assert "detailed_feedback" in data
        assert isinstance(data["detailed_feedback"], list)

