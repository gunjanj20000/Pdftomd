import os
import re
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AuditIssue:
    def __init__(
        self,
        severity: str,  # 'ERROR', 'WARNING', 'INFO'
        category: str,  # 'short_chapter', 'broken_image', 'malformed_table', 'encoding_artifact', 'heading_syntax'
        message: str,
        line_number: Optional[int] = None,
        snippet: Optional[str] = None,
        suggestion: Optional[str] = None,
    ):
        self.severity = severity
        self.category = category
        self.message = message
        self.line_number = line_number
        self.snippet = snippet
        self.suggestion = suggestion

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "category": self.category,
            "message": self.message,
            "line_number": self.line_number,
            "snippet": self.snippet,
            "suggestion": self.suggestion,
        }


def audit_chapter_markdown(
    markdown_path: Path,
    images_dir: Path,
    chapter_info: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Audits a single chapter's Markdown file for quality issues:
    - Suspiciously short content or empty chapters
    - Broken image links and missing image files
    - Malformed markdown tables and column mismatches
    - Corrupted encoding artifacts
    """
    issues: List[AuditIssue] = []

    if not markdown_path.exists():
        return {
            "chapter_id": chapter_info.get("id"),
            "chapter_num": chapter_info.get("chapter_num"),
            "title": chapter_info.get("title"),
            "status": "missing_file",
            "score": 0,
            "word_count": 0,
            "image_count": 0,
            "table_count": 0,
            "issues": [
                AuditIssue(
                    severity="ERROR",
                    category="empty_content",
                    message="Markdown file has not been generated for this chapter.",
                    suggestion="Reconvert this chapter using the selective reconversion tool.",
                ).to_dict()
            ],
        }

    try:
        with open(markdown_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        return {
            "chapter_id": chapter_info.get("id"),
            "chapter_num": chapter_info.get("chapter_num"),
            "title": chapter_info.get("title"),
            "status": "read_error",
            "score": 0,
            "issues": [
                AuditIssue(
                    severity="ERROR",
                    category="encoding_artifact",
                    message=f"Failed to read markdown file: {e}",
                ).to_dict()
            ],
        }

    lines = content.split("\n")
    words = [w for w in re.split(r"\s+", content) if w.strip()]
    word_count = len(words)
    char_count = len(content.strip())

    # 1. Check for suspiciously short chapters
    page_count = chapter_info.get("page_count", 1)
    expected_min_words = max(30, page_count * 25)

    if char_count < 100:
        issues.append(
            AuditIssue(
                severity="ERROR",
                category="short_chapter",
                message=f"Chapter content is nearly empty ({char_count} characters, {word_count} words).",
                suggestion="This page may be a scanned image or non-extractable layout. Try reconverting with OCR enabled.",
            )
        )
    elif word_count < expected_min_words:
        issues.append(
            AuditIssue(
                severity="WARNING",
                category="short_chapter",
                message=f"Suspiciously short chapter: only {word_count} words across {page_count} pages.",
                suggestion="Verify if this chapter contains diagrams or scanned pages that require OCR.",
            )
        )

    # 2. Check broken image links
    img_regex = re.compile(r"!\[(.*?)\]\((.*?)\)")
    image_count = 0

    for idx, line in enumerate(lines, start=1):
        for match in img_regex.finditer(line):
            image_count += 1
            alt = match.group(1)
            raw_path = match.group(2)
            fname = Path(raw_path).name

            target_img = images_dir / fname
            if not target_img.exists():
                issues.append(
                    AuditIssue(
                        severity="ERROR",
                        category="broken_image",
                        message=f"Broken image reference: '{raw_path}' does not exist on disk.",
                        line_number=idx,
                        snippet=line.strip()[:100],
                        suggestion="Reconvert this chapter with image extraction enabled.",
                    )
                )

    # 3. Check for malformed tables
    in_table = False
    table_count = 0
    header_cols = 0
    table_start_line = 0

    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        is_table_row = stripped.startswith("|") and stripped.endswith("|") and stripped.count("|") >= 2

        if is_table_row:
            if not in_table:
                # Table starts
                in_table = True
                table_count += 1
                table_start_line = idx
                cells = [c.strip() for c in stripped.split("|")[1:-1]]
                header_cols = len(cells)
            else:
                cells = [c.strip() for c in stripped.split("|")[1:-1]]
                # Check separator row
                if all(re.match(r"^:?-+:?$", c) for c in cells if c):
                    # Valid separator
                    continue
                # Check column count match
                if len(cells) != header_cols:
                    issues.append(
                        AuditIssue(
                            severity="WARNING",
                            category="malformed_table",
                            message=f"Table column mismatch at line {idx}: Header has {header_cols} columns but row has {len(cells)}.",
                            line_number=idx,
                            snippet=stripped[:80],
                            suggestion="Fix column pipes in Markdown editor or reconvert with HTML table format.",
                        )
                    )
        else:
            if in_table:
                in_table = False

    # 4. Check for broken heading syntax (e.g. #Title without space)
    for idx, line in enumerate(lines, start=1):
        if re.match(r"^#{1,6}[A-Za-z0-9]", line.strip()):
            issues.append(
                AuditIssue(
                    severity="WARNING",
                    category="heading_syntax",
                    message="Missing space after '#' in heading syntax.",
                    line_number=idx,
                    snippet=line.strip()[:60],
                    suggestion="Add a space between '#' and heading text (e.g. '# Chapter 1').",
                )
            )

    # 5. Check for replacement character artifacts
    replacement_count = content.count("\ufffd")
    if replacement_count > 0:
        issues.append(
            AuditIssue(
                severity="WARNING",
                category="encoding_artifact",
                message=f"Detected {replacement_count} replacement characters (\ufffd), indicating font encoding issues.",
                suggestion="Reconvert this chapter with Tesseract OCR enabled to repair corrupted glyphs.",
            )
        )

    # Calculate Chapter Score
    error_count = sum(1 for i in issues if i.severity == "ERROR")
    warning_count = sum(1 for i in issues if i.severity == "WARNING")
    deductions = (error_count * 25) + (warning_count * 8)
    score = max(0, 100 - deductions)

    status = "healthy" if error_count == 0 and warning_count == 0 else "needs_review" if error_count == 0 else "errors_found"

    return {
        "chapter_id": chapter_info.get("id"),
        "chapter_num": chapter_info.get("chapter_num"),
        "title": chapter_info.get("title"),
        "status": status,
        "score": score,
        "word_count": word_count,
        "char_count": char_count,
        "image_count": image_count,
        "table_count": table_count,
        "issues": [i.to_dict() for i in issues],
    }


def audit_project_document(
    project: Dict[str, Any],
    chapters: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Audits the entire converted book, aggregating issues across all chapters.
    """
    output_dir = Path(project["output_dir"])
    images_dir = output_dir / "images"

    chapter_audits = []
    total_words = 0
    total_images = 0
    total_tables = 0
    total_errors = 0
    total_warnings = 0

    for ch in chapters:
        md_path = Path(ch["markdown_path"]) if ch.get("markdown_path") else output_dir / "chapters" / f"{ch['chapter_num']:03d}_{ch['title']}.md"
        res = audit_chapter_markdown(md_path, images_dir, ch)
        chapter_audits.append(res)

        total_words += res.get("word_count", 0)
        total_images += res.get("image_count", 0)
        total_tables += res.get("table_count", 0)

        for iss in res.get("issues", []):
            if iss["severity"] == "ERROR":
                total_errors += 1
            elif iss["severity"] == "WARNING":
                total_warnings += 1

    # Overall Document Health Score
    if chapter_audits:
        overall_score = round(sum(c["score"] for c in chapter_audits) / len(chapter_audits))
    else:
        overall_score = 100

    estimated_tokens = int(total_words * 1.3)

    return {
        "project_id": project["id"],
        "book_title": project["title"],
        "overall_score": overall_score,
        "health_status": "excellent" if overall_score >= 90 else "good" if overall_score >= 75 else "needs_attention",
        "total_words": total_words,
        "estimated_tokens": estimated_tokens,
        "total_images_verified": total_images,
        "total_tables_verified": total_tables,
        "total_errors": total_errors,
        "total_warnings": total_warnings,
        "chapters": chapter_audits,
    }
