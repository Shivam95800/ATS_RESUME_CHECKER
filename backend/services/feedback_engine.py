import re
from typing import List, Dict, Any, Optional
from backend.models.schemas import IssueDetail

def analyze_issues(
        resume_text: str, 
        parsed_resume: Dict, 
        skills: List[str], 
        projects: List[Dict], 
        action_verbs: List[str], 
        skill_validation: Dict, 
        scores: Dict, 
        contact_info: Optional[Dict] = None, 
        jd_comparison: Optional[Dict] = None,
        grammar_results: Optional[Dict] = None,
        location_results: Optional[Dict] = None,
) -> List[IssueDetail]:
    
    detected: List[IssueDetail]=[]

    #Unpack frequently-used structured fields once at the top

    exp_entries  = [e for e in parsed_resume.get('experience', []) if isinstance(e, dict)]
    edu_entries  = [e for e in parsed_resume.get('education',  []) if isinstance(e, dict)]
    proj_entries = [p for p in parsed_resume.get('projects',   []) if isinstance(p, dict)]
    summary      = (parsed_resume.get('professional_summary') or '').strip()  # Handle None to prevent string concatenation errors

    #Build a combined experience text for regex-based checks that still need text
    experience_text = '\n'.join(e.get('description', '') for e in exp_entries).strip()


    #1. missig project section
    resume_lower = resume_text.lower()
    has_projects_signal = any(kw in resume_lower for kw in [
        'project', 'github.com', 'deployed', 'built a', 'developed a',
        'created a', 'implemented a', 'live demo', 'tech stack',
    ])

    if not proj_entries and len(projects) == 0 and not has_projects_signal:
        detected.append(IssueDetail(
            issue_title="Missing Projects Section",
            severity_level="High",
            ats_impact="High",
            explanation=(
                "Your resume does not have a dedicated Projects section. "
                "ATS systems and recruiters look for concrete projects to validate "
                "that your listed skills have been applied in practice."
            ),

            where_it_appears="Resume structure — no 'Projects' header was detected",

            how_to_fix=(
                "Add a 'Projects' section with 2–3 significant projects. "
                "For each project, include the title, technologies used, "
                "what you built, and a measurable outcome."
            ),

            action_items=[
                "Add a 'PROJECTS' section heading after your Experience section",
                "Include 2–3 projects (personal, academic, or open-source)",
                "For each project: write the title, tech stack used, what you built, and a measurable result",
                "Example: 'E-Commerce Platform — React, Node.js, MongoDB. Handled 500+ transactions/month'",
                "Link to GitHub or a live demo if available (e.g., github.com/yourname/project)",
            ],

            example_improvement=(
                "Add:\n"
                "PROJECTS\n"
                "• E-Commerce Platform — Built a full-stack shopping site using "
                "React, Node.js, and MongoDB. Implemented payment processing with "
                "Stripe, handling 500+ transactions/month.\n"
                "• ML Sentiment Analyzer — Trained a BERT model on 10K reviews "
                "achieving 92% accuracy. Deployed as a REST API with FastAPI."
            ),
        ))

    #2. missing experience section
    has_experience_signal = any(kw in resume_lower for kw in [
        'intern', 'internship', 'employed', 'worked at', 'working at',
        'company', 'organization', 'job', 'role', 'position', 'designation',
        'manager', 'engineer', 'developer', 'analyst', 'consultant',
    ])

    if not exp_entries and not has_experience_signal:
        detected.append(IssueDetail(
            issue_title="Missing Work Experience Section",
            severity_level="High",
            ats_impact="High",
            explanation=(
                "No work experience section was detected. Even for freshers, "
                "internships, freelance work, or volunteer experience help "
                "demonstrate professional capability."
            ),
            where_it_appears="Resume structure — no 'Experience' or 'Work History' header found",
            how_to_fix=(
                "Add an 'Experience' section. If you lack formal employment, "
                "include internships, freelance projects, open-source contributions, "
                "or relevant volunteer work."
            ),
            action_items=[
                "Add an 'EXPERIENCE' or 'INTERNSHIPS' section to your resume",
                "List each role with: Job Title — Company Name (Month Year – Month Year)",
                "Add 2–4 bullet points per role describing what you did and its impact",
                "If no formal job: include internships, freelance work, open-source, or college clubs",
                "Start every bullet with a past-tense action verb (Developed, Built, Led, etc.)",
            ],
            example_improvement=(
                "Add:\n"
                "EXPERIENCE\n"
                "Software Engineering Intern — XYZ Corp (Jun 2025 – Aug 2025)\n"
                "• Developed REST APIs with FastAPI serving 10K requests/day\n"
                "• Reduced page load time by 40% through caching optimization"
            ),
        ))

    #3. Missing Education Section 
    has_education_signal = any(kw in resume_lower for kw in [
        'b.tech', 'btech', 'b.e.', 'b.sc', 'bsc', 'm.tech', 'mtech', 'm.sc',
        'bachelor', 'master', 'phd', 'university', 'college',
        'institute of technology', 'cgpa', 'gpa', 'graduated', 'diploma',
        'class of', '20', 'batch of',
    ])
    if not edu_entries and not has_education_signal:
        detected.append(IssueDetail(
            issue_title="Missing Education Section",
            severity_level="Moderate",
            ats_impact="Medium",
            explanation=(
                "No education section was found. Most ATS systems expect an "
                "Education section with at least your degree and institution."
            ),
            where_it_appears="Resume structure — no 'Education' header detected",
            how_to_fix=(
                "Add an 'Education' section listing your degree, university, "
                "graduation year, and optionally your GPA or relevant coursework."
            ),
            action_items=[
                "Add an 'EDUCATION' section (usually at the bottom for experienced candidates, top for freshers)",
                "Include: Degree name — Institution name (Start Year – End Year)",
                "Add your CGPA or percentage if it is 7.0+ or 70%+",
                "Optionally list 3–5 relevant courses (e.g., Data Structures, DBMS, ML)",
            ],
            example_improvement=(
                "Add:\n"
                "EDUCATION\n"
                "B.Tech in Computer Science — IIT Delhi (2021–2025)\n"
                "CGPA: 8.5 | Relevant Coursework: Data Structures, ML, DBMS"
            ),
        ))

    #4. Missing Skills Section 
    if not parsed_resume.get('skills') and len(skills) < 3:  # only flag if extraction also found very few skills
        detected.append(IssueDetail(
            issue_title="Missing or Weak Skills Section",
            severity_level="High",
            ats_impact="High",
            explanation=(
                f"Only {len(skills)} skill(s) were detected. ATS systems "
                "rely heavily on keyword matching from a dedicated Skills section. "
                "Without clear skills listed, your resume may fail automated filters."
            ),
            where_it_appears="Skills section — either missing or contains very few items",
            how_to_fix=(
                "Add a clear 'Skills' section organized by category. "
                "Include programming languages, frameworks, tools, and soft skills "
                "that match your target role."
            ),
            action_items=[
                "Add a 'TECHNICAL SKILLS' or 'SKILLS' section",
                "Organize by category: Languages, Frameworks, Tools, Databases, Cloud",
                "List at least 10–15 skills relevant to your target role",
                "Use the exact names that appear in job descriptions (e.g., 'React.js' not just 'React')",
                "Include tools you use daily: Git, VS Code, Postman, Docker, etc.",
            ],
            example_improvement=(
                "Add:\n"
                "TECHNICAL SKILLS\n"
                "Languages: Python, JavaScript, TypeScript, SQL\n"
                "Frameworks: React, FastAPI, Django, Express.js\n"
                "Tools: Docker, Git, AWS, PostgreSQL, MongoDB"
            ),
        ))

    # 5. Skills Lack Supporting Evidence
    unvalidated = skill_validation.get('unvalidated_skills', [])
    validated   = skill_validation.get('validated_skills', [])
    total_skills = len(unvalidated) + len(validated)

    if total_skills > 0 and len(unvalidated) > len(validated):
        unsupported_list = ', '.join(unvalidated[:8])
        pct_unsupported = round((len(unvalidated) / total_skills) * 100)
        action_items_skills = [
            f"Mention '{skill}' in a project or experience bullet point" for skill in unvalidated[:5]
        ]
        action_items_skills.append("Remove skills you cannot demonstrate with any project or experience")
        if len(unvalidated) > 5:
            action_items_skills.append(f"({len(unvalidated) - 5} more unvalidated skills — review each one)")
        detected.append(IssueDetail(
            issue_title="Most Skills Lack Supporting Evidence",
            severity_level="Moderate",
            ats_impact="High",
            explanation=(
                f"{pct_unsupported}% of your listed skills ({len(unvalidated)} out of "
                f"{total_skills}) are not backed by any mention in your projects or "
                "experience sections. Recruiters and ATS systems cross-reference "
                "skills against actual work to verify credibility."
            ),
            where_it_appears=f"These skills have no supporting context: {unsupported_list}",
            how_to_fix=(
                "For each skill in your Skills section, ensure it appears at least "
                "once in a project description or experience bullet point. "
                "Describe how and where you used that technology."
            ),
            action_items=action_items_skills,
            example_improvement=(
                f"Your skill '{unvalidated[0]}' has no supporting evidence.\n\n"
                f"Fix: Add to a project or experience bullet:\n"
                f"'Built a data pipeline using {unvalidated[0]} that processed "
                "10K records daily, reducing manual effort by 60%.'"
            ),
        ))

    #6. Weak Action Verbs 
    description_lines = [
        line.strip()
        for exp in exp_entries
        for line in exp.get('description', '').split('\n')
        if line.strip()
    ]

    if len(description_lines) > 3 and len(action_verbs) < 3:
        detected.append(IssueDetail(
            issue_title="Bullet Points Lack Strong Action Verbs",
            severity_level="Moderate",
            ats_impact="Medium",
            explanation=(
                f"Your experience section has {len(description_lines)} bullet points but "
                f"only {len(action_verbs)} start with strong action verbs. "
                "ATS systems and recruiters favor bullets that begin with verbs like "
                "'Developed', 'Implemented', 'Designed', 'Optimized'."
            ),
            where_it_appears="Experience section — bullet point openings",
            how_to_fix=(
                "Start every bullet point with a past-tense action verb. "
                "Avoid starting with 'Responsible for', 'Worked on', or 'Helped with'. "
                "Use verbs like: Developed, Built, Designed, Implemented, Led, Automated, Optimized."
            ),
            action_items=[
                "Rewrite every bullet that starts with 'Responsible for', 'Helped', 'Worked on', or 'Assisted'",
                "Use: Developed, Built, Designed, Implemented, Led, Automated, Optimized, Deployed, Reduced, Increased",
                "Make verbs past-tense for previous roles, present-tense for current role",
                f"Review all {len(description_lines)} bullet points — at least {len(description_lines)} should start with action verbs",
                "Avoid weak openers like 'Was responsible for...' or 'Involved in...'",
            ],
            example_improvement=(
                "Before:\n"
                "• Responsible for building the backend\n"
                "• Worked on the payment feature\n\n"
                "After:\n"
                "• Developed a REST API with FastAPI handling 5K daily requests\n"
                "• Implemented Stripe payment integration reducing checkout time by 30%"
            ),
        ))

    #7. No Quantifiable Achievements 
    number_pattern = r'\d+[%+]?|\$\d+'
    has_metrics = bool(re.findall(number_pattern, experience_text)) if experience_text else False

    if experience_text and not has_metrics:
        detected.append(IssueDetail(
            issue_title="No Quantifiable Achievements Found",
            severity_level="Moderate",
            ats_impact="Medium",
            explanation=(
                "Your experience section does not contain any measurable outcomes "
                "(numbers, percentages, or dollar amounts). Quantified achievements "
                "make your impact concrete and are strongly preferred by recruiters."
            ),
            where_it_appears="Experience section — bullet point content",
            how_to_fix=(
                "Add numbers to at least 50% of your bullet points. "
                "Include metrics like: users served, response time improved, "
                "revenue generated, lines of code, team size, etc."
            ),
            action_items=[
                "Go through each bullet point and ask: 'How much?', 'How many?', 'By what %?'",
                "Add metrics: users served, requests/day, % improvement, team size, time saved",
                "Examples: '500+ daily users', 'reduced load time by 40%', 'handled 10K API calls/day'",
                "If exact numbers aren't known, use reasonable estimates (e.g., '~200 users')",
                "Aim for numbers in at least 50% of your experience bullets",
            ],
            example_improvement=(
                "Before:\n"
                "• Improved application performance\n"
                "• Managed a team of developers\n\n"
                "After:\n"
                "• Improved API response time by 45% through Redis caching\n"
                "• Led a team of 5 developers delivering 3 features per sprint"
            ),
        ))

    #8. Missing Contact Information 
    if contact_info:
        missing_contacts = []
        if not contact_info.get('email'):
            missing_contacts.append('email')
        if not contact_info.get('phone'):
            missing_contacts.append('phone number')
        if not contact_info.get('linkedin'):
            missing_contacts.append('LinkedIn URL')

        if len(missing_contacts) >= 2:
            contact_action_items = [f"Add your {item} to the header section" for item in missing_contacts]
            contact_action_items += [
                "Format the contact line as: email | phone | linkedin | github",
                "Make sure your LinkedIn URL is a custom short URL (linkedin.com/in/yourname)",
                "Add a GitHub link if you have public projects (github.com/yourname)",
            ]
            detected.append(IssueDetail(
                issue_title="Incomplete Contact Information",
                severity_level="High",
                ats_impact="High",
                explanation=(
                    f"Your resume is missing: {', '.join(missing_contacts)}. "
                    "Recruiters need reliable ways to reach you. Missing contact "
                    "details can cause your application to be skipped entirely."
                ),
                where_it_appears="Header / Contact section at the top of the resume",
                how_to_fix=(
                    "Add your full name, email, phone number, LinkedIn profile, "
                    "and optionally a GitHub or portfolio link at the top of your resume."
                ),
                action_items=contact_action_items,
                example_improvement=(
                    "Add at top:\n"
                    "John Doe\n"
                    "john.doe@email.com | +91-9876543210\n"
                    "linkedin.com/in/johndoe | github.com/johndoe"
                ),
            ))

    # 9. Low Formatting Score 
    formatting_score = scores.get('formatting_score', 20)
    if formatting_score < 10:
        detected.append(IssueDetail(
            issue_title="Poor Resume Formatting",
            severity_level="High",
            ats_impact="High",
            explanation=(
                f"Your formatting score is {formatting_score}/20, which indicates "
                "problems like missing section headers, inconsistent structure, "
                "or non-standard layout that ATS parsers struggle with."
            ),
            where_it_appears="Overall document structure and formatting",
            how_to_fix=(
                "Use a clean, single-column layout with standard section headers "
                "(Experience, Education, Skills, Projects). Use consistent bullet "
                "points, standard fonts, and avoid tables, columns, or graphics."
            ),
            action_items=[
                "Switch to a single-column layout (avoid two-column templates for ATS)",
                "Use standard section headers: EXPERIENCE, EDUCATION, SKILLS, PROJECTS",
                "Use bullet points (•) consistently — don't mix with dashes or asterisks",
                "Remove all tables, text boxes, headers/footers, and images — ATS cannot parse them",
                "Use a standard font (Calibri, Arial, Times New Roman) at 10–12pt",
                "Order sections: Contact → Summary → Experience → Projects → Education → Skills",
            ],
            example_improvement=(
                "Use this structure:\n"
                "NAME & CONTACT\n"
                "SUMMARY (2-3 lines)\n"
                "EXPERIENCE (reverse chronological)\n"
                "PROJECTS (2-3 key projects)\n"
                "EDUCATION\n"
                "SKILLS (categorized)"
            ),
        ))

    #10. Missing Summary/Objective
    if not summary:
        detected.append(IssueDetail(
            issue_title="Missing Professional Summary",
            severity_level="Low",
            ats_impact="Low",
            explanation=(
                "Your resume does not include a Professional Summary or Objective "
                "section at the top. While not required, a 2-3 line summary helps "
                "recruiters quickly understand your profile and target role."
            ),
            where_it_appears="Top of resume — below contact info",
            how_to_fix=(
                "Add a 2-3 sentence summary highlighting your experience level, "
                "key skills, and career focus. Tailor it to the job you're applying for."
            ),
            action_items=[
                "Add a 'PROFESSIONAL SUMMARY' or 'OBJECTIVE' section at the top of your resume",
                "Write 2–3 sentences: who you are, your key skills, and what role you seek",
                "Mention your years of experience or education level upfront",
                "Tailor this section for each job application — reference the specific role",
                "Keep it under 60 words — recruiters spend only 6 seconds on first scan",
            ],
            example_improvement=(
                "Add:\n"
                "PROFESSIONAL SUMMARY\n"
                "Full-stack developer with 2+ years of experience building scalable "
                "web applications using React, Node.js, and AWS. Passionate about "
                "clean architecture and performance optimization."
            ),
        ))

    # 11. Missing Target Job Description Keywords
    if jd_comparison:
        missing_kw = jd_comparison.get('missing_keywords', [])
        match_pct = float(jd_comparison.get('match_percentage', 0.0))
        if missing_kw:
            missing_sample = missing_kw[:6]
            missing_str = ', '.join(missing_sample)
            sev = "High" if (match_pct < 50.0 or len(missing_kw) >= 5) else "Moderate"
            detected.append(IssueDetail(
                issue_title="Missing Key Job Description Terms",
                severity_level=sev,
                ats_impact="High",
                explanation=(
                    f"Your resume is missing {len(missing_kw)} important keywords and qualifications "
                    "found in the target job description. ATS screening algorithms rank candidates "
                    "largely on matching these key technical and domain phrases."
                ),
                where_it_appears=f"Target Job Description alignment — missing: {missing_str}",
                how_to_fix=(
                    "Incorporate the missing keywords naturally into your experience bullet points, "
                    "project descriptions, or technical skills section where you have genuine experience."
                ),
                action_items=[
                    f"Review these missing keywords: {', '.join(missing_kw[:8])}",
                    "Integrate matching keywords into your most relevant work experience bullet points",
                    "Add missing technologies to your Skills section if you have worked with them",
                    "Ensure technical terms match the exact naming conventions used in the job post",
                    "Do not keyword-stuff; weave terms into contextual achievement bullets",
                ],
                example_improvement=(
                    f"Missing keyword: {missing_kw[0]}\n\n"
                    "Before:\n"
                    "• Worked on backend services and cloud deployments.\n\n"
                    "After:\n"
                    f"• Engineered scalable backend services using {missing_kw[0]} and Docker, "
                    "improving deployment throughput by 35%."
                ),
            ))

        # 12. Skills Gap Identified
        skills_gap = jd_comparison.get('skills_gap', [])
        if skills_gap:
            gap_sample = skills_gap[:5]
            gap_str = ', '.join(gap_sample)
            action_items_gap = [f"Add '{s}' to your Skills section if you have experience with it" for s in gap_sample[:4]]
            action_items_gap.append("Provide a tangible project or experience bullet demonstrating how you used it")
            detected.append(IssueDetail(
                issue_title="Skills Gap Against Target Role",
                severity_level="Moderate",
                ats_impact="High",
                explanation=(
                    f"The job description emphasizes {len(skills_gap)} technical skill(s) "
                    "that were not detected in your resume. Recruiters actively look for these competencies."
                ),
                where_it_appears=f"Technical Stack — skills gap: {gap_str}",
                how_to_fix=(
                    "Add any of these skills that you possess to your Technical Skills section, "
                    "and highlight them in your project or internship descriptions."
                ),
                action_items=action_items_gap,
                example_improvement=(
                    f"Missing skill: {skills_gap[0]}\n\n"
                    "Add to a project bullet:\n"
                    f"• Developed full-stack modules incorporating {skills_gap[0]} "
                    "to streamline data processing and optimize query speeds by 25%."
                ),
            ))

    # 13. Grammar, Capitalization, and Text Quality Errors
    if grammar_results and grammar_results.get('total_errors', 0) > 0:
        crit_errs = grammar_results.get('critical_errors', [])
        mod_errs = grammar_results.get('moderate_errors', [])
        min_errs = grammar_results.get('minor_errors', [])
        all_err_msgs = crit_errs + mod_errs + min_errs

        err_summary = '; '.join(all_err_msgs[:3])
        sev = "High" if crit_errs else "Moderate"
        detected.append(IssueDetail(
            issue_title="Grammar & Text Quality Errors",
            severity_level=sev,
            ats_impact="Medium",
            explanation=(
                f"Scanning detected {grammar_results.get('total_errors', 0)} text quality issues, "
                "such as repeated words, duplicate punctuation, or inconsistent capitalization. "
                "Typos and duplicate words reflect poorly on attention to detail and can confuse ATS tokenizers."
            ),
            where_it_appears=f"Resume text — issues found: {err_summary}",
            how_to_fix=(
                "Carefully proofread your resume. Fix duplicated words, ensure consistent double-space removal, "
                "and ensure every bullet point begins with a capitalized letter."
            ),
            action_items=[
                "Proofread lines flagged for repeated words and repeated punctuation",
                "Ensure every bullet point begins with a capital letter",
                "Normalize spacing to ensure single spaces between words",
                "Use an automated grammar checker or peer review before submitting",
            ],
            example_improvement=(
                "Before:\n"
                "• the the system was deployed with  double spaces and lowercase start.\n\n"
                "After:\n"
                "• Deployed the production system with automated testing and zero downtime."
            ),
        ))

    # 14. Location & Contact Privacy Risks
    if location_results and location_results.get('privacy_risk') in ('high', 'medium'):
        det_locs = location_results.get('detected_locations', [])
        loc_recs = location_results.get('recommendations', [])
        address_found = any(l.get('type') == 'address' for l in det_locs)
        zip_found = any(l.get('type') == 'zip' for l in det_locs)

        detected.append(IssueDetail(
            issue_title="Excessive Location & Privacy Risk",
            severity_level="Moderate" if location_results.get('privacy_risk') == 'high' else "Low",
            ats_impact="Low",
            explanation=(
                "Your resume includes specific street addresses, postal/PIN codes, or excessive location details. "
                "Modern ATS and hiring guidelines recommend omitting full residential addresses to safeguard privacy "
                "and prevent location bias."
            ),
            where_it_appears="Header / Contact section — detected street address or postal code",
            how_to_fix=(
                "Remove your full street address and postal/PIN code. "
                "Listing just 'City, State' or 'City, Country' in your contact header is standard and sufficient."
            ),
            action_items=[
                "Remove full residential street address (e.g., apartment/house number, street name)",
                "Remove postal/ZIP/PIN codes",
                "Format location simply as: City, State/Country (e.g., 'Austin, TX' or 'New Delhi, India')",
            ] + loc_recs[:2],
            example_improvement=(
                "Before:\n"
                "123 Elm Street, Apt 4B, Austin, TX 78701\n\n"
                "After:\n"
                "Austin, TX | your.email@example.com | linkedin.com/in/yourprofile"
            ),
        ))

    return detected


def generate_issues_summary(detected_issues: List[IssueDetail]) -> List[str]:
    """Extract issue titles to formulate the issues_summary list."""
    return [issue.issue_title for issue in detected_issues]
