import re
import logging
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pymupdf

logger = logging.getLogger(__name__)


class ChapterDetectionResult:
    def __init__(self, chapters: List[Dict[str, Any]], method: str, notes: str = ""):
        self.chapters = chapters
        self.method = method
        self.notes = notes

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method": self.method,
            "chapter_count": len(self.chapters),
            "chapters": self.chapters,
            "notes": self.notes,
        }


def detect_chapters(
    filepath: Path,
    method: str = "bookmarks",
    max_level: Optional[int] = 1,
    min_pages_per_chapter: int = 1,
    toc_scan_pages: int = 25,
) -> ChapterDetectionResult:
    """Detects chapters from a PDF using the specified method or auto fallback."""
    if not filepath.exists():
        raise FileNotFoundError(f"File not found: {filepath}")

    doc = pymupdf.open(str(filepath))
    try:
        total_pages = doc.page_count
        if total_pages == 0:
            return ChapterDetectionResult([], method, "Empty document.")

        if method == "bookmarks":
            res = detect_from_bookmarks(doc, max_level=max_level, min_pages=min_pages_per_chapter)
            if res.chapters:
                return res
            # Fallback if requested method had no bookmarks
            logger.info("No bookmarks found, attempting TOC detection fallback")
            res_toc = detect_from_printed_toc(doc, scan_pages=toc_scan_pages)
            if res_toc.chapters:
                return res_toc
            logger.info("No TOC found, attempting Heading detection fallback")
            return detect_from_headings(doc, min_pages=min_pages_per_chapter)

        elif method == "toc":
            res = detect_from_printed_toc(doc, scan_pages=toc_scan_pages)
            if res.chapters:
                return res
            return detect_from_headings(doc, min_pages=min_pages_per_chapter)

        elif method == "heading":
            return detect_from_headings(doc, min_pages=min_pages_per_chapter)

        elif method == "heuristic":
            return detect_heuristic(doc, min_pages=min_pages_per_chapter)

        elif method == "all":
            # Auto best-method selection
            res_b = detect_from_bookmarks(doc, max_level=max_level, min_pages=min_pages_per_chapter)
            if res_b.chapters:
                return res_b
            res_t = detect_from_printed_toc(doc, scan_pages=toc_scan_pages)
            if res_t.chapters:
                return res_t
            return detect_from_headings(doc, min_pages=min_pages_per_chapter)

        else:
            raise ValueError(f"Unknown detection method: {method}")
    finally:
        doc.close()


def detect_from_bookmarks(
    doc: pymupdf.Document, max_level: Optional[int] = 1, min_pages: int = 1
) -> ChapterDetectionResult:
    """Method A: Detects chapters from embedded PDF bookmarks/outlines."""
    raw_toc = doc.get_toc(simple=True) or []
    if not raw_toc:
        return ChapterDetectionResult([], "bookmarks", "No embedded PDF bookmarks found.")

    total_pages = doc.page_count
    filtered_toc = []

    for entry in raw_toc:
        level, title, page = entry[0], entry[1].strip(), entry[2]
        if max_level is not None and level > max_level:
            continue
        if page < 1:
            page = 1
        if page > total_pages:
            page = total_pages
        filtered_toc.append({"level": level, "title": title, "start_page": page})

    if not filtered_toc:
        return ChapterDetectionResult([], "bookmarks", "No bookmarks matched the level criteria.")

    # Sort bookmarks by start_page
    filtered_toc.sort(key=lambda x: (x["start_page"], x["level"]))

    chapters = []
    for i, item in enumerate(filtered_toc):
        start_page = item["start_page"]
        title = item["title"]
        level = item["level"]

        if i + 1 < len(filtered_toc):
            next_start = filtered_toc[i + 1]["start_page"]
            end_page = max(start_page, next_start - 1)
        else:
            end_page = total_pages

        page_count = end_page - start_page + 1
        if page_count < min_pages and i + 1 < len(filtered_toc):
            continue

        chapter_num = len(chapters) + 1
        chapters.append(
            {
                "chapter_num": chapter_num,
                "title": title or f"Chapter {chapter_num}",
                "start_page": start_page,
                "end_page": end_page,
                "page_count": page_count,
                "level": level,
                "detection_method": "bookmarks",
                "is_selected": True,
            }
        )

    # Adjust end_page of last chapter
    if chapters and chapters[-1]["end_page"] < total_pages:
        chapters[-1]["end_page"] = total_pages
        chapters[-1]["page_count"] = chapters[-1]["end_page"] - chapters[-1]["start_page"] + 1

    return ChapterDetectionResult(
        chapters,
        "bookmarks",
        f"Detected {len(chapters)} chapters from PDF bookmarks (levels <= {max_level or 'all'}).",
    )


def detect_from_printed_toc(doc: pymupdf.Document, scan_pages: int = 25) -> ChapterDetectionResult:
    """Method B: Detects chapters from printed Table of Contents pages."""
    total_pages = doc.page_count
    pages_to_scan = min(total_pages, scan_pages)

    toc_entries = []
    toc_pages_found = []

    # Patterns matching lines in a table of contents:
    # e.g.: "Chapter 1: The Cell ....... 15"
    # "1. Introduction to Biology .... 24"
    # "PART ONE: GENERAL PRINCIPLES .. 1"
    # "Summary ....................... 85"
    entry_pattern = re.compile(
        r"^(?P<prefix>(?:Chapter|CHAPTER|Unit|UNIT|Part|PART|Section|SECTION)?\s*[\dIVXLCDMivxlcdm\.]+)?\s*"
        r"(?P<title>.+?)"
        r"(?:[\.\-_·\s]{2,}|\t+|\s{3,})"
        r"(?P<page>\d+|[ivxlcdm]+)$",
        re.MULTILINE,
    )

    for page_idx in range(pages_to_scan):
        page = doc.load_page(page_idx)
        text = page.get_text("text")
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        page_matches = 0
        for line in lines:
            match = entry_pattern.match(line)
            if match:
                title = match.group("title").strip(" .-_·\t")
                page_str = match.group("page").strip()
                prefix = match.group("prefix") or ""
                
                # Filter out pure numbers or short noise
                if len(title) < 2:
                    continue

                full_title = f"{prefix.strip()} {title}".strip() if prefix else title

                # If page is arabic number
                if page_str.isdigit():
                    printed_page = int(page_str)
                    toc_entries.append(
                        {
                            "raw_title": full_title,
                            "printed_page": printed_page,
                            "toc_page_index": page_idx + 1,
                        }
                    )
                    page_matches += 1

        if page_matches >= 3:
            toc_pages_found.append(page_idx + 1)

    if not toc_entries:
        return ChapterDetectionResult([], "toc", "No printed table of contents entries identified.")

    # Deduplicate entries by raw_title and printed_page
    unique_entries = []
    seen = set()
    for e in toc_entries:
        key = (e["raw_title"].lower(), e["printed_page"])
        if key not in seen:
            seen.add(key)
            unique_entries.append(e)

    # Sort by printed page
    unique_entries.sort(key=lambda x: x["printed_page"])

    # Determine offset: check if printed page numbers correspond to physical pages
    # Or if printed page 1 corresponds to page (toc_last_page + 1)
    offset = 0
    if toc_pages_found:
        max_toc_page = max(toc_pages_found)
        first_entry_page = unique_entries[0]["printed_page"]
        
        # Look for verification: search for the first title in subsequent pages
        first_title = unique_entries[0]["raw_title"].lower()
        clean_first_title = re.sub(r"[^\w\s]", "", first_title).strip()
        
        matched_physical = None
        for p in range(max_toc_page, min(total_pages, max_toc_page + 30)):
            p_text = doc.load_page(p).get_text("text").lower()
            if clean_first_title and clean_first_title in re.sub(r"[^\w\s]", "", p_text):
                matched_physical = p + 1
                break

        if matched_physical:
            offset = matched_physical - first_entry_page
        else:
            # Fallback estimation if first printed page is 1
            if first_entry_page == 1 and max_toc_page >= 1:
                offset = max_toc_page

    chapters = []
    for i, item in enumerate(unique_entries):
        raw_start = item["printed_page"] + offset
        start_page = max(1, min(total_pages, raw_start))

        if i + 1 < len(unique_entries):
            next_start = max(1, min(total_pages, unique_entries[i + 1]["printed_page"] + offset))
            end_page = max(start_page, next_start - 1)
        else:
            end_page = total_pages

        chapter_num = len(chapters) + 1
        chapters.append(
            {
                "chapter_num": chapter_num,
                "title": item["raw_title"],
                "start_page": start_page,
                "end_page": end_page,
                "page_count": end_page - start_page + 1,
                "level": 1,
                "detection_method": "toc",
                "is_selected": True,
            }
        )

    # Clean up consecutive overlapping start pages
    cleaned_chapters = []
    for c in chapters:
        if cleaned_chapters and c["start_page"] <= cleaned_chapters[-1]["start_page"]:
            continue
        cleaned_chapters.append(c)

    # Recalculate end pages for cleaned chapters
    for i in range(len(cleaned_chapters)):
        cleaned_chapters[i]["chapter_num"] = i + 1
        if i + 1 < len(cleaned_chapters):
            cleaned_chapters[i]["end_page"] = cleaned_chapters[i + 1]["start_page"] - 1
        else:
            cleaned_chapters[i]["end_page"] = total_pages
        cleaned_chapters[i]["page_count"] = (
            cleaned_chapters[i]["end_page"] - cleaned_chapters[i]["start_page"] + 1
        )

    return ChapterDetectionResult(
        cleaned_chapters,
        "toc",
        f"Extracted {len(cleaned_chapters)} chapters from printed Table of Contents (page offset: +{offset}).",
    )


def detect_from_headings(doc: pymupdf.Document, min_pages: int = 1) -> ChapterDetectionResult:
    """Method C: Automatic Heading Detection analyzing font sizes, weights, and heading patterns."""
    total_pages = doc.page_count
    if total_pages == 0:
        return ChapterDetectionResult([], "heading", "No pages found.")

    # Step 1: Sample font statistics across pages to find body font size
    sample_pages = range(0, total_pages, max(1, total_pages // 30))
    font_sizes = []
    running_header_candidates = []

    for p_idx in sample_pages:
        page = doc.load_page(p_idx)
        blocks = page.get_text("dict").get("blocks", [])
        page_height = page.rect.height
        for b in blocks:
            if "lines" not in b:
                continue
            for line in b["lines"]:
                # Check top margin (< 8%) for running headers
                y0 = line["bbox"][1]
                line_text = "".join(span["text"] for span in line.get("spans", [])).strip()
                if y0 < page_height * 0.08 and line_text:
                    running_header_candidates.append(line_text.lower())

                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    size = round(span.get("size", 10), 1)
                    if len(text) > 5:
                        font_sizes.append(size)

    body_size = 10.0
    if font_sizes:
        counts = Counter(font_sizes)
        body_size = counts.most_common(1)[0][0]

    # Repeated running headers to ignore
    header_counts = Counter(running_header_candidates)
    ignored_headers = {text for text, count in header_counts.items() if count >= 3}

    # Step 2: Heading regex patterns
    ch_patterns = [
        re.compile(r"^(CHAPTER|Chapter)\s+([0-9IVXLCDM]+)[\s:.\-]*(.*)$"),
        re.compile(r"^(PART|Part|UNIT|Unit|SECTION|Section)\s+([0-9IVXLCDM]+)[\s:.\-]*(.*)$"),
        re.compile(r"^([0-9]{1,2})\.\s+([A-Z][A-Za-z0-9\s,:-]{3,})$"),
        re.compile(r"^[A-Z0-9\s,:-]{4,45}$"),  # All-caps prominent title
    ]

    detected_headings = []
    last_detected_page = -1

    for p_idx in range(total_pages):
        page = doc.load_page(p_idx)
        page_height = page.rect.height
        blocks = page.get_text("dict").get("blocks", [])

        page_heading_found = False

        for b in blocks:
            if page_heading_found:
                break
            if "lines" not in b:
                continue

            for line in b["lines"]:
                y0 = line["bbox"][1]
                # Skip running header and footer zones
                if y0 < page_height * 0.08 or y0 > page_height * 0.92:
                    continue

                spans = line.get("spans", [])
                full_line = "".join(s.get("text", "") for s in spans).strip()
                if not full_line or full_line.lower() in ignored_headers:
                    continue

                # Max font size and bold flag in line
                max_size = max((s.get("size", 0) for s in spans), default=0)
                is_bold = any((s.get("flags", 0) & 2) != 0 for s in spans)

                # Heading criterion:
                # 1. Matches Chapter / Unit / Numbered pattern OR
                # 2. Font size is significantly larger than body text (e.g. >= 1.35x body) OR
                # 3. Font size >= 1.15x body AND bold AND in upper half of page
                matches_pattern = False
                for pat in ch_patterns[:3]:
                    if pat.match(full_line):
                        matches_pattern = True
                        break

                is_prominent_size = max_size >= (body_size * 1.35)
                is_bold_heading = (max_size >= body_size * 1.15) and is_bold and (y0 < page_height * 0.45)

                if (matches_pattern or is_prominent_size or is_bold_heading) and len(full_line) >= 3:
                    # Enforce minimum distance from last chapter
                    if last_detected_page != -1 and (p_idx - last_detected_page) < min_pages:
                        continue

                    detected_headings.append(
                        {
                            "title": full_line,
                            "start_page": p_idx + 1,
                            "font_size": max_size,
                        }
                    )
                    last_detected_page = p_idx
                    page_heading_found = True
                    break

    if not detected_headings:
        # Fallback to single chapter or simple division
        return detect_heuristic(doc, min_pages=min_pages)

    # Build chapter boundaries
    chapters = []
    for i, item in enumerate(detected_headings):
        start_page = item["start_page"]
        if i + 1 < len(detected_headings):
            end_page = max(start_page, detected_headings[i + 1]["start_page"] - 1)
        else:
            end_page = total_pages

        chapter_num = len(chapters) + 1
        chapters.append(
            {
                "chapter_num": chapter_num,
                "title": item["title"],
                "start_page": start_page,
                "end_page": end_page,
                "page_count": end_page - start_page + 1,
                "level": 1,
                "detection_method": "heading",
                "is_selected": True,
            }
        )

    return ChapterDetectionResult(
        chapters,
        "heading",
        f"Detected {len(chapters)} chapters via visual font and heading pattern analysis (body size: {body_size}pt).",
    )


def detect_heuristic(doc: pymupdf.Document, min_pages: int = 1) -> ChapterDetectionResult:
    """Method E: Heuristic layout segmentation fallback."""
    total_pages = doc.page_count
    if total_pages <= 5:
        # Short document: 1 chapter
        chapters = [
            {
                "chapter_num": 1,
                "title": "Full Document",
                "start_page": 1,
                "end_page": total_pages,
                "page_count": total_pages,
                "level": 1,
                "detection_method": "heuristic",
                "is_selected": True,
            }
        ]
        return ChapterDetectionResult(chapters, "heuristic", "Short document treated as single chapter.")

    # Segment into reasonable logical blocks (e.g. 15-30 pages or based on page blankness)
    chunk_size = max(10, min(30, total_pages // 5))
    chapters = []
    start = 1
    chapter_num = 1

    while start <= total_pages:
        end = min(total_pages, start + chunk_size - 1)
        # Try to find chapter title from the first non-empty line of start page
        page = doc.load_page(start - 1)
        first_lines = [l.strip() for l in page.get_text("text").split("\n") if len(l.strip()) > 3]
        title = first_lines[0] if first_lines else f"Section {chapter_num}"
        if len(title) > 60:
            title = title[:57] + "..."

        chapters.append(
            {
                "chapter_num": chapter_num,
                "title": title,
                "start_page": start,
                "end_page": end,
                "page_count": end - start + 1,
                "level": 1,
                "detection_method": "heuristic",
                "is_selected": True,
            }
        )
        start = end + 1
        chapter_num += 1

    return ChapterDetectionResult(
        chapters, "heuristic", f"Segmented document into {len(chapters)} sections by heuristic layout."
    )


# --- Method D: Manual Chapter editing operations ---

def split_chapter(
    chapters: List[Dict[str, Any]],
    chapter_id: str,
    split_page: int,
    first_title: Optional[str] = None,
    second_title: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Splits a chapter at a given split_page."""
    new_list = []
    for c in chapters:
        if c.get("id") == chapter_id or str(c.get("chapter_num")) == str(chapter_id):
            start = c["start_page"]
            end = c["end_page"]
            if split_page <= start or split_page > end:
                raise ValueError(f"Split page {split_page} must be strictly between {start + 1} and {end}")

            c1 = dict(c)
            c1["title"] = first_title or f"{c['title']} (Part 1)"
            c1["end_page"] = split_page - 1
            c1["page_count"] = c1["end_page"] - c1["start_page"] + 1

            c2 = dict(c)
            c2["id"] = f"{c.get('id', 'ch')}_split"
            c2["title"] = second_title or f"{c['title']} (Part 2)"
            c2["start_page"] = split_page
            c2["end_page"] = end
            c2["page_count"] = c2["end_page"] - c2["start_page"] + 1

            new_list.append(c1)
            new_list.append(c2)
        else:
            new_list.append(c)

    # Re-number
    for idx, item in enumerate(new_list):
        item["chapter_num"] = idx + 1

    return new_list


def merge_chapters(
    chapters: List[Dict[str, Any]],
    chapter_ids_to_merge: List[str],
    merged_title: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Merges multiple consecutive or selected chapters into one."""
    to_merge = [c for c in chapters if c.get("id") in chapter_ids_to_merge or str(c.get("chapter_num")) in chapter_ids_to_merge]
    if len(to_merge) < 2:
        raise ValueError("Must specify at least 2 chapters to merge.")

    # Sort by start_page
    to_merge.sort(key=lambda x: x["start_page"])
    start_page = to_merge[0]["start_page"]
    end_page = max(c["end_page"] for c in to_merge)
    title = merged_title or to_merge[0]["title"]

    merged_chapter = dict(to_merge[0])
    merged_chapter["title"] = title
    merged_chapter["start_page"] = start_page
    merged_chapter["end_page"] = end_page
    merged_chapter["page_count"] = end_page - start_page + 1

    new_list = []
    merged_inserted = False
    merged_set = set(c.get("id") for c in to_merge)

    for c in chapters:
        if c.get("id") in merged_set:
            if not merged_inserted:
                new_list.append(merged_chapter)
                merged_inserted = True
        else:
            new_list.append(c)

    for idx, item in enumerate(new_list):
        item["chapter_num"] = idx + 1

    return new_list
