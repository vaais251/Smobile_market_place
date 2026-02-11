"""
SMobile — Media Router

File upload handling for listing images:
  POST /upload  → Upload an image, return its public URL
"""

import uuid
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, status

router = APIRouter()

# ── Upload config ────────────────────────────
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "static" / "uploads"


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload an image file",
)
async def upload_image(file: UploadFile = File(...)):
    # ── Validate content type ────────────────
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. "
                   f"Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    # ── Read file & validate size ────────────
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size is {MAX_FILE_SIZE // (1024*1024)} MB.",
        )

    # ── Generate unique filename ─────────────
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    # ── Save to disk ─────────────────────────
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as f:
        f.write(contents)

    # ── Return public URL ────────────────────
    url = f"/static/uploads/{unique_name}"
    return {"url": url, "filename": unique_name, "size": len(contents)}
