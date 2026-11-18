import json
import os
import shutil
import zipfile
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def generate_book_readme(
    project: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    output_dir: Path,
) -> Path:
    """Generates a professional README.md with book metadata and chapter index links."""
    title = project.get("title", "Untitled Document")
    author = project.get("author", "Unknown Author")
    filename = project.get("filename", "")
    page_count = project.get("page_count", 0)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    lines = [
        f"# {title}",
        "",
        f"**Author:** {author}  ",
        f"**Original PDF:** `{filename}`  ",
        f"**Total Pages:** {page_count}  ",
        f"**Total Chapters:** {len(chapters)}  ",
        f"**Converted with:** PDF Book to Markdown Studio (PyMuPDF4LLM)  ",
        f"**Conversion Date:** {now_str}  ",
        "",
        "---",
        "",
        "## Table of Contents",
        "",
    ]

    for ch in chapters:
        ch_num = ch["chapter_num"]
        ch_title = ch["title"]
        start_p = ch["start_page"]
        end_p = ch["end_page"]
        pages = ch["page_count"]
        # Find chapter filename if saved
        fname = Path(ch["markdown_path"]).name if ch.get("markdown_path") else f"{ch_num:03d}_{ch_title}.md"
        relative_link = f"chapters/{fname}"
        lines.append(f"{ch_num}. [{ch_title}]({relative_link}) *(Pages {start_p}–{end_p}, {pages} pp.)*")

    lines.extend([
        "",
        "---",
        "",
        "### Project Structure",
        "```",
        f"{title}/",
        "├── README.md",
        "├── book_metadata.json",
        "├── chapters/",
        "│   └── [chapter_files].md",
        "└── images/",
        "    └── [extracted_images]",
        "```",
        "",
        "*Generated automatically by PDF Book to Markdown Studio.*",
    ])

    readme_path = output_dir / "README.md"
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return readme_path


def generate_metadata_json(
    project: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    settings: Optional[Dict[str, Any]],
    output_dir: Path,
) -> Path:
    """Generates book_metadata.json for the export."""
    data = {
        "project": {
            "id": project.get("id"),
            "title": project.get("title"),
            "author": project.get("author"),
            "filename": project.get("filename"),
            "filesize": project.get("filesize"),
            "page_count": project.get("page_count"),
            "has_bookmarks": project.get("has_bookmarks"),
            "created_at": project.get("created_at"),
            "exported_at": datetime.now(timezone.utc).isoformat(),
        },
        "settings": settings or {},
        "chapters": [
            {
                "chapter_num": c["chapter_num"],
                "title": c["title"],
                "start_page": c["start_page"],
                "end_page": c["end_page"],
                "page_count": c["page_count"],
                "level": c.get("level", 1),
                "detection_method": c.get("detection_method", "manual"),
                "markdown_file": Path(c["markdown_path"]).name if c.get("markdown_path") else None,
                "markdown_size": c.get("markdown_size", 0),
                "image_count": c.get("image_count", 0),
            }
            for c in chapters
        ],
    }

    json_path = output_dir / "book_metadata.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return json_path


def generate_combined_markdown(
    project: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    output_dir: Path,
) -> Path:
    """Generates one single combined Markdown file for the entire book."""
    title = project.get("title", "Untitled Document")
    author = project.get("author", "Unknown Author")
    
    parts = [
        f"# {title}\n",
        f"**Author:** {author}\n\n",
        "---\n\n",
    ]

    for ch in chapters:
        md_path = ch.get("markdown_path")
        if md_path and Path(md_path).exists():
            with open(md_path, "r", encoding="utf-8") as f:
                content = f.read()
                # If images are referenced as images/..., keep them or adjust
                parts.append(f"\n\n<!-- Chapter {ch['chapter_num']}: {ch['title']} -->\n\n")
                parts.append(content)
                parts.append("\n\n---\n\n")

    combined_file = output_dir / f"{title}_Complete.md"
    with open(combined_file, "w", encoding="utf-8") as f:
        f.write("".join(parts))

    return combined_file


def create_export_zip(
    project: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    settings: Optional[Dict[str, Any]],
    output_dir: Path,
) -> Path:
    """
    Creates a complete ZIP archive with the structured folder hierarchy:
    Book_Name/
      README.md
      book_metadata.json
      chapters/
      images/
    """
    # 1. Ensure README, metadata JSON, and combined MD exist
    generate_book_readme(project, chapters, output_dir)
    generate_metadata_json(project, chapters, settings, output_dir)
    generate_combined_markdown(project, chapters, output_dir)

    book_name = project.get("title", "Book").replace("/", "-").strip()
    zip_path = output_dir / f"{book_name}_Markdown.zip"

    # Files to exclude from root in zip
    exclude_files = {zip_path.name}

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(output_dir):
            rel_dir = os.path.relpath(root, output_dir)
            for file in files:
                if file in exclude_files or file.endswith(".tmp"):
                    continue
                file_full = Path(root) / file
                # Skip symlinks
                if file_full.is_symlink():
                    continue
                # Store under book_name/ inside zip
                if rel_dir == ".":
                    arcname = os.path.join(book_name, file)
                else:
                    arcname = os.path.join(book_name, rel_dir, file)
                zipf.write(file_full, arcname)

    return zip_path
