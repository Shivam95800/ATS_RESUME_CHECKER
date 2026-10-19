import asyncio
import logging
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import PlainTextResponse, Response

from backend.api.auth import get_current_user
from backend.core.config import MAX_FILE_SIZE_BYTES
from backend.models.schemas import AnalysisResponse, ComponentScores, JDComparison, SkillValidationDetails
from backend.utils.limiter import limiter

logger = logging.getLogger('ats_resume_scorer')

router = APIRouter(prefix='/api/v1', tags=['Analysis'])

def _clean(text: str) -> str:
    for prefix in ('✅', '🌟', '❌', '⚠️', '📝', '🔴', '🟡', '🟢', '🟠', '👍'):
        text = text.lstrip(prefix)
    return text.strip()

@router.post('/parse-jd')
async def parse_jd(
    request: Request,
    file: UploadFile = File(..., description="Job description file (PDF, DOCX, or TXT, max 5 MB)"),
    user_id: str = Depends(get_current_user),
):
    """Extract and return plain text from an uploaded Job Description (PDF, DOCX, or TXT)."""
    file_bytes = await file.read()
    filename = file.filename or 'job_description.txt'

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="JD file exceeds maximum allowed size of 5 MB.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=422, detail="Uploaded JD file is empty.")

    ext = os.path.splitext(filename)[1].lower()
    try:
        if ext == '.pdf':
            from backend.services.resume_parser import extract_text_from_pdf
            text = await run_in_threadpool(extract_text_from_pdf, file_bytes)
        elif ext == '.docx':
            from backend.services.resume_parser import extract_text_from_docx
            text = await run_in_threadpool(extract_text_from_docx, file_bytes)
        elif ext in ('.txt', ''):
            try:
                text = file_bytes.decode('utf-8')
            except UnicodeDecodeError:
                text = file_bytes.decode('latin-1', errors='replace')
        else:
            from backend.services.resume_parser import parse_resume_file
            text, _ = await run_in_threadpool(parse_resume_file, file_bytes, filename)
    except Exception as exc:
        logger.warning(f"JD parsing failed for '{filename}': {exc}")
        raise HTTPException(status_code=422, detail=f"Could not read or parse JD document: {exc}")

    cleaned_text = text.strip()
    if not cleaned_text:
        raise HTTPException(status_code=422, detail="No readable text found in the job description file.")

    if "text/plain" in request.headers.get("accept", ""):
        return PlainTextResponse(cleaned_text)

    return {"text": cleaned_text, "filename": filename, "char_count": len(cleaned_text)}

@router.post('/analyze-resume', response_model=AnalysisResponse)
@limiter.limit("15/minute")
async def analyze_resume(
    request: Request,
    resume: UploadFile = File(..., description='Resume file — PDF or DOCX, max 5 MB'),
    job_description: str = Form('', description='Job description text (optional)'),
    user_id: str = Depends(get_current_user),
):
    warnings: List[str] = []

    nlp      = request.app.state.nlp
    embedder = getattr(request.app.state, 'embedder', None)
    if embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            from backend.core.config import SENTENCE_TRANSFORMER_MODEL
            embedder = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL, device='cpu')
            request.app.state.embedder = embedder
        except Exception as exc:
            logger.warning(f"Could not load SentenceTransformer on demand: {exc}")

    try:
        file_bytes = await resume.read()
        filename   = resume.filename or 'resume'

        from backend.services.resume_parser import (
            FileEmptyError,
            FileParsingError,
            FileTooLargeError,
            FileValidationError,
            UnsupportedFileTypeError,
            parse_resume_file,
        )

        resume_text, _metadata = await run_in_threadpool(parse_resume_file, file_bytes, filename)
        logger.info(f"Parsed '{filename}': {len(resume_text)} chars extracted")

    except FileTooLargeError as exc:
        logger.warning(f"File upload too large: {exc}")
        raise HTTPException(status_code=413, detail=str(exc))
    except UnsupportedFileTypeError as exc:
        logger.warning(f"Unsupported file type uploaded: {exc}")
        raise HTTPException(status_code=415, detail=str(exc))
    except (FileEmptyError, FileParsingError, FileValidationError) as exc:
        logger.warning(f"File parse/validation failed: {exc}")
        raise HTTPException(status_code=422, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error while reading or parsing resume file")
        raise HTTPException(status_code=500, detail="Internal server error while processing the resume.")

    # Full Analysis Pipeline (run offloaded in threadpool to prevent event loop starvation)
    try:
        from backend.services.resume_analyzer import analyze_full_resume
        
        result = await run_in_threadpool(
            analyze_full_resume,
            resume_text=resume_text,
            nlp=nlp,
            embedder=embedder,
            job_description=job_description
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Full analysis pipeline failed")
        raise HTTPException(status_code=500, detail="An error occurred while analyzing the resume. Please try again.")

    from backend.models.schemas import ComponentScores

    # Extract jd_comparison details
    jd_comparison_result = None
    if result.get('jd_comparison'):
        jd_comparison_result = JDComparison(
            match_percentage=round(float(result['jd_comparison'].get('match_percentage', 0.0)), 1),
            semantic_similarity=round(float(result['jd_comparison'].get('semantic_similarity', 0.0)), 3),
            matched_keywords=result['jd_comparison'].get('matched_keywords', [])[:20],
            missing_keywords=result['jd_comparison'].get('missing_keywords', [])[:15],
            skills_gap=result['jd_comparison'].get('skills_gap', [])[:10],
        )

    # Convert detailed_feedback objects from prediction into what schema expects
    detailed_fb = result.get('detailed_feedback', [])

    svd_raw = result.get('skill_validation_details') or {}
    skill_val_details = SkillValidationDetails(
        validated       = svd_raw.get('validated', []),
        unvalidated     = svd_raw.get('unvalidated', []),
        total           = svd_raw.get('total', 0),
        validated_count = svd_raw.get('validated_count', 0),
        validation_pct  = svd_raw.get('validation_pct', 0.0),
    )

    response = AnalysisResponse(
        ats_score=result['ats_score'],
        component_scores=ComponentScores(**result['component_scores']),
        issues_summary=result.get('issues_summary', []),
        detailed_feedback=detailed_fb,
        jd_match_analysis=jd_comparison_result,
        skill_validation_details=skill_val_details,

        job_title=result.get('job_title', 'General Resume'),
        keyword_match=jd_comparison_result.match_percentage if jd_comparison_result else 0.0,
        missing_keywords=result.get('missing_keywords', []),
        matched_keywords=result.get('matched_keywords', []),
        suggestions=result.get('suggestions', []),
        strengths=result.get('strengths', []),
        critical_issues=result.get('critical_issues', []),
        skills=list(result.get('skills', [])[:20]),
        jd_comparison=jd_comparison_result,
        warnings=result.get('warnings', []),
        interpretation=result.get('interpretation', ''),
    )

    try:
        from backend.database.supabase_db import save_analysis
        await save_analysis(user_id, filename, result)
    except Exception as exc:
        logger.warning(f'History save failed (non-blocking): {exc}')

    return response

@router.get('/health')
async def health_check(request: Request):
    """Health check — confirms models are loaded and the API is ready."""
    return {
        'status':          'healthy',
        'nlp_loaded':      getattr(request.app.state, 'nlp', None) is not None,
        'embedder_loaded': getattr(request.app.state, 'embedder', None) is not None,
    }

@router.get('/history')
async def get_history(user_id: str = Depends(get_current_user)):
    """Return the signed-in user's past analyses (identity comes from the JWT)."""
    from backend.database.supabase_db import get_user_history
    try:
        return await get_user_history(user_id)
    except Exception as exc:
        logger.error(f'History fetch failed: {exc}')
        raise HTTPException(status_code=500, detail=f'Could not load history: {exc}')


@router.delete('/history/{analysis_id}')
async def delete_history_entry(
    analysis_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete one analysis from the signed-in user's history."""
    from backend.database.supabase_db import delete_analysis
    try:
        success = await delete_analysis(analysis_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail='Analysis not found or not owned by this user.')
        return {'status': 'deleted', 'id': analysis_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f'History delete failed: {exc}')
        raise HTTPException(status_code=500, detail=f'Could not delete: {exc}')
    

@router.post('/generate-pdf')
@limiter.limit("10/minute")
async def generate_pdf(
    request: Request,
    data: AnalysisResponse,
    user_id: str = Depends(get_current_user),
):
    from backend.services.report_generator import generate_html_reports
    from backend.services.pdf_export import generate_combined_pdf

    data_dict = data.model_dump()
    # Cap feedback items to prevent excessive render time / memory blowup
    if len(data_dict.get('detailed_feedback', [])) > 150:
        data_dict['detailed_feedback'] = data_dict['detailed_feedback'][:150]

    try:
        html_docs = await run_in_threadpool(generate_html_reports, data_dict)
        pdf_bytes = await asyncio.wait_for(
            run_in_threadpool(generate_combined_pdf, html_docs),
            timeout=15.0,
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=ats_report.pdf"
            }
        )
    except asyncio.TimeoutError:
        logger.error("PDF generation timed out (>15s)")
        raise HTTPException(status_code=504, detail="PDF generation timed out (>15s). Please try again.")
    except (ImportError, OSError) as e:
        logger.error(f"PDF rendering library unavailable: {e}")
        raise HTTPException(status_code=503, detail="PDF generation service unavailable.")
    except Exception as e:
        logger.error(f'Failed to generate PDF: {e}')
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {e}")
    

@router.get('/history/{analysis_id}/pdf')
@limiter.limit("10/minute")
async def generate_history_pdf(
    request: Request,
    analysis_id: str,
    user_id: str = Depends(get_current_user),
):
    from backend.database.supabase_db import get_user_history
    from backend.services.report_generator import generate_html_reports
    from backend.services.pdf_export import generate_combined_pdf

    history = await get_user_history(user_id)
    analysis_data = next((item["analysis_result"] for item in history if item["id"] == analysis_id), None)

    if not analysis_data:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if isinstance(analysis_data, dict) and len(analysis_data.get('detailed_feedback', [])) > 150:
        analysis_data['detailed_feedback'] = analysis_data['detailed_feedback'][:150]

    try:
        html_docs = await run_in_threadpool(generate_html_reports, analysis_data)
        pdf_bytes = await asyncio.wait_for(
            run_in_threadpool(generate_combined_pdf, html_docs),
            timeout=15.0,
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=ats_report_{analysis_id}.pdf"
            }
        )
    except asyncio.TimeoutError:
        logger.error(f"History PDF generation timed out for {analysis_id}")
        raise HTTPException(status_code=504, detail="PDF generation timed out (>15s). Please try again.")
    except (ImportError, OSError) as e:
        logger.error(f"PDF rendering library unavailable: {e}")
        raise HTTPException(status_code=503, detail="PDF generation service unavailable.")
    except Exception as e:
        logger.error(f'Failed to generate PDF for history: {e}')
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {e}")