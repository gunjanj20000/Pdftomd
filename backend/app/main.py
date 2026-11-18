import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import OUTPUTS_DIR, UPLOADS_DIR
from app.database import init_db
from app.routers import chapters, export, jobs, markdown, projects, settings, websocket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pdftomd")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database
    logger.info("Initializing PDF Book to Markdown Studio database...")
    init_db()
    yield
    logger.info("Shutting down PDF Book to Markdown Studio...")


app = FastAPI(
    title="PDF Book to Markdown Studio API",
    description="High-fidelity PDF textbook & manual chapter conversion using PyMuPDF4LLM",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local dev and remote clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(projects.router)
app.include_router(chapters.router)
app.include_router(jobs.router)
app.include_router(markdown.router)
app.include_router(export.router)
app.include_router(settings.router)
app.include_router(websocket.router)

# Mount outputs directory so frontend can render extracted images
if OUTPUTS_DIR.exists():
    app.mount("/api/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PDF Book to Markdown Studio",
        "version": "1.0.0",
    }


# Frontend static files serving (if built)
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
