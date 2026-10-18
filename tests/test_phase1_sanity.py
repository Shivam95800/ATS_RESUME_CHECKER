import pytest
import spacy
from backend.services.resume_parser import (
    validate_file,
    FileValidationError,
    FileTooLargeError,
    UnsupportedFileTypeError,
    FileEmptyError,
)
from backend.services.ats_scorer import _matches_skill_word_boundary, detect_location_info
from backend.services.grammar_checker import check_grammar
from backend.services.groq_parser import _try_parse_json
from backend.core.config import COMPONENT_MAXIMA

def test_validate_file_empty():
    is_valid, msg, ftype = validate_file(b'', 'resume.pdf')
    assert is_valid is False
    assert ftype is None
    assert 'empty' in msg.lower()

def test_validate_file_oversized():
    huge_data = b'x' * (6 * 1024 * 1024)
    is_valid, msg, ftype = validate_file(huge_data, 'resume.pdf')
    assert is_valid is False
    assert ftype is None
    assert 'exceeds the maximum' in msg

def test_skill_word_boundary_matching():
    # Negative cases: short skills inside bigger words
    assert not _matches_skill_word_boundary('Go', 'We use smart algorithms for routing')
    assert not _matches_skill_word_boundary('C', 'Deployed on cloud instances')
    assert not _matches_skill_word_boundary('R', 'Worked as a software engineer')
    
    # Positive cases
    assert _matches_skill_word_boundary('Go', 'Experience with Go and Python')
    assert _matches_skill_word_boundary('C', 'Proficient in C, C++, and Python')
    assert _matches_skill_word_boundary('C++', 'Strong C++ developer')
    assert _matches_skill_word_boundary('R', 'Data analysis in R and SQL')

def test_location_and_postal_codes():
    nlp = spacy.load('en_core_web_sm')
    
    # Indian PIN code
    res_in = detect_location_info('Living in Connaught Place, New Delhi 110001, India', nlp)
    assert res_in['location_found'] is True
    assert any(loc['type'] == 'zip' and loc['text'] == '110001' for loc in res_in['detected_locations'])
    
    # US ZIP code
    res_us = detect_location_info('123 Elm Street, Austin, TX 78701', nlp)
    assert res_us['location_found'] is True
    assert any(loc['type'] == 'zip' and loc['text'] == '78701' for loc in res_us['detected_locations'])
    assert res_us['privacy_risk'] == 'high'

def test_grammar_checker_rules():
    # Repeated words & double spaces & missing capitalization
    text = "this is the the test text with  double spaces."
    results = check_grammar(text)
    assert results['total_errors'] >= 3
    assert any('Repeated word' in err for err in results['critical_errors'])
    assert any('double spaces' in err for err in results['minor_errors'])
    assert any('lowercase' in err for err in results['minor_errors'])

def test_groq_json_parsing():
    raw_fenced = '```json\n{"name": "Jane Doe", "skills": ["Python"]}\n```'
    parsed = _try_parse_json(raw_fenced)
    assert parsed == {"name": "Jane Doe", "skills": ["Python"]}
    
    raw_plain = '{"job_title": "Backend Dev", "required_skills": ["Go"]}'
    assert _try_parse_json(raw_plain) == {"job_title": "Backend Dev", "required_skills": ["Go"]}

def test_component_maxima_config():
    assert COMPONENT_MAXIMA['formatting'] == 20.0
    assert COMPONENT_MAXIMA['keywords'] == 25.0
    assert COMPONENT_MAXIMA['content'] == 25.0
    assert COMPONENT_MAXIMA['skill_validation'] == 15.0
    assert COMPONENT_MAXIMA['ats_compatibility'] == 15.0
    assert sum(COMPONENT_MAXIMA.values()) == 100.0
