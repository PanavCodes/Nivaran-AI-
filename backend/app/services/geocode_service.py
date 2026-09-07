"""Nominatim reverse geocoding — BUILD.md §1.3 technician work-order cards."""
import httpx
from loguru import logger

_UA = {"User-Agent": "NivaranAI/1.0 (campusathon-2026)"}


def reverse_geocode(latitude: float, longitude: float) -> str:
    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"format": "json", "lat": latitude, "lon": longitude},
            headers=_UA,
            timeout=6.0,
        )
        data = resp.json()
        addr = data.get("display_name")
        return addr if addr else f"{latitude:.5f}, {longitude:.5f}"
    except Exception as exc:
        logger.warning(f"Reverse geocode failed: {exc}")
        return f"{latitude:.5f}, {longitude:.5f}"
