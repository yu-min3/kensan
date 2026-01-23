"""FastAPI application for Kensan AI service."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from kensan_ai.api import router
from kensan_ai.config import get_settings
from kensan_ai.db import get_pool, close_pool


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifecycle."""
    # Startup: Initialize DB pool
    await get_pool()
    yield
    # Shutdown: Close DB pool
    await close_pool()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Kensan AI",
        description="AI service for Kensan learning management app",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes with /api/v1 prefix for frontend compatibility
    app.include_router(router, prefix="/api/v1")

    # Root-level health endpoint for Docker healthcheck
    @app.get("/health")
    async def root_health():
        return {"status": "ok", "version": "0.1.0"}

    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "kensan_ai.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
