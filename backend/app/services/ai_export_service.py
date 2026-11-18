import json
import os
import re
import shutil
import zipfile
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def strip_markdown_to_plain_text(md_text: str) -> str:
    """Strips Markdown syntax for pure semantic text embedding."""
    # Remove YAML frontmatter if present
    text = re.sub(r"^---[\s\S]*?---\n", "", md_text)
    # Remove image links
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    # Remove standard links [text](url) -> text
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)
    # Remove headers (# Title -> Title)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove bold & italics
    text = re.sub(r"(\*\*|__)(.*?)\1", r"\2", text)
    text = re.sub(r"(\*|_)(.*?)\1", r"\2", text)
    # Clean multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def format_ai_frontmatter(
    chapter: Dict[str, Any],
    project: Dict[str, Any],
    content: str,
) -> str:
    """Prepends standardized YAML frontmatter for RAG & NotebookLM ingestion."""
    # Strip any existing frontmatter first
    clean_body = re.sub(r"^---[\s\S]*?---\n", "", content).strip()

    words = len(re.findall(r"\w+", clean_body))
    est_tokens = int(words * 1.3)

    title = chapter.get("title", f"Chapter {chapter.get('chapter_num')}")
    book_title = project.get("title", "Untitled Book")
    author = project.get("author", "Unknown Author")
    ch_num = chapter.get("chapter_num", 1)
    start_p = chapter.get("start_page", 1)
    end_p = chapter.get("end_page", 1)
    pdf_name = project.get("filename", "")
    chunk_id = f"{project.get('id', 'book')}_ch{ch_num:03d}"

    frontmatter = f"""---
id: "{chunk_id}"
title: "{title}"
book_title: "{book_title}"
author: "{author}"
chapter_number: {ch_num}
page_range: "{start_p}-{end_p}"
start_page: {start_p}
end_page: {end_p}
page_count: {end_p - start_p + 1}
word_count: {words}
estimated_tokens: {est_tokens}
source_pdf: "{pdf_name}"
exported_at: "{datetime.now(timezone.utc).isoformat()}"
---

"""
    return frontmatter + clean_body + "\n"


def build_ai_rag_bundle(
    project: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    output_base_dir: Path,
) -> Path:
    """
    Builds a complete AI-Ready & RAG-Ready distribution:
    Book_Name_AI_RAG/
    ├── manifest.json            # Machine-readable chunk index for RAG engines
    ├── documents.jsonl          # Standard vector database ingestion file
    ├── notebooklm_ready/        # Formatted Markdown with YAML frontmatter
    ├── clean_text/              # Pure plain text for embedding tokenizers
    └── images/                  # High-resolution figures for Multimodal LLMs
    """
    book_name = project.get("title", "Book").replace("/", "-").strip()
    ai_dir = output_base_dir / f"{book_name}_AI_RAG"
    
    notebooklm_dir = ai_dir / "notebooklm_ready"
    clean_text_dir = ai_dir / "clean_text"
    images_target_dir = ai_dir / "images"

    for d in (notebooklm_dir, clean_text_dir, images_target_dir):
        d.mkdir(parents=True, exist_ok=True)

    # Copy extracted images if available
    src_images_dir = output_base_dir / "images"
    if src_images_dir.exists():
        for img_file in src_images_dir.glob("*.*"):
            if img_file.is_file():
                shutil.copy2(img_file, images_target_dir / img_file.name)

    manifest_docs = []
    jsonl_lines = []

    for ch in chapters:
        md_path = ch.get("markdown_path")
        if not md_path or not Path(md_path).exists():
            continue

        with open(md_path, "r", encoding="utf-8") as f:
            raw_content = f.read()

        ch_num = ch["chapter_num"]
        safe_title = re.sub(r'[\\/*?:"<>|]', "", ch["title"])
        safe_title = re.sub(r"\s+", "_", safe_title).strip("_.")[:60]
        fname = f"{ch_num:03d}_{safe_title}.md"

        # 1. NotebookLM-ready markdown with YAML frontmatter
        ai_markdown = format_ai_frontmatter(ch, project, raw_content)
        (notebooklm_dir / fname).write_text(ai_markdown, encoding="utf-8")

        # 2. Plain text for tokenizers & fast vector embeddings
        plain_text = strip_markdown_to_plain_text(raw_content)
        (clean_text_dir / f"{ch_num:03d}_{safe_title}.txt").write_text(plain_text, encoding="utf-8")

        # 3. Document metadata for manifest & JSONL
        words = len(re.findall(r"\w+", plain_text))
        est_tokens = int(words * 1.3)
        doc_id = f"{project.get('id', 'proj')}_ch{ch_num:03d}"

        doc_meta = {
            "id": doc_id,
            "title": ch["title"],
            "book": project.get("title"),
            "author": project.get("author"),
            "chapter_number": ch_num,
            "start_page": ch["start_page"],
            "end_page": ch["end_page"],
            "page_count": ch["page_count"],
            "word_count": words,
            "estimated_tokens": est_tokens,
            "relative_markdown_path": f"notebooklm_ready/{fname}",
            "relative_text_path": f"clean_text/{ch_num:03d}_{safe_title}.txt",
        }
        manifest_docs.append(doc_meta)

        # JSONL entry
        jsonl_lines.append(
            json.dumps(
                {
                    "id": doc_id,
                    "title": ch["title"],
                    "text": plain_text,
                    "metadata": doc_meta,
                },
                ensure_ascii=False,
            )
        )

    # Write manifest.json
    manifest_data = {
        "rag_schema_version": "1.0",
        "book_title": project.get("title"),
        "author": project.get("author"),
        "source_pdf": project.get("filename"),
        "total_documents": len(manifest_docs),
        "total_estimated_tokens": sum(d["estimated_tokens"] for d in manifest_docs),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "compatible_platforms": [
            "Google NotebookLM",
            "LangChain / LlamaIndex",
            "DeepTutor RAG",
            "ChromaDB / Qdrant / Pinecone",
            "Local LLMs (Ollama / LM Studio)",
        ],
        "documents": manifest_docs,
    }
    with open(ai_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    # Write documents.jsonl
    with open(ai_dir / "documents.jsonl", "w", encoding="utf-8") as f:
        f.write("\n".join(jsonl_lines) + "\n")

    # Write quickstart README for AI engineers
    readme_content = f"""# {project.get('title')} - AI & RAG Knowledge Bundle

This bundle contains clean, pre-chunked, and enriched documents ready for ingestion into:
* **Google NotebookLM:** Upload any or all files from the `notebooklm_ready/` directory directly into NotebookLM sources.
* **Vector Databases & RAG:** Ingest `documents.jsonl` into ChromaDB, Pinecone, Qdrant, Weaviate, or LangChain/LlamaIndex.
* **Local LLMs:** Use `clean_text/` for prompt context or context-stuffing in Ollama, LM Studio, or Claude.

### Directory Structure
* `manifest.json`: Complete chunk index with token estimates and page mappings.
* `documents.jsonl`: Standardized lines of `{{id, title, text, metadata}}`.
* `notebooklm_ready/`: Markdown chapters with YAML frontmatter headers.
* `clean_text/`: Plain text files stripped of Markdown formatting for clean tokenization.
* `images/`: High-resolution figures for multimodal LLM vision queries.

*Generated by PDF Book to Markdown Studio.*
"""
    (ai_dir / "README.md").write_text(readme_content, encoding="utf-8")

    # Create ZIP archive
    zip_path = output_base_dir / f"{book_name}_AI_RAG.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(ai_dir):
            rel_dir = os.path.relpath(root, ai_dir)
            for file in files:
                full_path = Path(root) / file
                arcname = os.path.join(f"{book_name}_AI_RAG", file) if rel_dir == "." else os.path.join(f"{book_name}_AI_RAG", rel_dir, file)
                zipf.write(full_path, arcname)

    return zip_path
