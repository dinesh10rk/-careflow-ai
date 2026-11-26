"""Async MongoDB connection management (PyMongo Async API)."""

import logging
from typing import Optional

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.config import get_settings

logger = logging.getLogger("careflow.db")

_client: Optional[AsyncMongoClient] = None


class DatabaseNotConfigured(Exception):
    """Raised when MONGODB_URI is missing."""


async def connect_to_database() -> None:
    """Create the client. Does not raise if Atlas is unreachable; /health reports status."""
    global _client
    settings = get_settings()
    if not settings.mongodb_uri:
        logger.warning("MONGODB_URI is not set; database features are unavailable.")
        return
    _client = AsyncMongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        appname="careflow-ai",
    )
    logger.info("MongoDB client created.")


async def close_database_connection() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
        logger.info("MongoDB client closed.")


def get_database() -> AsyncDatabase:
    if _client is None:
        raise DatabaseNotConfigured("Database is not configured.")
    return _client[get_settings().mongodb_db_name]


async def ping_database() -> dict:
    """Return connectivity status without leaking connection details."""
    if _client is None:
        return {"status": "not_configured"}
    try:
        await _client.admin.command("ping")
        return {"status": "connected", "database": get_settings().mongodb_db_name}
    except Exception as exc:  # noqa: BLE001 - report type only, never the URI
        logger.error("MongoDB ping failed: %s", type(exc).__name__)
        return {"status": "unreachable", "error_type": type(exc).__name__}
