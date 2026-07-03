from pathlib import Path
from uuid import uuid4
from app.services.document_parser import extract_text_from_file
from fastapi import APIRouter, File, HTTPException, UploadFile

router= APIRouter(prefix="/documents",tags=["Documents"])

UPLOAD_DIR=Path("uploads")
EXTRACTED_TEXT_DIR=Path("extracted_text")

ALLOWED_EXTENSIONS={".pdf",".docx",".txt",".csv"}

@router.post("/uploads")
async def upload_document(file:UploadFile=File(...)):
    file_extension=Path(file.filename).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported File type. Allowed types: PDF, DOCX, TXT, CSV"
        )
    UPLOAD_DIR.mkdir(exist_ok=True)
    EXTRACTED_TEXT_DIR.mkdir(exist_ok=True)

    safe_filename=f"{uuid4()}{file_extension}"
    file_path=UPLOAD_DIR/safe_filename

    file_content= await file.read()
    file_path.write_bytes(file_content)
    try:
        extracted_text= extract_text_from_file(file_path)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Document uploaded, but text extraction failed: {str(error)}",
        )
    extracted_text_filename=f"{file_path.stem}.txt"
    extracted_text_path=EXTRACTED_TEXT_DIR/extracted_text_filename
    extracted_text_path.write_text(extracted_text,encoding="utf-8")



    return {
    "message": "Document uploaded and parsed successfully",
    "original_filename": file.filename,
    "saved_filename": safe_filename,
    "content_type": file.content_type,
    "size_bytes": len(file_content),
    "path": str(file_path),
    "extracted_text_path": str(extracted_text_path),
    "character_count": len(extracted_text),
    "text_preview": extracted_text[:500],
}