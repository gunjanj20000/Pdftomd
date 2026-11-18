import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from tests.sample_generator import create_bookmarked_pdf

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_upload_and_workflow(tmp_path):
    pdf = tmp_path / "api_test.pdf"
    create_bookmarked_pdf(pdf)

    # 1. Upload
    with open(pdf, "rb") as f:
        res = client.post("/api/projects/upload", files={"files": ("api_test.pdf", f, "application/pdf")})
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) == 1
    project_id = projects[0]["id"]
    assert projects[0]["page_count"] == 4
    assert projects[0]["has_bookmarks"] is True

    # 2. Detect chapters
    detect_res = client.post(
        f"/api/projects/{project_id}/chapters/detect",
        json={"method": "bookmarks", "max_level": 1},
    )
    assert detect_res.status_code == 200
    chapters = detect_res.json()
    assert len(chapters) == 3

    # 3. Get chapters
    get_res = client.get(f"/api/projects/{project_id}/chapters")
    assert get_res.status_code == 200
    assert len(get_res.json()) == 3

    # 4. Preview page
    prev_res = client.get(f"/api/projects/{project_id}/preview-page/1")
    assert prev_res.status_code == 200
    assert prev_res.headers["content-type"] == "image/png"

    # 5. Convert project
    conv_res = client.post(f"/api/projects/{project_id}/convert")
    assert conv_res.status_code == 200
    job = conv_res.json()
    job_id = job["id"]
    assert job["status"] in ("queued", "running")

    # 6. Verify job status (wait briefly for completion so daemon thread exits cleanly)
    import time
    for _ in range(50):
        job_check = client.get(f"/api/jobs/{job_id}")
        assert job_check.status_code == 200
        if job_check.json()["status"] in ("completed", "failed"):
            break
        time.sleep(0.1)

    # 7. Check stats endpoint
    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["total_projects"] >= 1

    # 8. Check OCR status
    ocr_res = client.get("/api/settings/ocr-info")
    assert ocr_res.status_code == 200
    assert "ocr_available" in ocr_res.json()

    # 9. Test Saving Chapters as PDF (individual chapter PDF)
    chapter_1 = chapters[0]
    ch_pdf_res = client.get(f"/api/projects/{project_id}/export/chapter/{chapter_1['id']}/pdf")
    assert ch_pdf_res.status_code == 200
    assert ch_pdf_res.headers["content-type"] == "application/pdf"
    assert len(ch_pdf_res.content) > 0

    # Test shortcut endpoint on chapters router
    ch_pdf_shortcut = client.get(f"/api/projects/{project_id}/chapters/{chapter_1['id']}/pdf")
    assert ch_pdf_shortcut.status_code == 200
    assert ch_pdf_shortcut.headers["content-type"] == "application/pdf"

    # 10. Test Saving All Chapters as PDF ZIP
    zip_pdf_res = client.get(f"/api/projects/{project_id}/export/chapters-pdf-zip")
    assert zip_pdf_res.status_code == 200
    assert zip_pdf_res.headers["content-type"] == "application/zip"
    assert len(zip_pdf_res.content) > 0

