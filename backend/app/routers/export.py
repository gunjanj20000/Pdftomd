import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.database import get_db
from app.services.export_service import (
    create_export_zip,
    generate_book_readme,
    generate_combined_markdown,
    generate_metadata_json,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects/{project_id}/export", tags=["export"])


@router.get("/zip")
def download_zip(project_id: str):
    """Generates and serves the complete ZIP bundle for the book."""
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? AND is_selected = 1 ORDER BY chapter_num ASC",
        (project_id,),
    ).fetchall()
    settings = conn.execute(
        "SELECT * FROM conversion_settings WHERE project_id = ?", (project_id,)
    ).fetchone()
    conn.close()

    ch_list = [dict(c) for c in chapters]
    out_dir = Path(proj["output_dir"])
    settings_dict = dict(settings) if settings else {}

    try:
        zip_path = create_export_zip(dict(proj), ch_list, settings_dict, out_dir)
    except Exception as e:
        logger.error(f"Error creating zip for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ZIP archive: {str(e)}")

    if not zip_path.exists():
        raise HTTPException(status_code=500, detail="ZIP archive was not generated.")

    return FileResponse(
        path=str(zip_path),
        filename=zip_path.name,
        media_type="application/zip",
    )


@router.get("/combined")
def download_combined_markdown(project_id: str):
    """Serves the single combined Markdown file for the book."""
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? AND is_selected = 1 ORDER BY chapter_num ASC",
        (project_id,),
    ).fetchall()
    conn.close()

    out_dir = Path(proj["output_dir"])
    combined_path = generate_combined_markdown(dict(proj), [dict(c) for c in chapters], out_dir)

    return FileResponse(
        path=str(combined_path),
        filename=combined_path.name,
        media_type="text/markdown",
    )


@router.get("/metadata")
def download_metadata(project_id: str):
    """Serves book_metadata.json."""
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? AND is_selected = 1 ORDER BY chapter_num ASC",
        (project_id,),
    ).fetchall()
    settings = conn.execute(
        "SELECT * FROM conversion_settings WHERE project_id = ?", (project_id,)
    ).fetchone()
    conn.close()

    out_dir = Path(proj["output_dir"])
    meta_path = generate_metadata_json(
        dict(proj), [dict(c) for c in chapters], dict(settings) if settings else {}, out_dir
    )

    return FileResponse(
        path=str(meta_path),
        filename="book_metadata.json",
        media_type="application/json",
    )


@router.get("/chapter/{chapter_id}")
def download_chapter_markdown(project_id: str, chapter_id: str):
    """Serves an individual chapter's Markdown file."""
    conn = get_db()
    ch = conn.execute(
        "SELECT * FROM chapters WHERE id = ? AND project_id = ?", (chapter_id, project_id)
    ).fetchone()
    conn.close()

    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")

    md_path = ch["markdown_path"]
    if not md_path or not Path(md_path).exists():
        raise HTTPException(status_code=404, detail="Chapter markdown file does not exist.")

    path_obj = Path(md_path)
    return FileResponse(
        path=str(path_obj),
        filename=path_obj.name,
        media_type="text/markdown",
    )


@router.get("/ai-rag-zip")
def download_ai_rag_bundle(project_id: str):
    """
    Builds and downloads a complete AI-Ready knowledge package:
    - manifest.json with chunk definitions & token counts
    - documents.jsonl for vector DBs (Chroma, LangChain, LlamaIndex)
    - notebooklm_ready/ directory with YAML frontmatter headers
    - clean_text/ directory stripped of formatting for embedding
    - images/ directory for multimodal vision queries
    """
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? AND is_selected = 1 ORDER BY chapter_num ASC",
        (project_id,),
    ).fetchall()
    conn.close()

    from app.services.ai_export_service import build_ai_rag_bundle

    out_dir = Path(proj["output_dir"])
    try:
        zip_path = build_ai_rag_bundle(dict(proj), [dict(c) for c in chapters], out_dir)
    except Exception as e:
        logger.error(f"Error building AI RAG bundle: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate AI RAG bundle: {str(e)}")

    return FileResponse(
        path=str(zip_path),
        filename=zip_path.name,
        media_type="application/zip",
    )


@router.get("/documents.jsonl")
def download_documents_jsonl(project_id: str):
    """Serves documents.jsonl for direct vector database ingestion."""
    conn = get_db()
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    chapters = conn.execute(
        "SELECT * FROM chapters WHERE project_id = ? AND is_selected = 1 ORDER BY chapter_num ASC",
        (project_id,),
    ).fetchall()
    conn.close()

    from app.services.ai_export_service import build_ai_rag_bundle

    out_dir = Path(proj["output_dir"])
    build_ai_rag_bundle(dict(proj), [dict(c) for c in chapters], out_dir)

    book_name = proj.get("title", "Book").replace("/", "-").strip()
    jsonl_path = out_dir / f"{book_name}_AI_RAG" / "documents.jsonl"

    if not jsonl_path.exists():
        raise HTTPException(status_code=500, detail="documents.jsonl was not found.")

    return FileResponse(
        path=str(jsonl_path),
        filename=f"{book_name}_documents.jsonl",
        media_type="application/x-jsonlines",
    )

