import pytest
from pathlib import Path
from app.models import ConversionSettingsModel
from app.services.converter import convert_chapter_to_markdown
from app.services.export_service import create_export_zip, generate_book_readme, generate_metadata_json
from tests.sample_generator import create_rich_media_pdf


def test_convert_chapter_rich_media(tmp_path):
    pdf = tmp_path / "rich.pdf"
    create_rich_media_pdf(pdf)

    out_dir = tmp_path / "output"
    chapter = {
        "chapter_num": 1,
        "title": "Embedded Diagrams and Data",
        "start_page": 1,
        "end_page": 1,
    }

    settings = ConversionSettingsModel(
        extract_images=True,
        image_format="png",
        min_image_dimension=30,
        preserve_headings=True,
        preserve_tables=True,
    )

    res = convert_chapter_to_markdown(
        pdf_path=pdf,
        chapter=chapter,
        project_output_dir=out_dir,
        settings=settings,
    )

    assert res["chapter_num"] == 1
    assert Path(res["filepath"]).exists()
    assert res["filesize"] > 0

    with open(res["filepath"], "r", encoding="utf-8") as f:
        content = f.read()
        assert "EMBEDDED DIAGRAMS" in content.upper()


def test_export_zip_creation(tmp_path):
    out_dir = tmp_path / "export_proj"
    chapters_dir = out_dir / "chapters"
    images_dir = out_dir / "images"
    chapters_dir.mkdir(parents=True)
    images_dir.mkdir(parents=True)

    dummy_md = chapters_dir / "001_Introduction.md"
    dummy_md.write_text("# Chapter 1: Introduction\nSample content")

    project = {
        "id": "p_test",
        "title": "Test Book",
        "author": "Author A",
        "filename": "test.pdf",
        "filesize": 1024,
        "page_count": 10,
        "created_at": "2026-01-01T00:00:00Z",
    }
    chapters = [
        {
            "chapter_num": 1,
            "title": "Introduction",
            "start_page": 1,
            "end_page": 10,
            "page_count": 10,
            "markdown_path": str(dummy_md),
            "markdown_size": 100,
            "image_count": 0,
        }
    ]

    zip_file = create_export_zip(project, chapters, {}, out_dir)
    assert zip_file.exists()
    assert zip_file.stat().st_size > 100
    assert (out_dir / "README.md").exists()
    assert (out_dir / "book_metadata.json").exists()
