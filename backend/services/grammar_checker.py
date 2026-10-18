import re
from typing import Dict, List

def check_grammar(text: str) -> Dict:
    """
    Lightweight rule-based grammar and text quality checker:
    - Repeated words (e.g., 'the the', 'in in')
    - Excessive / double spaces within sentences
    - Missing capitalization at sentence beginnings
    - Repeated punctuation (e.g., ',,', '??')
    """
    if not text or not text.strip():
        return {
            'total_errors': 0,
            'critical_errors': [],
            'moderate_errors': [],
            'minor_errors': [],
            'penalty_applied': 0.0,
            '_component_status': 'available',
        }

    critical_errors: List[str] = []
    moderate_errors: List[str] = []
    minor_errors: List[str] = []

    # 1. Repeated words: case-insensitive word duplication
    repeated_word_matches = re.finditer(r'\b([a-zA-Z]{2,})\s+\1\b', text, re.IGNORECASE)
    for match in repeated_word_matches:
        word = match.group(1)
        critical_errors.append(f"Repeated word detected: '{word} {word}'")

    # 2. Repeated punctuation (e.g., ,, or .. or !!)
    repeated_punct_matches = re.finditer(r'([,\?!;]){2,}', text)
    for match in repeated_punct_matches:
        moderate_errors.append(f"Repeated punctuation: '{match.group()}'")

    # 3. Double spaces within non-empty lines
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    double_space_count = sum(1 for line in lines if re.search(r'[^\S\r\n]{2,}', line))
    if double_space_count > 0:
        minor_errors.append(f"{double_space_count} line(s) contain inconsistent double spaces")

    # 4. Missing capitalization at start of sentences / bullet points
    uncapitalized_count = 0
    for line in lines:
        cleaned_line = re.sub(r'^[•\-\*\◦\d\.\s]+', '', line).strip()
        if cleaned_line and cleaned_line[0].islower() and not cleaned_line.startswith(('http', 'www', 'github', 'linkedin', 'mailto', 'npm', 'pip', 'apt')):
            uncapitalized_count += 1
    if uncapitalized_count > 0:
        minor_errors.append(f"{uncapitalized_count} lines/bullets start with lowercase letters")

    # Penalty calculation (capped at 10.0)
    penalty = min(
        10.0,
        len(critical_errors) * 2.0 + len(moderate_errors) * 1.0 + len(minor_errors) * 0.5
    )

    total_errors = len(critical_errors) + len(moderate_errors) + len(minor_errors)

    return {
        'total_errors': total_errors,
        'critical_errors': critical_errors,
        'moderate_errors': moderate_errors,
        'minor_errors': minor_errors,
        'penalty_applied': round(penalty, 1),
        '_component_status': 'available',
    }
