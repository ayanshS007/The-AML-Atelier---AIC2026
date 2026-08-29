"""Async SQLite Database configuration using SQLAlchemy and aiosqlite.

This module initializes the async database engine, session factory, base declarative model,
and provides helper utilities including table creation and an async session generator for FastAPI dependencies.
"""

from collections.abc import AsyncGenerator
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

# Determine paths relative to the backend root
BACKEND_DIR: Path = Path(__file__).resolve().parent.parent.parent
DATA_DIR: Path = BACKEND_DIR / "data"
DEFAULT_DB_FILE: Path = DATA_DIR / "triage.db"

# Ensure data directory exists on import/init
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Database URL support via environment variable or default local sqlite path
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{DEFAULT_DB_FILE.as_posix()}"
)

# Create async engine with SQLite check_same_thread disabled for async concurrency
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False},
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models."""
    pass


async def create_tables() -> None:
    """Create all database tables defined in ORM models if they do not exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        # Import models so they are registered in Base.metadata
        from app.models.models import (  # noqa: F401
            AuditLog,
            CaptureSession,
            Patient,
            PrehospitalData,
            Staff,
            TimelineEvent,
            TriageDecision,
            VitalsReading,
        )
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
