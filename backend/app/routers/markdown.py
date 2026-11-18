import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.database import get_db, utcnow_str
from app.models import MarkdownContentResponse, MarkdownUpdateRequest
from app.services.export_service import generate_combined_markdown

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects/{project_id}", tags=["markdown"])


@router.get("/chapters/{chapter_id}/markdown", response_model=MarkdownContentResponse)
def get_chapter_markdown(project_id: str, chapter_id: str):
    """Retrieves the Markdown content of a converted chapter."""
    conn = get_db()
    ch = conn.execute(
        "SELECT * FROM chapters WHERE id = ? AND project_id = ?", (chapter_id, project_id)
    ).fetchone()
    conn.close()

    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")

    md_path = ch["markdown_path"]
    if not md_path or not Path(md_path).exists():
        raise HTTPException(status_code=404, detail="Markdown file has not been generated for this chapter yet.")

    try:
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read markdown file: {str(e)}")

    return MarkdownContentResponse(
        chapter_id=chapter_id,
        title=ch["title"],
        content=content,
        file_path=md_path,
        file_size=Path(md_path).stat().st_size,
    )


@router.put("/chapters/{chapter_id}/markdown", response_model=MarkdownContentResponse)
def update_chapter_markdown(project_id: str, chapter_id: str, payload: MarkdownUpdateRequest):
    """Saves updated Markdown text directly to disk."""
    conn = get_db()
    ch = conn.execute(
        "SELECT * FROM chapters WHERE id = ? AND project_id = ?", (chapter_id, project_id)
    ).fetchone()

    if not ch:
        conn.close()
        raise HTTPException(status_code=404, detail="Chapter not found")

    md_path = ch["markdown_path"]
    if not md_path:
        conn.close()
        raise HTTPException(status_code=400, detail="Chapter does not have a designated markdown path.")

    target = Path(md_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(target, "w", encoding="utf-8") as f:
            f.write(payload.content)
        new_size = target.stat().st_size
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to save markdown: {str(e)}")

    now = utcnow_str()
    with conn:
        conn.execute(
            "UPDATE chapters SET markdown_size = ?, updated_at = ? WHERE id = ?",
            (new_size, now, chapter_id),
        )
    conn.close()

    return MarkdownContentResponse(
        chapter_id=chapter_id,
        title=ch["title"],
        content=payload.content,
        file_path=str(target),
        file_size=new_size,
    )


@router.get("/combined-markdown")
def get_combined_markdown(project_id: str):
    """Retrieves single concatenated Markdown for the entire book."""
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

    ch_list = [dict(c) for c in chapters]
    out_dir = Path(proj["output_dir"])
    combined_path = generate_combined_markdown(dict(proj), ch_list, out_dir)

    with open(combined_path, "r", encoding="utf-8") as f:
        content = f.read()

    return {"project_id": project_id, "title": proj["title"], "content": content}
