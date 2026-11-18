import pytest
from pathlib import Path
from app.services.chapter_detector import (
    detect_chapters,
    split_chapter,
    merge_chapters,
)
from tests.sample_generator import (
    create_bookmarked_pdf,
    create_printed_toc_pdf,
    create_visual_headings_pdf,
)


def test_detect_bookmarks_method(tmp_path):
    pdf = tmp_path / "bookmarked.pdf"
    create_bookmarked_pdf(pdf)

    res = detect_chapters(pdf, method="bookmarks")
    assert res.method == "bookmarks"
    assert len(res.chapters) == 3
    assert res.chapters[0]["start_page"] == 2
    assert res.chapters[0]["end_page"] == 2
    assert res.chapters[1]["start_page"] == 3
    assert res.chapters[2]["start_page"] == 4
    assert res.chapters[2]["end_page"] == 4


def test_detect_printed_toc_method(tmp_path):
    pdf = tmp_path / "printed_toc.pdf"
    create_printed_toc_pdf(pdf)

    res = detect_chapters(pdf, method="toc")
    assert res.method == "toc"
    assert len(res.chapters) >= 2
    # Check that chapter titles were extracted from TOC
    titles = [c["title"] for c in res.chapters]
    assert any("Cellular" in t for t in titles)


def test_detect_visual_headings_method(tmp_path):
    pdf = tmp_path / "headings.pdf"
    create_visual_headings_pdf(pdf)

    res = detect_chapters(pdf, method="heading")
    assert res.method == "heading"
    assert len(res.chapters) >= 2
    titles = [c["title"] for c in res.chapters]
    assert any("CHAPTER 1" in t for t in titles)


def test_manual_split_chapter():
    chapters = [
        {"id": "c1", "chapter_num": 1, "title": "Large Chapter", "start_page": 1, "end_page": 20, "page_count": 20},
        {"id": "c2", "chapter_num": 2, "title": "Second Chapter", "start_page": 21, "end_page": 30, "page_count": 10},
    ]

    split_res = split_chapter(chapters, chapter_id="c1", split_page=11)
    assert len(split_res) == 3
    assert split_res[0]["start_page"] == 1
    assert split_res[0]["end_page"] == 10
    assert split_res[1]["start_page"] == 11
    assert split_res[1]["end_page"] == 20
    assert split_res[2]["chapter_num"] == 3


def test_manual_merge_chapters():
    chapters = [
        {"id": "c1", "chapter_num": 1, "title": "Part 1", "start_page": 1, "end_page": 10, "page_count": 10},
        {"id": "c2", "chapter_num": 2, "title": "Part 2", "start_page": 11, "end_page": 20, "page_count": 10},
        {"id": "c3", "chapter_num": 3, "title": "Part 3", "start_page": 21, "end_page": 30, "page_count": 10},
    ]

    merged_res = merge_chapters(chapters, chapter_ids_to_merge=["c1", "c2"], merged_title="Merged Parts 1 & 2")
    assert len(merged_res) == 2
    assert merged_res[0]["title"] == "Merged Parts 1 & 2"
    assert merged_res[0]["start_page"] == 1
    assert merged_res[0]["end_page"] == 20
    assert merged_res[0]["page_count"] == 20
    assert merged_res[1]["chapter_num"] == 2
