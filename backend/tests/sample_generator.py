import io
from pathlib import Path
from PIL import Image
import pymupdf


def create_bookmarked_pdf(filepath: Path) -> Path:
    """Creates a sample PDF with embedded bookmarks (Method A)."""
    doc = pymupdf.open()
    
    # Page 1: Title
    p1 = doc.new_page()
    p1.insert_text((72, 100), "FUNDAMENTALS OF MODERN COMPUTING", fontsize=20)
    p1.insert_text((72, 130), "By Dr. Jane Doe", fontsize=12)

    # Page 2: Chapter 1
    p2 = doc.new_page()
    p2.insert_text((72, 80), "CHAPTER 1: COMPUTER ARCHITECTURE", fontsize=16)
    p2.insert_text((72, 120), "Computer architecture is the science and art of selecting...", fontsize=11)

    # Page 3: Chapter 2
    p3 = doc.new_page()
    p3.insert_text((72, 80), "CHAPTER 2: OPERATING SYSTEMS", fontsize=16)
    p3.insert_text((72, 120), "An operating system manages computer hardware and software...", fontsize=11)

    # Page 4: Chapter 3
    p4 = doc.new_page()
    p4.insert_text((72, 80), "CHAPTER 3: NETWORKS AND DISTRIBUTED SYSTEMS", fontsize=16)
    p4.insert_text((72, 120), "Computer networks facilitate communication between nodes...", fontsize=11)

    # Add bookmarks (TOC)
    # [level, title, 1-based page number]
    toc = [
        [1, "Chapter 1: Computer Architecture", 2],
        [1, "Chapter 2: Operating Systems", 3],
        [1, "Chapter 3: Networks and Distributed Systems", 4],
    ]
    doc.set_toc(toc)
    doc.save(str(filepath))
    doc.close()
    return filepath


def create_printed_toc_pdf(filepath: Path) -> Path:
    """Creates a PDF with a printed table of contents page but NO embedded bookmarks (Method B)."""
    doc = pymupdf.open()

    # Page 1: Cover
    p1 = doc.new_page()
    p1.insert_text((72, 120), "PRINCIPLES OF BIOLOGY", fontsize=22)

    # Page 2: Printed Table of Contents
    p2 = doc.new_page()
    p2.insert_text((72, 70), "TABLE OF CONTENTS", fontsize=16)
    p2.insert_text((72, 110), "Chapter 1: Cellular Structure and Function ......... 3", fontsize=11)
    p2.insert_text((72, 135), "Chapter 2: Genetics and Molecular Inheritance ..... 4", fontsize=11)
    p2.insert_text((72, 160), "Chapter 3: Ecology and Evolutionary Dynamics ...... 5", fontsize=11)

    # Page 3: Chapter 1 Content
    p3 = doc.new_page()
    p3.insert_text((72, 80), "Chapter 1: Cellular Structure and Function", fontsize=14)
    p3.insert_text((72, 110), "All living organisms are composed of one or more cells.", fontsize=11)

    # Page 4: Chapter 2 Content
    p4 = doc.new_page()
    p4.insert_text((72, 80), "Chapter 2: Genetics and Molecular Inheritance", fontsize=14)
    p4.insert_text((72, 110), "DNA contains the instructions needed for an organism to develop.", fontsize=11)

    # Page 5: Chapter 3 Content
    p5 = doc.new_page()
    p5.insert_text((72, 80), "Chapter 3: Ecology and Evolutionary Dynamics", fontsize=14)
    p5.insert_text((72, 110), "Ecosystems maintain complex balances of flora and fauna.", fontsize=11)

    doc.save(str(filepath))
    doc.close()
    return filepath


def create_visual_headings_pdf(filepath: Path) -> Path:
    """Creates a PDF with visual chapter headings but NO bookmarks and NO TOC page (Method C)."""
    doc = pymupdf.open()

    # Page 1: Chapter 1
    p1 = doc.new_page()
    p1.insert_text((72, 90), "CHAPTER 1: INTRODUCTION", fontsize=18)
    p1.insert_text((72, 130), "This textbook begins with fundamental principles and core models.", fontsize=10)

    # Page 2: Page 2 of Chapter 1
    p2 = doc.new_page()
    p2.insert_text((72, 90), "Additional details for the opening chapter discussion.", fontsize=10)

    # Page 3: Chapter 2
    p3 = doc.new_page()
    p3.insert_text((72, 90), "CHAPTER 2: METHODOLOGY", fontsize=18)
    p3.insert_text((72, 130), "Our methodology relies upon empirical analysis and observation.", fontsize=10)

    # Page 4: Chapter 3
    p4 = doc.new_page()
    p4.insert_text((72, 90), "CHAPTER 3: CONCLUSIONS", fontsize=18)
    p4.insert_text((72, 130), "Final conclusions and summary of outcomes.", fontsize=10)

    doc.save(str(filepath))
    doc.close()
    return filepath


def create_rich_media_pdf(filepath: Path) -> Path:
    """Creates a PDF containing images, tables, and formatted markdown elements."""
    doc = pymupdf.open()
    p = doc.new_page()
    p.insert_text((72, 80), "CHAPTER 1: EMBEDDED DIAGRAMS AND DATA", fontsize=16)
    p.insert_text((72, 110), "Below is a sample table and an illustrative figure.", fontsize=11)

    # Insert a dummy image (120x80)
    img = Image.new("RGB", (120, 80), color="blue")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    p.insert_image(pymupdf.Rect(72, 140, 192, 220), stream=img_bytes.getvalue())

    # Text / table representation
    p.insert_text((72, 250), "Table 1.1: System Metrics\n| Component | Status | Latency |\n| CPU | OK | 2ms |\n| Memory | OK | 5ms |", fontsize=10)

    doc.save(str(filepath))
    doc.close()
    return filepath


def create_password_pdf(filepath: Path, password: str = "secret123") -> Path:
    """Creates a password-protected PDF."""
    doc = pymupdf.open()
    p = doc.new_page()
    p.insert_text((72, 100), "Confidential Document", fontsize=14)
    # Save with encryption
    doc.save(
        str(filepath),
        encryption=pymupdf.PDF_ENCRYPT_AES_256,
        user_pw=password,
        owner_pw="adminpass",
    )
    doc.close()
    return filepath
