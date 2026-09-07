"""Cluster AI summary — Gemini 1.5/2.0 Flash natural-language rollup of child
complaints (BUILD.md §1.2 flyout). Falls back to a deterministic template in
MOCK_AI mode."""
import re

from app.core.config import settings


def generate_cluster_summary(cluster, category: str) -> str:
    texts = [
        f"Cluster: {cluster.title}. "
        f"{cluster.complaint_count} report(s) at approx "
        f"({float(cluster.latitude):.5f}, {float(cluster.longitude):.5f}). "
        f"Severity {cluster.severity_score}/5, impact {cluster.impact_score}/5, "
        f"status {cluster.status}."
    ]
    prompt = (
        "Summarise this campus issue cluster for an administrator in 2-3 "
        "sentences: what is happening, how many people reported it, and why "
        "it matters. No markdown.\n\n" + "\n".join(texts)
    )

    if settings.MOCK_AI or not settings.GEMINI_API_KEY:
        return (
            f"{cluster.complaint_count} report(s) of \"{cluster.title}\" "
            f"({category}). Peak severity {cluster.severity_score}/5 with impact "
            f"{cluster.impact_score}/5 — currently {cluster.status}."
        )

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        return re.sub(r"```[a-z]*|```", "", response.text).strip()
    except Exception:
        return (
            f"{cluster.complaint_count} report(s) of \"{cluster.title}\" "
            f"({category}). Peak severity {cluster.severity_score}/5 — "
            f"currently {cluster.status}."
        )
