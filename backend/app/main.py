"""PatientTriage.ai — FastAPI Backend Entry Point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import create_tables
from app.db.seed import seed_database
from app.api import patients, decisions, staff, audit, system
from app.ws import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and seed data. Shutdown: cleanup."""
    await create_tables()
    await seed_database()
    print("✅ Database initialized and seeded.")
    yield
    print("🛑 Shutting down.")


app = FastAPI(
    title="PatientTriage.AI",
    description="Emergency Department Triage Decision-Support Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API routes
app.include_router(patients.router, prefix="/api/v1")
app.include_router(decisions.router, prefix="/api/v1")
app.include_router(staff.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(system.router, prefix="/api/v1")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time nurse station sync."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client pings
            data = await websocket.receive_text()
            # Echo back heartbeat
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
async def root():
    return {
        "service": "PatientTriage.AI Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }
