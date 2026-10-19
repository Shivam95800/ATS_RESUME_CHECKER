import os
import re
import json 
import logging
from typing import Dict, List, Optional, Any

from groq import Groq

logger=logging.getLogger('ats_resume_scorer')


GROQ_MODEL='llama-3.3-70b-versatile'

_client=None

MAX_RAW_TEXT_CHARS = 20000

def _get_client() -> Groq | None:
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        return None
    try:
        _client = Groq(api_key=api_key, timeout=30.0)
        return _client
    except Exception as exc:
        logger.warning(f"Failed to initialize Groq client: {exc}")
        return None

RESUME_SYSTEM_PROMPT = (
    "You are a resume parser. Extract information from the resume "
    "and return ONLY a valid JSON object. No explanation, no markdown."
)

RESUME_USER_PROMPT = """Extract the following from this resume and return as JSON:
{{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "linkedin": "LinkedIn URL if present, otherwise null",
  "github": "GitHub URL if present, otherwise null",
  "professional_summary": "the full text of the Summary, Profile, About Me, Objective, or Professional Summary section at the top of the resume. Copy the ENTIRE paragraph exactly as written. If no such section exists, return an empty string.",
  "skills": ["list", "of", "skills"],
  "experience": [
    {{
      "job_title": "",
      "company": "",
      "start_date": "",
      "end_date": "",
      "duration_months": 0,
      "description": ""
    }}
  ],
  "education": [
    {{
      "degree": "",
      "institution": "",
      "year": ""
    }}
  ],
  "certifications": ["list of certifications"],
  "projects": [
    {{
      "title": "project name",
      "description": "what the project does and how it was built",
      "technologies": ["tech", "used"]
    }}
  ],
  "action_verbs": ["strong action verbs used in bullet points, e.g. developed, implemented, designed"],
  "keywords": ["important keywords and phrases from the resume for ATS matching"]
}}

Important instructions:
- For duration_months, calculate the number of months between start_date and end_date. If end_date is "Present" or "Current", calculate from start_date to now.
- For skills, extract ALL technical and soft skills mentioned anywhere in the resume.
- For action_verbs, find verbs that start bullet points or describe achievements.
- For keywords, extract noun phrases and technical terms relevant to ATS matching.
- Return ONLY valid JSON. No markdown code fences, no explanation.

Resume Text:
{raw_text}"""

def _call_groq(client: Groq, system_prompt: str, user_prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL, 
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=4096,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        logger.warning(f"Groq API call with json_object format failed: {exc}, retrying without response_format...")
        response = client.chat.completions.create(
            model=GROQ_MODEL, 
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            temperature=0.0,
            max_tokens=4096,
        )
        return response.choices[0].message.content.strip()

def _try_parse_json(text: str) -> dict | None:
    # Strip markdown code fences if present
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = cleaned.index("\n") if "\n" in cleaned else len(cleaned)
        cleaned = cleaned[first_newline + 1:]
        # Remove closing fence
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None

COMMON_TECH_SKILLS = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Golang", "Rust",
    "Ruby", "PHP", "Swift", "Kotlin", "SQL", "HTML", "CSS", "HTML5", "CSS3", "Bash", "Shell",
    "R", "Scala", "Dart",
    "React", "React.js", "Angular", "Vue", "Vue.js", "Next.js", "Nuxt.js", "Django", "FastAPI",
    "Flask", "Node.js", "Express", "Express.js", "Spring", "Spring Boot", "PyTorch", "TensorFlow",
    "Keras", "Scikit-learn", "Pandas", "NumPy", "spaCy", "NLTK", "OpenCV", "HuggingFace", "Tailwind",
    "Bootstrap", "jQuery", "Redux", "GraphQL",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Elasticsearch", "Cassandra", "DynamoDB",
    "Firebase", "Supabase", "Oracle",
    "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Git",
    "GitHub", "GitLab", "CI/CD", "Jenkins", "Linux", "Terraform", "Ansible", "Nginx", "Apache",
    "Postman", "Jira", "Kafka", "RabbitMQ", "Celery", "Airflow", "Spark", "Hadoop",
    "REST", "REST API", "Microservices", "Machine Learning", "Deep Learning", "NLP",
    "Computer Vision", "Agile", "Scrum", "TDD", "System Design", "DevOps"
]

COMMON_ACTION_VERBS = [
    "developed", "built", "engineered", "designed", "implemented", "architected", "led", "managed",
    "created", "automated", "optimized", "deployed", "reduced", "increased", "delivered",
    "formulated", "coordinated", "authored", "trained", "integrated", "streamlined", "established",
    "spearheaded", "executed", "collaborated", "researched", "tested", "maintained", "analyzed"
]

def _matches_skill(skill: str, text: str) -> bool:
    if not skill or not text:
        return False
    escaped = re.escape(skill.strip())
    pattern = rf'(?<![a-zA-Z0-9_#+.]){escaped}(?![a-zA-Z0-9_#+])'
    return bool(re.search(pattern, text, re.IGNORECASE))

def _fallback_parse_resume(raw_text: str) -> Dict:
    text = raw_text or ""
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # 1. Contact Info
    email_m = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', text)
    email = email_m.group(0) if email_m else None

    phone_m = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,12}', text)
    phone = phone_m.group(0) if phone_m else None

    li_m = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+', text, re.IGNORECASE)
    linkedin = li_m.group(0) if li_m else None

    gh_m = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+', text, re.IGNORECASE)
    github = gh_m.group(0) if gh_m else None

    # 2. Candidate Name (from leading non-heading lines)
    name = ""
    for line in lines[:6]:
        if (
            len(line.split()) in (2, 3, 4)
            and not any(c in line for c in ('@', 'http', ':', '/', '\\', '|', '+', '•', '-'))
            and not re.search(r'\b(resume|cv|curriculum|vitae|summary|profile|developer|engineer|contact)\b', line, re.IGNORECASE)
            and not re.search(r'\d', line)
        ):
            name = line
            break

    # 3. Professional Summary
    summary_m = re.search(
        r'(?is)(?:summary|professional\s+summary|profile|about\s+me|objective)\s*[:\n\-]+(.*?)(?=\n\s*(?:experience|work\s+history|employment|education|skills|technical\s+skills|projects|certifications)|\Z)',
        text
    )
    summary = summary_m.group(1).strip() if summary_m else ""
    if not summary and len(lines) > 2 and len(lines[1]) > 50:
        summary = lines[1]

    # 4. Skills Extraction
    detected_skills = [skill for skill in COMMON_TECH_SKILLS if _matches_skill(skill, text)]

    skills_sec_m = re.search(
        r'(?is)(?:technical\s+skills|skills)\s*[:\n\-]+(.*?)(?=\n\s*(?:experience|work\s+history|education|projects|certifications)|\Z)',
        text
    )
    if skills_sec_m:
        sec_text = skills_sec_m.group(1)
        tokens = re.split(r'[,|•\n\t]+', sec_text)
        for tok in tokens:
            cleaned_tok = re.sub(r'^[A-Za-z\s]+:\s*', '', tok).strip()
            if cleaned_tok and 1 < len(cleaned_tok) < 30 and cleaned_tok not in detected_skills:
                if not re.search(r'(?:experience|projects|education)', cleaned_tok, re.IGNORECASE):
                    detected_skills.append(cleaned_tok)

    # 5. Experience Extraction
    experience = []
    exp_m = re.search(
        r'(?is)(?:work\s+experience|professional\s+experience|experience|employment\s+history)\s*[:\n\-]+(.*?)(?=\n\s*(?:education|projects|skills|certifications)|\Z)',
        text
    )
    if exp_m:
        exp_text = exp_m.group(1).strip()
        exp_lines = [l for l in exp_text.split('\n') if l.strip()]
        job_title = "Software Engineer"
        for l in exp_lines[:3]:
            if re.search(r'\b(engineer|developer|intern|manager|lead|analyst|consultant|architect)\b', l, re.IGNORECASE):
                job_title = l.strip()
                break
        experience.append({
            "job_title": job_title,
            "company": "Company",
            "start_date": "",
            "end_date": "Present",
            "duration_months": 12,
            "description": exp_text[:2000]
        })

    # 6. Education Extraction
    education = []
    edu_m = re.search(
        r'(?is)(?:education|academic\s+background)\s*[:\n\-]+(.*?)(?=\n\s*(?:experience|projects|skills|certifications)|\Z)',
        text
    )
    edu_text = edu_m.group(1).strip() if edu_m else text
    deg_match = re.search(r'(?i)\b(B\.?Tech|B\.?E\.?|B\.?S\.?|B\.?Sc|M\.?Tech|M\.?S\.?|M\.?Sc|Bachelor|Master|PhD|Doctorate|Diploma|Associate)[^\n,]*', edu_text)
    deg_name = deg_match.group(0).strip() if deg_match else "Bachelor's Degree"
    inst_match = re.search(r'(?i)\b([A-Z][a-zA-Z\s]+(?:University|College|Institute|School|IIT|NIT))\b', edu_text)
    institution = inst_match.group(0).strip() if inst_match else "University"
    yr_match = re.search(r'\b(19\d{2}|20\d{2})\b', edu_text)
    year = yr_match.group(0) if yr_match else ""

    if deg_match or inst_match or edu_m:
        education.append({
            "degree": deg_name,
            "institution": institution,
            "year": year
        })

    # 7. Projects Extraction
    projects = []
    proj_m = re.search(
        r'(?is)(?:projects|key\s+projects|academic\s+projects|personal\s+projects)\s*[:\n\-]+(.*?)(?=\n\s*(?:education|experience|skills|certifications)|\Z)',
        text
    )
    if proj_m:
        proj_text = proj_m.group(1).strip()
        proj_blocks = re.split(r'\n(?=[•\-\*]|\d+\.|\b[A-Z][a-zA-Z\s]{3,30}:)', proj_text)
        for block in proj_blocks:
            cleaned_block = block.strip()
            if len(cleaned_block) > 15:
                p_lines = cleaned_block.split('\n')
                p_title = p_lines[0].lstrip('•-* 0123456789.').strip()
                p_techs = [s for s in detected_skills if _matches_skill(s, cleaned_block)]
                projects.append({
                    "title": p_title[:80],
                    "description": cleaned_block[:1000],
                    "technologies": p_techs
                })
    if not projects and len(detected_skills) > 0:
        projects.append({
            "title": "Technical Project",
            "description": f"Applied technologies including {', '.join(detected_skills[:4])}.",
            "technologies": detected_skills[:4]
        })

    # 8. Action Verbs
    detected_verbs = []
    for line in lines:
        cleaned_line = re.sub(r'^[•\-\*\◦\d\.\s]+', '', line).strip()
        words = cleaned_line.split()
        if words:
            first_word = words[0].lower().rstrip('ed')
            for v in COMMON_ACTION_VERBS:
                if v.startswith(first_word) or first_word.startswith(v[:4]):
                    detected_verbs.append(words[0].capitalize())
                    break

    # 9. Keywords
    keywords = list(dict.fromkeys(detected_skills + [v for v in detected_verbs[:10]]))

    res = {
        "name": name,
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
        "professional_summary": summary,
        "skills": detected_skills,
        "experience": experience,
        "education": education,
        "certifications": [],
        "projects": projects,
        "action_verbs": list(dict.fromkeys(detected_verbs)),
        "keywords": keywords,
    }
    return _validate_resume_result(res)

def _fallback_parse_jd(raw_text: str) -> Dict:
    text = raw_text or ""
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # 1. Job Title
    title_m = re.search(r'(?i)(?:job\s+title|role|position)\s*[:\-]\s*([^\n]+)', text)
    job_title = title_m.group(1).strip() if title_m else (lines[0] if lines else "Target Role")

    # 2. Required & Preferred Skills
    detected_skills = [skill for skill in COMMON_TECH_SKILLS if _matches_skill(skill, text)]

    pref_m = re.search(r'(?is)(?:preferred|nice\s+to\s+have|bonus|plus)\s*[:\n\-]+(.*?)(?=\n\s*(?:requirements|responsibilities|benefits)|\Z)', text)
    preferred_skills = []
    required_skills = []

    if pref_m:
        pref_text = pref_m.group(1)
        for s in detected_skills:
            if _matches_skill(s, pref_text):
                preferred_skills.append(s)
            else:
                required_skills.append(s)
    else:
        required_skills = detected_skills

    res = {
        "job_title": job_title[:80],
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "experience_required": "",
        "education_required": "",
        "key_responsibilities": [],
        "keywords": detected_skills,
    }
    return _validate_jd_result(res)

def parse_resume(raw_text: str) -> Dict:
    raw_text = (raw_text or "")[:MAX_RAW_TEXT_CHARS]
    client = _get_client()
    if client is None:
        logger.info("GROQ_API_KEY not configured or client unavailable; using local heuristic parser.")
        return _fallback_parse_resume(raw_text)

    try:
        prompt = RESUME_USER_PROMPT.format(raw_text=raw_text)
        raw_response = _call_groq(client, RESUME_SYSTEM_PROMPT, prompt)
        result = _try_parse_json(raw_response)

        if result is not None:
            return _validate_resume_result(result)

        logger.warning("Groq resume parse: first attempt returned invalid JSON, retrying once...")
        strict_prompt = (
            "Your previous response was not valid JSON. "
            "Return ONLY the raw JSON object, no markdown, no explanation, no code fences.\n\n"
            + prompt
        )
        raw_response = _call_groq(client, RESUME_SYSTEM_PROMPT, strict_prompt)
        result = _try_parse_json(raw_response)
        if result is not None:
            return _validate_resume_result(result)
    except Exception as exc:
        logger.warning(f"Groq API resume parse failed: {exc}. Falling back to local heuristic parser.")

    return _fallback_parse_resume(raw_text)

JD_SYSTEM_PROMPT = (
    "You are a job description parser. Extract information and "
    "return ONLY a valid JSON object. No explanation, no markdown."
)

JD_USER_PROMPT = """Extract the following from this job description and return as JSON:
{{
  "job_title": "",
  "required_skills": ["list of must-have skills"],
  "preferred_skills": ["list of nice-to-have skills"],
  "experience_required": "",
  "education_required": "",
  "key_responsibilities": ["list of responsibilities"],
  "keywords": ["important keywords and phrases for ATS matching"]
}}

Important instructions:
- required_skills: skills explicitly stated as required or must-have.
- preferred_skills: skills stated as preferred, nice-to-have, or bonus.
- keywords: extract ALL important terms an ATS system would match against,
  including skills, technologies, certifications, and domain terms.
- Return ONLY valid JSON. No markdown code fences, no explanation.

Job Description Text:
{raw_text}"""

def parse_job_description(raw_text: str) -> Dict:
    raw_text = (raw_text or "")[:MAX_RAW_TEXT_CHARS]
    client = _get_client()
    if client is None:
        logger.info("GROQ_API_KEY not configured or client unavailable; using local JD parser.")
        return _fallback_parse_jd(raw_text)

    try:
        prompt = JD_USER_PROMPT.format(raw_text=raw_text)
        raw_response = _call_groq(client, JD_SYSTEM_PROMPT, prompt)
        result = _try_parse_json(raw_response)
        if result is not None:
            return _validate_jd_result(result)

        logger.warning("Groq JD parse: first attempt returned invalid JSON, retrying once...")
        strict_prompt = (
            "Your previous response was not valid JSON. "
            "Return ONLY the raw JSON object, no markdown, no explanation, no code fences.\n\n"
            + prompt
        )
        raw_response = _call_groq(client, JD_SYSTEM_PROMPT, strict_prompt)
        result = _try_parse_json(raw_response)
        if result is not None:
            return _validate_jd_result(result)
    except Exception as exc:
        logger.warning(f"Groq API JD parse failed: {exc}. Falling back to local JD parser.")

    return _fallback_parse_jd(raw_text)

#it will make sure, that the parse json has all the valid fields we expect
def _validate_jd_result(result: dict) -> dict:
    
    defaults = {
        "job_title": "",
        "required_skills": [],
        "preferred_skills": [],
        "experience_required": "",
        "education_required": "",
        "key_responsibilities": [],
        "keywords": [],
    }

    for key, default in defaults.items():
        if key not in result or result[key] is None:
            result[key] = default
        if isinstance(default, list) and not isinstance(result[key], list):
            result[key] = default

    return result


#to make sure the parse json has all the valid json fields
def _validate_resume_result(result: dict) -> dict:

    defaults = {
        "name": "",
        "email": None,
        "phone": None,
        "linkedin": None,
        "github": None,
        "professional_summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "certifications": [],
        "projects": [],
        "action_verbs": [],
        "keywords": [],
    }
    for key, default in defaults.items():
        if key not in result or result[key] is None:
            result[key] = default
            
        # Ensure list fields are actually lists
        if isinstance(default, list) and not isinstance(result[key], list):
            result[key] = default

    #Validate experience entries
    for exp in result.get("experience", []):
        if not isinstance(exp, dict):
            continue
        exp.setdefault("job_title", "")
        exp.setdefault("company", "")
        exp.setdefault("start_date", "")
        exp.setdefault("end_date", "")
        exp.setdefault("duration_months", 0)
        exp.setdefault("description", "")
        #Ensure duration_months is an int
        try:
            exp["duration_months"] = int(exp["duration_months"])
        except (ValueError, TypeError):
            exp["duration_months"] = 0

    #Validate project entries
    for proj in result.get("projects", []):
        if not isinstance(proj, dict):
            continue
        proj.setdefault("title", "")
        proj.setdefault("description", "")
        proj.setdefault("technologies", [])

    return result


