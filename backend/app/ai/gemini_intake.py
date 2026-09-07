"""Multi-modal Gemini intake gateway — BUILD.md §3.3 + §6 addendum.

MOCK_AI=true activates the keyword-regex failsafe (demo Wi-Fi contingency).
"""
import os
import base64
import json
import re

from loguru import logger

from app.core.config import settings
from app.schemas.complaint_schemas import IntakeResponse

MOCK_AI = settings.MOCK_AI

INTAKE_PROMPT = """
You are the intake AI for Nivaran — a campus problem intelligence platform.
Analyse the user complaint text and the attached image (if any).

Return ONLY valid JSON with this exact schema:
{
  "category": "<IT_SUPPORT|MAINTENANCE|HOUSEKEEPING|FACILITIES|ADMINISTRATION>",
  "severity": <integer 1–5>,
  "impact": <integer 1–5>,
  "nsfw": <true|false>,
  "ocr_text": "<any visible text in the image, or null>",
  "ai_title": "<concise 6–10 word title for this issue>",
  "reasoning": "<one-sentence explanation of your categorization>"
}

Rules:
- severity 5 = structural danger / safety risk; 1 = cosmetic / minor inconvenience.
- impact 5 = affects 100+ students daily; 1 = affects 1–2 people.
- If nsfw is true, set all other fields to null.
- Never add markdown fences or extra text outside the JSON object.
"""


def _keyword_fallback(description: str) -> IntakeResponse:
    """MOCK_AI offline failsafe — keyword regex fallback."""
    cat = "MAINTENANCE"
    if re.search(r"wifi|internet|computer|printer|network|projector|password|login", description, re.I):
        cat = "IT_SUPPORT"
    elif re.search(r"clean|garbage|waste|litter|dustbin|trash|sanitat", description, re.I):
        cat = "HOUSEKEEPING"
    elif re.search(r"admin|document|certificate|form|id card|registrar|fee", description, re.I):
        cat = "ADMINISTRATION"
    elif re.search(r"lab|equipment|facility|hall|canteen|classroom|hostel", description, re.I):
        cat = "FACILITIES"
    return IntakeResponse(
        category=cat, severity=3, impact=3,
        nsfw=False, ocr_text=None,
        ai_title=description[:60],
        reasoning="MOCK_AI mode — keyword fallback active."
    )


def run_intake(description: str, image_bytes: bytes | None = None) -> IntakeResponse:
    if MOCK_AI or not settings.GEMINI_API_KEY:
        return _keyword_fallback(description)

    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    parts: list = [INTAKE_PROMPT, f"\n\nComplaint text: {description}"]
    if image_bytes:
        parts.append({
            "mime_type": "image/jpeg",
            "data": base64.b64encode(image_bytes).decode()
        })

    response = model.generate_content(parts)
    raw = re.sub(r"```json|```", "", response.text).strip()
    data = json.loads(raw)
    if data.get("nsfw"):
        raise ValueError("NSFW content rejected by intake AI.")
    return IntakeResponse(**data)


def verify_resolution_proof(before_bytes: bytes, after_bytes: bytes) -> dict:
    """Compares the initial damage photo with technician resolution photo
    (BUILD.md §6 addendum — dual-proof close-out, §1.3)."""
    if MOCK_AI or not settings.GEMINI_API_KEY:
        return {
            "verified": True,
            "similarity_score": 0.92,
            "reasoning": "MOCK_AI: Resolved state structurally verified.",
        }

    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    prompt = """
    Compare these two images of a campus facility.
    Image 1 is the 'BEFORE' damage report. Image 2 is the technician's 'AFTER' repair proof.
    Verify if the reported issue has been addressed and the scene represents the same location.
    Return ONLY JSON: {"verified": <bool>, "similarity_score": <float 0-1>, "reasoning": "<str>"}
    """
    response = model.generate_content([
        prompt,
        {"mime_type": "image/jpeg", "data": base64.b64encode(before_bytes).decode()},
        {"mime_type": "image/jpeg", "data": base64.b64encode(after_bytes).decode()}
    ])
    clean_json = re.sub(r"```json|```", "", response.text).strip()
    result = json.loads(clean_json)
    logger.info(f"Dual-proof verification: verified={result.get('verified')} "
                f"score={result.get('similarity_score')}")
    return result
