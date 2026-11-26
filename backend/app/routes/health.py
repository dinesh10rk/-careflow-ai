from fastapi import APIRouter

from app.config import get_settings
from app.database.connection import ping_database

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    db = await ping_database()

    try:
        ai_mode = settings.effective_ai_mode
        ai_note = (
            "Live AI enabled."
            if ai_mode == "live"
            else "Demo Mode: sample outputs only, not live AI."
        )
    except RuntimeError as exc:
        ai_mode, ai_note = "misconfigured", str(exc)

    overall = "ok" if db["status"] == "connected" else "degraded"
    return {
        "status": overall,
        "environment": settings.app_env,
        "database": db,
        "ai": {"mode": ai_mode, "note": ai_note},
    }
