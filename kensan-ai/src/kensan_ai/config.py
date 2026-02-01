"""Application configuration using pydantic-settings."""

from functools import lru_cache
from typing import Any

from pydantic import computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database (supports both single URL and individual components)
    database_url: str | None = None
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "kensan"
    db_password: str = "kensan"
    db_name: str = "kensan"

    @computed_field
    @property
    def effective_database_url(self) -> str:
        """Get the database URL, constructing from components if not provided."""
        if self.database_url:
            return self.database_url
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    # Anthropic API
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # OpenAI API (for embeddings)
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"

    # Cloudflare R2 Storage
    r2_endpoint: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_bucket: str = "kensan-files"

    # JWT (for verifying tokens from user-service)
    jwt_secret: str = "dev-secret-key-change-in-production"

    # Server
    server_port: int = 8089
    server_env: str = "development"
    host: str = "0.0.0.0"
    debug: bool = False

    # Agent settings
    default_max_turns: int = 10
    default_temperature: float = 0.7

    # OpenTelemetry
    otel_enabled: bool = False
    otel_collector_url: str = "localhost:4318"

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_bool(cls, v: Any) -> bool:
        """Parse debug flag from string or boolean."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes")
        return bool(v)

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Validate critical settings in production environment."""
        if self.server_env == "production":
            if not self.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY is required in production")
            if self.jwt_secret == "dev-secret-key-change-in-production":
                raise ValueError("JWT_SECRET must be changed in production")
        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
