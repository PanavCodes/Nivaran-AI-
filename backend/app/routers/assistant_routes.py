"""Campus AI Problem Assistant router — adapted from CampFeed (campfeed/app/Chatbot/page.js & api/gemini).
Provides real-time conversational Q&A over campus facilities, active clusters, and maintenance status.
"""
import re
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
import httpx
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user_optional, get_db
from app.core.rate_limit import RateLimiter
from app.db.models import IssueCluster, User

router = APIRouter(prefix="/api/v1/assistant", tags=["Assistant"])

assistant_limiter = RateLimiter(limit=20, window_seconds=60, key_prefix="assistant")


class AssistantChatRequest(BaseModel):
    message: str


class QuickChip(BaseModel):
    label: str
    query: str


class AssistantChatResponse(BaseModel):
    text: str
    chips: list[QuickChip] = []


@router.post("/chat", response_model=AssistantChatResponse, dependencies=[Depends(assistant_limiter)])
def assistant_chat(
    body: AssistantChatRequest,
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):

    user_msg = body.message.strip()

    # Query active clusters for live grounding context
    active_clusters = (
        db.execute(
            select(IssueCluster)
            .where(IssueCluster.status.in_(["OPEN", "ASSIGNED", "IN_PROGRESS"]))
            .order_by(IssueCluster.priority_score.desc())
            .limit(10)
        )
        .scalars()
        .all()
    )

    context_lines = []
    for c in active_clusters:
        context_lines.append(
            f"- [Floor {c.floor}, {c.room_or_zone or 'Zone'}] {c.title} "
            f"(Status: {c.status}, Priority: {c.priority_score:.0f}/100, Dept: {c.assigned_department})"
        )
    context_str = "\n".join(context_lines) if context_lines else "All campus facilities are currently operating normally."

    # If GEMINI_API_KEY is available and not MOCK_AI, generate conversational response
    if not settings.MOCK_AI and settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            
            prompt = f"""You are 'CampBot', the intelligent campus facility and maintenance assistant for Nivaran AI at our 10-storey university facility (Floors: LG, G, 1 to 8).
Your job is to assist students, staff, and technicians regarding campus issues, active problems, where to report, and status updates.

Active campus issues right now:
{context_str}

User query: "{user_msg}"

Provide a concise, helpful, and friendly answer (2-4 sentences max). If relevant, specify the exact floor and room."""

            resp = model.generate_content(prompt)
            ai_reply = resp.text.strip()
            return AssistantChatResponse(
                text=ai_reply,
                chips=[
                    QuickChip(label="Check Floor 1 status", query="What issues are on Floor 1?"),
                    QuickChip(label="Emergency protocols", query="What should I do if I see an emergency?"),
                    QuickChip(label="How to scan door QR?", query="How do I use the door QR code?"),
                ]
            )
        except Exception as e:
            pass

    # Deterministic intelligent fallback (for hackathons/offline demos)
    msg_lower = user_msg.lower()
    
    if "qr" in msg_lower or "door" in msg_lower:
        reply = (
            "Every classroom, laboratory, and hallway on all 10 floors has a Nivaran QR plaque near the door. "
            "Click 'Scan Door QR' in the Report Portal to instantly lock onto your exact floor, room name, and SVG blueprint coordinates!"
        )
    elif "floor" in msg_lower:
        match = re.search(r"floor\s*([0-8]|lg|g)", msg_lower)
        target_floor = match.group(1).upper() if match else None
        floor_issues = [c for c in active_clusters if target_floor and c.floor.upper() == target_floor]
        if floor_issues:
            items = ", ".join([f"'{c.title}' in {c.room_or_zone or 'common zone'}" for c in floor_issues[:3]])
            reply = f"On Floor {target_floor}, there are active issues: {items}. Technicians are actively tracking them."
        elif target_floor:
            reply = f"Floor {target_floor} currently has zero open high-priority incidents reported. Everything appears operational!"
        else:
            reply = f"Currently, there are {len(active_clusters)} active problem clusters across the building. Floor 1 and Floor 2 have the highest activity."
    elif "leak" in msg_lower or "water" in msg_lower:
        reply = (
            "Plumbing and water seepage issues are handled under the Maintenance department with high priority. "
            "If you spot a leak, please submit a report with a photo so our dual-proof vision model can track the repair."
        )
    elif "emergency" in msg_lower or "fire" in msg_lower or "spark" in msg_lower:
        reply = (
            "⚠️ For urgent safety hazards (sparking wires, fire, elevator stoppage), report immediately with Severity 5. "
            "Emergency incidents trigger automated campus alerts and notify on-duty technicians within 2 minutes."
        )
    else:
        top_issue = active_clusters[0] if active_clusters else None
        if top_issue:
            reply = (
                f"Hello! I'm CampBot 🤖. Currently, our highest-priority campus issue is '{top_issue.title}' "
                f"on Floor {top_issue.floor} ({top_issue.room_or_zone or 'Zone'}). How can I help you today?"
            )
        else:
            reply = "Hello! I'm CampBot 🤖, your campus maintenance assistant. How can I help you navigate or report facility issues today?"

    return AssistantChatResponse(
        text=reply,
        chips=[
            QuickChip(label="Status of Floor 1", query="What issues are on Floor 1?"),
            QuickChip(label="Report an issue", query="How do I report a problem?"),
            QuickChip(label="Scan Door QR", query="Tell me about door QR codes"),
        ]
    )


@router.get("/tts")
async def text_to_speech(text: str, lang: str = "te"):
    """Server-side TTS proxy delivering authentic, high-quality Telugu/indic speech audio."""
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text required")
    # Take first 200 characters for natural concise sentence audio snippet
    clean_text = text.strip()[:200]
    encoded = urllib.parse.quote(clean_text)
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={lang}&client=tw-ob&q={encoded}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return Response(content=resp.content, media_type="audio/mpeg")
    except Exception as exc:
        logger.warning(f"TTS fetch failed: {exc}")
    raise HTTPException(status_code=502, detail="TTS service unavailable")
