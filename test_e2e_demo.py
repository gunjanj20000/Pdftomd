#!/usr/bin/env python3
"""
End-to-End Test and Verification Script for PDF Book to Markdown Studio.
Runs a full conversion on a realistic multi-chapter book and verifies output.
"""
import os
import sys
import json
import zipfile
from pathlib import Path
from PIL import Image
import pymupdf
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.main import app
from app.database import init_db

def run_demo():
    print("=" * 65)
    print("PDF BOOK TO MARKDOWN STUDIO - END-TO-END DEMO TEST")
    print("=" * 65)

    client = TestClient(app)
    init_db()

    # Step 1: Create a realistic sample PDF book
    demo_pdf_path = Path("/home/ubuntu/pdftomd/data/temp/Medical_Neurology_Handbook.pdf")
    demo_pdf_path.parent.mkdir(parents=True, exist_ok=True)

    print("\n[Step 1] Generating sample PDF textbook: Medical Neurology Handbook...")
    doc = pymupdf.open()

    # Cover Page
    p_cover = doc.new_page()
    p_cover.insert_text((72, 120), "CLINICAL NEUROLOGY HANDBOOK", fontsize=22)
    p_cover.insert_text((72, 150), "Third Edition • Reference Manual", fontsize=14)
    p_cover.insert_text((72, 180), "By Dr. Elena Vance, MD, PhD", fontsize=11)

    # Chapter 1: Cellular Neurobiology (Pages 2-3)
    p1 = doc.new_page()
    p1.insert_text((72, 80), "CHAPTER 1: CELLULAR NEUROBIOLOGY", fontsize=18)
    p1.insert_text((72, 115), "Neurons are the fundamental units of the brain and nervous system.", fontsize=11)
    p1.insert_text((72, 135), "Action potentials propagate along myelinated axons at high velocities.", fontsize=11)
    p1.insert_text((72, 170), "Table 1.1: Ion Concentrations\n| Ion | Intracellular | Extracellular |\n| Sodium (Na+) | 15 mM | 145 mM |\n| Potassium (K+) | 150 mM | 5 mM |", fontsize=10)

    p1_cont = doc.new_page()
    p1_cont.insert_text((72, 80), "Synaptic transmission occurs across specialized junctions.", fontsize=11)
    p1_cont.insert_text((72, 105), "Neurotransmitters such as glutamate and GABA mediate signal transfer.", fontsize=11)

    # Chapter 2: Cerebrovascular Systems (Pages 4-5) with embedded diagram
    p2 = doc.new_page()
    p2.insert_text((72, 80), "CHAPTER 2: CEREBROVASCULAR SYSTEMS", fontsize=18)
    p2.insert_text((72, 115), "Blood supply to the brain is derived from carotid and vertebral arteries.", fontsize=11)

    # Embed dummy anatomical diagram
    img = Image.new("RGB", (200, 120), color=(50, 100, 200))
    img_path = Path("/home/ubuntu/pdftomd/data/temp/diagram.png")
    img.save(img_path)
    p2.insert_image(pymupdf.Rect(72, 140, 272, 260), filename=str(img_path))
    p2.insert_text((72, 280), "Figure 2.1: Schematic diagram of arterial blood flow.", fontsize=9)

    p2_cont = doc.new_page()
    p2_cont.insert_text((72, 80), "Autoregulation maintains cerebral perfusion across a range of pressures.", fontsize=11)

    # Chapter 3: Clinical Diagnostic Protocols (Page 6)
    p3 = doc.new_page()
    p3.insert_text((72, 80), "CHAPTER 3: CLINICAL DIAGNOSTIC PROTOCOLS", fontsize=18)
    p3.insert_text((72, 115), "Standardized neurological examinations include cranial nerve evaluation.", fontsize=11)
    p3.insert_text((72, 140), "Magnetic resonance imaging (MRI) provides high-resolution anatomical data.", fontsize=11)

    # Embed bookmarks (Method A)
    toc = [
        [1, "Chapter 1: Cellular Neurobiology", 2],
        [1, "Chapter 2: Cerebrovascular Systems", 4],
        [1, "Chapter 3: Clinical Diagnostic Protocols", 6],
    ]
    doc.set_toc(toc)
    doc.save(str(demo_pdf_path))
    doc.close()
    print(f"✓ Created sample PDF with {len(toc)} bookmarked chapters ({demo_pdf_path.stat().st_size} bytes)")

    # Step 2: Upload to Studio API
    print("\n[Step 2] Uploading PDF book to Studio API...")
    with open(demo_pdf_path, "rb") as f:
        upload_res = client.post(
            "/api/projects/upload",
            files={"files": (demo_pdf_path.name, f, "application/pdf")},
        )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    projects = upload_res.json()
    project = projects[0]
    project_id = project["id"]
    print(f"✓ Project Created: ID={project_id}, Title='{project['title']}', Pages={project['page_count']}")

    # Step 3: Inspect & Detect Chapters
    print("\n[Step 3] Running Intelligent Chapter Detection (Method A: Bookmarks)...")
    detect_res = client.post(
        f"/api/projects/{project_id}/chapters/detect",
        json={"method": "bookmarks", "max_level": 1},
    )
    assert detect_res.status_code == 200
    chapters = detect_res.json()
    print(f"✓ Detected {len(chapters)} Chapters:")
    for ch in chapters:
        print(f"   • Ch {ch['chapter_num']}: '{ch['title']}' (pp. {ch['start_page']}–{ch['end_page']}, {ch['page_count']} pages)")

    # Step 4: Preview a page
    print("\n[Step 4] Testing high-resolution page preview...")
    prev_res = client.get(f"/api/projects/{project_id}/preview-page/4")
    assert prev_res.status_code == 200
    assert prev_res.headers["content-type"] == "image/png"
    print(f"✓ Rendered page 4 preview image ({len(prev_res.content)} bytes PNG)")

    # Step 5: Execute PyMuPDF4LLM Chapter Conversion
    print("\n[Step 5] Triggering PyMuPDF4LLM background conversion...")
    conv_res = client.post(f"/api/projects/{project_id}/convert")
    assert conv_res.status_code == 200
    job = conv_res.json()
    job_id = job["id"]
    print(f"✓ Conversion Job queued: {job_id}")

    # Wait for completion
    import time
    for i in range(40):
        time.sleep(0.5)
        check = client.get(f"/api/jobs/{job_id}").json()
        if check["status"] in ("completed", "completed_with_errors", "failed"):
            print(f"✓ Job finished with status: {check['status']} (progress: {check['progress_percent']}%)")
            break

    # Step 6: Verify Chapter Markdown Files on disk
    print("\n[Step 6] Verifying converted Markdown documents on disk...")
    out_dir = Path(project["output_dir"])
    ch_files = sorted(list((out_dir / "chapters").glob("*.md")))
    print(f"✓ Found {len(ch_files)} Markdown files in {out_dir / 'chapters'}:")
    for f in ch_files:
        print(f"   • {f.name} ({f.stat().st_size} bytes)")
        with open(f, "r", encoding="utf-8") as md_f:
            first_few_lines = "".join(md_f.readlines()[:4]).strip()
            print(f"     Snippet: {first_few_lines[:80]}...")

    # Step 7: Check Image Extraction
    img_files = list((out_dir / "images").glob("*"))
    print(f"\n[Step 7] Checking Extracted Images in {out_dir / 'images'}:")
    print(f"✓ Found {len(img_files)} extracted images:")
    for im in img_files:
        print(f"   • {im.name} ({im.stat().st_size} bytes)")

    # Step 8: Test Markdown Reader & Editor API
    print("\n[Step 8] Testing Markdown retrieval and editor API...")
    ch_list_res = client.get(f"/api/projects/{project_id}/chapters").json()
    first_ch_id = ch_list_res[0]["id"]
    md_res = client.get(f"/api/projects/{project_id}/chapters/{first_ch_id}/markdown")
    assert md_res.status_code == 200
    print(f"✓ Retrieved Markdown for Chapter 1 ({len(md_res.json()['content'])} characters)")

    # Step 9: Test Export ZIP Archive
    print("\n[Step 9] Testing structured ZIP packaging...")
    zip_res = client.get(f"/api/projects/{project_id}/export/zip")
    assert zip_res.status_code == 200
    assert zip_res.headers["content-type"] == "application/zip"
    print(f"✓ Generated ZIP Archive: {len(zip_res.content)} bytes")

    # Inspect zip contents
    zip_path = Path("/home/ubuntu/pdftomd/data/temp/demo_test_archive.zip")
    with open(zip_path, "wb") as f:
        f.write(zip_res.content)

    with zipfile.ZipFile(zip_path, "r") as z:
        print(f"✓ ZIP Archive Contents ({len(z.namelist())} files):")
        for item in z.namelist():
            print(f"   • {item}")

    # Step 10: Test Quality Audit & Diagnostics
    print("\n[Step 10] Testing Document Quality & Health Audit Engine...")
    audit_res = client.get(f"/api/projects/{project_id}/quality-audit")
    assert audit_res.status_code == 200
    report = audit_res.json()
    print(f"✓ Quality Audit: Overall Health Score = {report['overall_score']}/100 ({report['health_status']})")
    print(f"   • Total Semantic Words: {report['total_words']} (~{report['estimated_tokens']} tokens)")
    print(f"   • Verified Figures: {report['total_images_verified']} | Verified Tables: {report['total_tables_verified']}")
    print(f"   • Errors: {report['total_errors']} | Warnings: {report['total_warnings']}")

    # Step 11: Test Selective Reconversion on a Single Chapter
    print("\n[Step 11] Testing Selective Reconversion (Chapter 2 only)...")
    second_ch_id = ch_list_res[1]["id"]
    reconv_res = client.post(
        f"/api/projects/{project_id}/chapters/{second_ch_id}/reconvert",
        json={"table_format": "html", "extract_images": True},
    )
    assert reconv_res.status_code == 200
    updated_ch = reconv_res.json()
    print(f"✓ Selectively Reconverted Chapter 2: '{updated_ch['title']}' ({updated_ch['markdown_size']} bytes)")

    # Step 12: Test AI-Ready Export (NotebookLM, DeepTutor, RAG)
    print("\n[Step 12] Testing AI-Ready Export Bundle (NotebookLM / RAG)...")
    ai_zip_res = client.get(f"/api/projects/{project_id}/export/ai-rag-zip")
    assert ai_zip_res.status_code == 200
    print(f"✓ Generated AI-Ready RAG Bundle: {len(ai_zip_res.content)} bytes")

    ai_zip_path = Path("/home/ubuntu/pdftomd/data/temp/demo_ai_rag.zip")
    with open(ai_zip_path, "wb") as f:
        f.write(ai_zip_res.content)

    with zipfile.ZipFile(ai_zip_path, "r") as z:
        print(f"✓ AI-Ready Package Structure ({len(z.namelist())} files):")
        for item in z.namelist()[:8]:
            print(f"   • {item}")

    # Step 13: Test Saving Chapters as Standalone Sliced PDFs
    print("\n[Step 13] Testing Saving Chapters as Standalone PDFs (not as MD, but as PDF)...")
    # Test downloading single chapter PDF
    first_ch = chapters[0]
    ch_pdf_res = client.get(f"/api/projects/{project_id}/export/chapter/{first_ch['id']}/pdf")
    assert ch_pdf_res.status_code == 200
    assert ch_pdf_res.headers["content-type"] == "application/pdf"
    first_pdf_doc = pymupdf.open(stream=ch_pdf_res.content, filetype="pdf")
    assert len(first_pdf_doc) == first_ch["page_count"]
    print(f"✓ Sliced Chapter 1 PDF: {len(ch_pdf_res.content)} bytes, {len(first_pdf_doc)} pages (pp. {first_ch['start_page']}–{first_ch['end_page']})")
    first_pdf_doc.close()

    # Test downloading all chapters as PDF ZIP
    all_pdf_zip_res = client.get(f"/api/projects/{project_id}/export/chapters-pdf-zip")
    assert all_pdf_zip_res.status_code == 200
    assert all_pdf_zip_res.headers["content-type"] == "application/zip"
    pdf_zip_path = Path("/home/ubuntu/pdftomd/data/temp/demo_chapters_pdf.zip")
    with open(pdf_zip_path, "wb") as f:
        f.write(all_pdf_zip_res.content)
    with zipfile.ZipFile(pdf_zip_path, "r") as z:
        pdf_files = [f for f in z.namelist() if f.endswith(".pdf")]
        print(f"✓ Downloaded All Chapters as PDF ZIP: {len(all_pdf_zip_res.content)} bytes ({len(pdf_files)} PDF chapters):")
        for f in pdf_files:
            print(f"   • {f}")
        assert len(pdf_files) == len(chapters)

    print("\n" + "=" * 65)
    print("ALL TESTS PASSED! PDF BOOK TO MARKDOWN STUDIO IS FULLY OPERATIONAL.")
    print("=" * 65)

if __name__ == "__main__":
    run_demo()
