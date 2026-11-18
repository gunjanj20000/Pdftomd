import json
from pathlib import Path
from app.services.quality_auditor import audit_chapter_markdown, audit_project_document
from app.services.ai_export_service import build_ai_rag_bundle, format_ai_frontmatter, strip_markdown_to_plain_text
from app.models import ConversionSettingsModel
from fastapi.testclient import TestClient
from app.main import app
from tests.sample_generator import create_bookmarked_pdf

client = TestClient(app)


def test_quality_auditor_detects_issues(tmp_path):
    md_file = tmp_path / "bad_chapter.md"
    images_dir = tmp_path / "images"
    images_dir.mkdir(parents=True)

    # Content with:
    # 1. Broken image link (missing on disk)
    # 2. Malformed table (3 columns in header, 2 in row)
    # 3. Heading without space
    # 4. Short content
    content = """#Ch.1 Intro
This is short.
![missing](images/nonexistent_image.png)

| Col 1 | Col 2 | Col 3 |
|---|---|---|
| Row 1 | Row 2 |
"""
    md_file.write_text(content, encoding="utf-8")

    chapter = {"id": "c1", "chapter_num": 1, "title": "Intro", "page_count": 2}
    result = audit_chapter_markdown(md_file, images_dir, chapter)

    assert result["score"] < 100
    assert result["status"] in ("needs_review", "errors_found")

    categories = [i["category"] for i in result["issues"]]
    assert "broken_image" in categories
    assert "malformed_table" in categories
    assert "heading_syntax" in categories


def test_ai_export_bundle_generation(tmp_path):
    out_dir = tmp_path / "proj_out"
    chapters_dir = out_dir / "chapters"
    images_dir = out_dir / "images"
    chapters_dir.mkdir(parents=True)
    images_dir.mkdir(parents=True)

    md_path = chapters_dir / "001_Introduction.md"
    md_path.write_text("# Chapter 1: Introduction\n\nThis is a sample document for RAG testing.\n\n| A | B |\n|---|---|\n| 1 | 2 |")

    project = {
        "id": "p_ai",
        "title": "Machine Learning Primer",
        "author": "Alan Turing",
        "filename": "ml_primer.pdf",
    }
    chapters = [
        {
            "id": "ch1",
            "chapter_num": 1,
            "title": "Introduction",
            "start_page": 1,
            "end_page": 5,
            "page_count": 5,
            "markdown_path": str(md_path),
        }
    ]

    zip_path = build_ai_rag_bundle(project, chapters, out_dir)
    assert zip_path.exists()

    ai_dir = out_dir / "Machine Learning Primer_AI_RAG"
    assert (ai_dir / "manifest.json").exists()
    assert (ai_dir / "documents.jsonl").exists()
    assert (ai_dir / "notebooklm_ready" / "001_Introduction.md").exists()
    assert (ai_dir / "clean_text" / "001_Introduction.txt").exists()

    # Verify frontmatter in notebooklm markdown
    nb_content = (ai_dir / "notebooklm_ready" / "001_Introduction.md").read_text(encoding="utf-8")
    assert "---" in nb_content
    assert 'author: "Alan Turing"' in nb_content
    assert 'page_range: "1-5"' in nb_content


def test_selective_reconversion_api(tmp_path):
    pdf = tmp_path / "book.pdf"
    create_bookmarked_pdf(pdf)

    # Upload
    with open(pdf, "rb") as f:
        res = client.post("/api/projects/upload", files={"files": ("book.pdf", f, "application/pdf")})
    project_id = res.json()[0]["id"]

    # Detect chapters
    client.post(f"/api/projects/{project_id}/chapters/detect", json={"method": "bookmarks"})
    chapters = client.get(f"/api/projects/{project_id}/chapters").json()
    first_ch_id = chapters[0]["id"]

    # Selectively reconvert ONLY chapter 1 with custom table_format='html'
    reconv_res = client.post(
        f"/api/projects/{project_id}/chapters/{first_ch_id}/reconvert",
        json={"table_format": "html", "extract_images": True},
    )
    assert reconv_res.status_code == 200
    updated = reconv_res.json()
    assert updated["id"] == first_ch_id
    assert updated["status"] == "completed"

    # Check that Quality Audit endpoint works
    audit_res = client.get(f"/api/projects/{project_id}/quality-audit")
    assert audit_res.status_code == 200
    report = audit_res.json()
    assert "overall_score" in report
    assert "chapters" in report

    # Check that AI RAG export endpoints work
    ai_zip_res = client.get(f"/api/projects/{project_id}/export/ai-rag-zip")
    assert ai_zip_res.status_code == 200
    assert ai_zip_res.headers["content-type"] == "application/zip"
