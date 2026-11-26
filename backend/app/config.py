"""Typed application settings loaded from environment variables / .env file."""

from enum import Enum
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AIMode(str, Enum):
    AUTO = "auto"
    DEMO = "demo"
    LIVE = "live"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    mongodb_uri: str = Field(default="", repr=False)  # repr=False keeps it out of logs
    mongodb_db_name: str = "careflow_ai"

    # AI
    ai_mode: AIMode = AIMode.AUTO
    openai_api_key: str = Field(default="", repr=False)
    openai_model: str = "gpt-4o-mini"

    # CORS (comma-separated string in the env file)
    cors_origins: str = "http://localhost:5173"

    # App
    app_env: str = "development"

    @field_validator("mongodb_uri", "openai_api_key", mode="before")
    @classmethod
    def _strip(cls, value):
        return value.strip() if isinstance(value, str) else value

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]
        if "*" in origins:
            raise ValueError("Wildcard CORS origin is not allowed; list explicit origins.")
        return origins

    @property
    def has_openai_key(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def effective_ai_mode(self) -> str:
        """Returns 'live' or 'demo' - what the app will actually do right now."""
        if self.ai_mode == AIMode.DEMO:
            return "demo"
        if self.ai_mode == AIMode.LIVE:
            if not self.has_openai_key:
                raise RuntimeError("AI_MODE=live but OPENAI_API_KEY is not set.")
            return "live"
        return "live" if self.has_openai_key else "demo"


@lru_cache
def get_settings() -> Settings:
    return Settings()
