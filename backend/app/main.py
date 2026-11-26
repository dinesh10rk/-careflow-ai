"""CareFlow AI - FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.database.connection import (
    DatabaseNotConfigured,
    close_database_connection,
    connect_to_database,
)
from app.routes import health

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("careflow")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_to_database()
    yield
    await close_database_connection()


def error_body(code: str, message: str, details=None) -> dict:
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CareFlow AI API",
        description=(
            "Administrative workflow assistant for GP clinics. "
            "Fictional demonstration data only. AI output is a draft requiring staff review."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        # Return field locations and messages only - never echo submitted values.
        details = [{"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()]
        return JSONResponse(status_code=422, content=error_body("validation_error", "Invalid request data.", details))

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(_: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content=error_body("http_error", str(exc.detail)))

    @app.exception_handler(DatabaseNotConfigured)
    async def db_missing_handler(_: Request, __: DatabaseNotConfigured):
        return JSONResponse(
            status_code=503,
            content=error_body("database_unavailable", "The database is not configured or reachable."),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(_: Request, exc: Exception):
        logger.error("Unhandled error: %s", type(exc).__name__)  # type only; no payloads
        return JSONResponse(status_code=500, content=error_body("internal_error", "An unexpected error occurred."))

    app.include_router(health.router)
    return app


app = create_app()
