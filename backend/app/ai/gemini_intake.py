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
You are the intake AI for Nivaran — an indoor campus problem intelligence platform.
Analyse the user complaint text and the attached image (if any). The building consists of floors: LG, G, 1, 2, 3, 4, 5, 6, 7, 8.

Return ONLY valid JSON with this exact schema:
{
  "category": "<IT_SUPPORT|MAINTENANCE|HOUSEKEEPING|FACILITIES|ADMINISTRATION>",
  "severity": <integer 1–5>,
  "impact": <integer 1–5>,
  "nsfw": <true|false>,
  "ocr_text": "<any visible text in the image, or null>",
  "ai_title": "<concise 6–10 word title for this issue>",
  "reasoning": "<one-sentence explanation of your categorization>",
  "floor": "<LG|G|1|2|3|4|5|6|7|8 or null if not detected>",
  "room_or_zone": "<name of room, lab, or area if mentioned/detected, e.g. Hardware Lab 1, Dean Office, or null>"
}

Rules:
- severity 5 = structural danger / safety risk; 1 = cosmetic / minor inconvenience.
- impact 5 = affects 100+ students daily; 1 = affects 1–2 people.
- If nsfw is true, set all other fields to null.
- Identify the floor and room/area whenever visible in OCR or mentioned in complaint.
- Never add markdown fences or extra text outside the JSON object.
"""


def _keyword_fallback(description: str) -> IntakeResponse:
    """MOCK_AI offline failsafe with indoor floor and room detection."""
    cat = "MAINTENANCE"
    if re.search(
        r"\b(leak\w*|flood\w*|dripp?\w*|pipes?|elevators?|lifts?|escalators?|"
        r"short[- ]circuits?|wires?|plaster|cracks?|bulbs?|tubes?|lights?|"
        r"stains?|seep\w*|damp\w*|water logging|wet floor|wet ceiling)\b",
        description,
        re.I,
    ):
        cat = "MAINTENANCE"
    elif re.search(r"\b(wifi|wi-?fi|internet|computers?|printers?|network|projectors?|passwords?|login)\b", description, re.I):
        cat = "IT_SUPPORT"
    elif re.search(r"\b(clean\w*|garbage|wastes?|litter|dustbins?|trash|sanitat\w*)\b", description, re.I):
        cat = "HOUSEKEEPING"
    elif re.search(r"\b(admin\w*|documents?|certificates?|forms?|id cards?|registrar|fees?)\b", description, re.I):
        cat = "ADMINISTRATION"
    elif re.search(r"\b(labs?|laborator\w*|equipment|facilit(y|ies)|halls?|canteens?|classrooms?|hostels?)\b", description, re.I):
        cat = "FACILITIES"

    # Detect floor from text
    detected_floor = None
    if re.search(r"\b(lower ground|lg|basement)\b", description, re.I):
        detected_floor = "LG"
    elif re.search(r"\b(ground floor|ground|g floor)\b", description, re.I):
        detected_floor = "G"
    else:
        m_fl = re.search(r"\b(?:floor\s*([1-8])|([1-8])(?:st|nd|rd|th)?\s*floor|room\s*([1-8])\d\d)\b", description, re.I)
        if m_fl:
            detected_floor = m_fl.group(1) or m_fl.group(2) or m_fl.group(3)

    # Detect room
    detected_room = None
    m_rm = re.search(r"\b(room\s*\d+|lab\s*\d+|hardware lab\s*\d+|faculty area\s*\d+|dean office|exam\s*\d+|pantry|services|lift)\b", description, re.I)
    if m_rm:
        detected_room = m_rm.group(0).title()

    return IntakeResponse(
        category=cat, severity=3, impact=3,
        nsfw=False, ocr_text=None,
        ai_title=description[:60],
        reasoning="MOCK_AI mode — indoor keyword fallback active.",
        floor=detected_floor,
        room_or_zone=detected_room,
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


def recommend_work_order_checklist(category: str, title: str = "", description: str = "") -> dict:
    """Adapted from CMMS (Atlas CMMS / Grashjs/cmms checklists and taskBases models).
    Generates required technician tools, replacement parts, and safety precautions."""
    checklist = {
        "IT_SUPPORT": {
            "estimated_hours": 1.5,
            "safety_gear": ["Anti-static wrist strap", "Rubber sole footwear"],
            "required_tools": ["RJ45 crimping tool", "Network cable tester", "Precision screwdriver set", "Digital multimeter"],
            "recommended_parts": ["Cat6 patch cord (5m)", "VGA/HDMI display converter", "Replacement SMPS power supply"],
            "procedure": ["Verify power delivery and cable connectivity", "Check switch port & IP lease", "Inspect hardware thermal state", "Perform end-to-end diagnostic"]
        },
        "MAINTENANCE": {
            "estimated_hours": 2.5,
            "safety_gear": ["Insulated electrician gloves (1000V)", "Safety goggles", "Slip-resistant work boots"],
            "required_tools": ["Adjustable pipe wrench", "Teflon sealing tape", "Digital clamp meter", "Cordless drill", "Step ladder"],
            "recommended_parts": ["20mm PVC pipe coupling", "E27 18W LED lamp & driver", "Copper wire roll 2.5 sq mm", "Silicone waterproof sealant"],
            "procedure": ["Isolate local circuit breaker / main water shutoff valve", "Inspect leak source or electrical junction", "Replace damaged pipe segment / fuse unit", "Pressure test and restore power/water"]
        },
        "HOUSEKEEPING": {
            "estimated_hours": 0.75,
            "safety_gear": ["Heavy-duty nitrile gloves", "Splash-resistant apron", "N95 safety mask"],
            "required_tools": ["Wet/dry industrial vacuum", "Microfiber flat mop", "Wet-floor safety cones", "Disinfectant atomizer"],
            "recommended_parts": ["Bio-neutral sanitizing solution 5L", "Heavy duty bin liners", "Spill absorbent granules"],
            "procedure": ["Deploy yellow wet-floor hazard signage", "Clear liquid hazard with absorbent compound", "Mop with hospital-grade disinfectant", "Ventilate area"]
        },
        "FACILITIES": {
            "estimated_hours": 2.0,
            "safety_gear": ["Hard hat", "Protective eyewear", "Cut-resistant gloves"],
            "required_tools": ["Allen key set", "Claw hammer & pry bar", "Impact driver", "Laser distance measurer"],
            "recommended_parts": ["Heavy-duty door hinge & hydraulic closer", "M6 anchor bolts", "Acoustic ceiling tile (600x600mm)"],
            "procedure": ["Inspect structural alignment of fixture/door/tile", "Secure framing anchors", "Re-tighten hinge pins & balance door closer", "Verify clearance"]
        },
        "ADMINISTRATION": {
            "estimated_hours": 1.0,
            "safety_gear": [],
            "required_tools": ["Official department stamp", "Barcode scanner", "Document scanner"],
            "recommended_parts": ["University official letterhead", "Tamper-evident verification seals"],
            "procedure": ["Verify student ID against registrar database", "Draft official incident rectification memo", "Submit for Dean/Registrar signoff"]
        }
    }
    return checklist.get(category.upper(), checklist["MAINTENANCE"])

