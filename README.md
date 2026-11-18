# PDF Book to Markdown Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![Engine: PyMuPDF4LLM](https://img.shields.io/badge/Engine-PyMuPDF4LLM-violet.svg)](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-cyan.svg)](https://vitejs.dev/)

**PDF Book to Markdown Studio** is a production-quality, cross-platform document processing studio designed to transform large PDF books, medical treatises, technical manuals, textbooks, and reference works into clean, individual chapter-by-chapter Markdown (`.md`) files.

Unlike simple PDF-to-text converters, the Studio is an end-to-end publishing workspace powered by **PyMuPDF4LLM**. It preserves complex tables, diagrams, equations, mathematical formatting, and multi-column reading flows while maintaining full offline privacy.

---

## Key Capabilities

* **5 Intelligent Chapter Detection Engines:**
  * **Method A (Bookmarks):** Extracts hierarchical PDF bookmark outlines (`get_toc`), preserving chapter/subchapter levels.
  * **Method B (Printed Table of Contents):** Scans the first 25+ pages for printed TOC entries, regex dotted leaders, and Roman/Arabic numerals, automatically detecting the physical-to-printed page offset.
  * **Method C (Visual Font & Heading Heuristics):** Analyzes font size frequency mode to establish baseline body text, detecting prominent chapter headings (`CHAPTER 1`, `PART I`, etc.) while filtering repetitive running headers/footers.
  * **Method D (Manual Boundary Studio):** Interactive boundary editing—split chapters at page numbers, merge selected chapters, reorder, adjust boundaries, and add custom chapters.
  * **Method E (Heuristic Layout Segmentation):** Rule-based offline layout segmentation fallback for unstructured documents.
* **Review-First Workflow:** Chapter boundaries are never converted blindly. Users inspect, adjust, and approve chapter divisions in an interactive table alongside real-time PDF page previews.
* **Large PDF Optimization (500–3000+ Pages):** Memory-conscious page range slicing. Documents are never dumped into browser memory; background workers stream conversion chunks, and completed chapters are saved immediately into SQLite.
* **Real-Time Job Queue & Telemetry:** WebSocket-powered monitoring displaying current page, processing speed (pages/sec), estimated time remaining (ETA), and a visual 7-stage pipeline (*Reading PDF → Analyzing pages → Extracting text → Extracting images → Formatting Markdown → Saving chapter → Validating output*).
* **Pause / Resume / Retry / Cancel:** Interruptions are non-destructive. Resumed jobs skip already completed chapters.
* **Integrated Markdown Studio:** Side-by-side raw source and rendered preview, in-browser editor with persistent save, copy-to-clipboard, search within chapter, and chapter navigation.
* **Hierarchical Export & Packaging:**
  * Download structured ZIP archives with standard hierarchy:
    ```
    Book_Name/
    ├── README.md              # Auto-generated index with chapter links & stats
    ├── book_metadata.json     # Machine-readable metadata & boundaries
    ├── chapters/
    │   ├── 001_Introduction.md
    │   └── 002_Anatomy.md
    └── images/
        ├── image_001.png
        └── image_002.png
    ```
  * Single combined Markdown file for the entire book.
  * Individual chapter downloads.
* **Optional Tesseract OCR:** Seamlessly integrates with system Tesseract for image-only or scanned textbooks.
* **100% Offline & Private:** Zero third-party API dependencies, zero external telemetry, zero subscription fees.

---

## Architecture Overview

```
                               ┌─────────────────────────────────────────┐
                               │       Modern React 18 + Vite SPA        │
                               │  Tailwind CSS • Lucide Icons • Dark UI │
                               └────────────────────┬────────────────────┘
                                                    │ REST & WebSockets (/ws)
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │           FastAPI Backend               │
                               ├────────────────────┬────────────────────┤
                               │  Job Queue Manager │ SQLite Database    │
                               │  (Async Workers)   │ (studio.db)        │
                               ├────────────────────┴────────────────────┤
                               │     Document Processing Engines         │
                               │  • PyMuPDF (fitz) Inspector             │
                               │  • Chapter Detection (Methods A–E)      │
                               │  • PyMuPDF4LLM Converter (Layout GNN)   │
                               │  • Tesseract OCR Fallback Service       │
                               │  • Export & Packaging Service           │
                               └─────────────────────────────────────────┘
```

---

## Quick Start & Installation

### Option 1: Automated Script (Recommended)

Running the installer automatically sets up backend and frontend dependencies and creates a desktop shortcut (**PDF to MD Studio**) with custom icons on your desktop for 1-click startup!

#### Linux (Ubuntu / Debian / Fedora / Arch)
```bash
git clone https://github.com/example/pdf-book-to-markdown-studio.git
cd pdf-book-to-markdown-studio
./scripts/install.sh
```
*Creates a desktop launcher on `~/Desktop/pdf-to-md-studio.desktop` and registers it in your system Applications menu.*

#### Windows
1. Double-click `scripts\install.bat` (or run in Command Prompt).
*Creates a `PDF to MD Studio.lnk` shortcut directly on your Windows Desktop.*
2. Double-click the Desktop icon or `scripts\start.bat` to launch.

#### macOS
1. Double-click `scripts/install.command`.
*Creates a `PDF to MD Studio.command` shortcut on your Desktop.*
2. Double-click the Desktop shortcut or `scripts/start.command`.

*(You can also recreate or update desktop shortcuts anytime by running: `python3 scripts/create_desktop_shortcut.py`)*


---

### Option 2: Manual Installation

#### 1. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
cd ..
```

#### 3. Run the Studio
```bash
export PYTHONPATH=backend
python3 backend/run.py
```
Visit **`http://localhost:8000`**.

---

### Option 3: Docker & Docker Compose

```bash
docker compose up --build
```
Access at **`http://localhost:8000`**.

---

## Deployment Modes

### A. Local Desktop Mode
The Python backend and web UI run on the user's workstation. Documents are processed using local hardware with no external network activity.

### B. Remote Server / Cloud VM Mode
Deploy the application on an Ubuntu server (e.g., Oracle Cloud, AWS EC2, DigitalOcean). Users connect from laptops, tablets, or phones through their web browser or install the application as a PWA.

To bind to all interfaces on a server:
```bash
HOST=0.0.0.0 PORT=8000 python3 backend/run.py
```

Optional Nginx reverse proxy configuration:
```nginx
server {
    listen 80;
    server_name studio.example.com;

    client_max_body_size 1024M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Step-by-Step User Workflow

1. **Upload & Inspection (`/upload`):**
   * Drag and drop single or multiple PDF documents.
   * Review page count, file size, integrity, and detected bookmark/TOC availability.
2. **Chapter Detection:**
   * Select **Method A** (Bookmarks), **Method B** (Printed TOC), **Method C** (Headings), or **Auto Best-Fit**.
   * Click **Detect Chapters & Open Review**.
3. **Chapter Review (`/chapters`):**
   * Review detected chapter numbers, titles, and page boundaries.
   * Use **Split Chapter** to divide large chapters into subparts.
   * Use **Merge Chapters** to combine short introductory sections.
   * Click any row to preview that chapter's starting page side-by-side.
4. **Conversion Execution (`/queue`):**
   * Click **Convert Selected Chapters**.
   * Monitor live WebSocket progress, processing speed, ETA, and real-time logs.
   * Pause, resume, or cancel at any time.
5. **Markdown Studio (`/markdown`):**
   * Inspect rendered tables and extracted diagrams.
   * Switch between Rendered Preview, Raw Markdown, and Side-by-Side views.
   * Edit text in-browser and save changes directly to disk.
6. **Export & Download (`/export`):**
   * Download the complete structured ZIP archive with `README.md` and `book_metadata.json`.
   * Or download standalone single-file Markdown.

---

## Automated Verification & Testing

The Studio includes a comprehensive unit and integration test suite:

```bash
PYTHONPATH=backend python3 -m pytest backend/tests -v
```

### Verified Test Cases:
* `test_health_endpoint`: Verifies API uptime.
* `test_upload_and_workflow`: Full end-to-end integration test from upload to conversion job.
* `test_detect_bookmarks_method`: Tests Method A hierarchy extraction.
* `test_detect_printed_toc_method`: Tests Method B printed TOC page parsing and offset calculation.
* `test_detect_visual_headings_method`: Tests Method C font size and heading pattern detection.
* `test_manual_split_chapter` & `test_manual_merge_chapters`: Tests Method D boundary operations.
* `test_convert_chapter_rich_media`: Tests PyMuPDF4LLM extraction with diagrams, tables, and relative markdown images.
* `test_export_zip_creation`: Tests ZIP generation, README index links, and JSON metadata.
* `test_password_protected_pdf`: Tests password protection detection without crashing.
* `test_corrupted_pdf`: Tests corrupted file rejection.
* `test_render_pdf_page_preview`: Tests high-resolution page preview rendering.

---

## Scanned PDFs & OCR Notes

* **Digital Textbooks:** Standard textbooks with selectable text convert at high speed (typically 15–30 pages/sec).
* **Scanned PDFs:** If a PDF is a pure image scan without an embedded OCR text layer, PyMuPDF4LLM utilizes system Tesseract OCR to recognize text.
* **Enabling OCR:**
  * Ubuntu / Debian: `sudo apt-get install -y tesseract-ocr tesseract-ocr-eng`
  * macOS: `brew install tesseract`
  * Windows: Install Tesseract installer and ensure it is added to system PATH.
  * In Studio Settings, toggle **Enable OCR for Scanned Pages** and select your language.

---

## Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"PDF is password-protected"** | Document is encrypted with a user password | Remove password using an unprotect tool before uploading. |
| **"Port 8000 already in use"** | Another service is using port 8000 | Set custom port: `PORT=8080 ./scripts/start.sh` |
| **"RapidOCR is missing warning"** | Optional acceleration library | RapidOCR is optional; Tesseract OCR is automatically active. |
| **Interrupted conversion** | System rebooted during large book conversion | Go to **My Library**, open the book, and click **Resume**. Completed chapters are never re-processed. |
| **WebSocket disconnected** | Network glitch or reverse proxy missing headers | Studio automatically falls back to polling and reconnects every 3s. Ensure proxy sets `Upgrade $http_upgrade`. |

---

## License

MIT License. Designed and developed for professional document processing.
