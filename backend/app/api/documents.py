from pathlib import Path
from uuid import uuid4
from app.services.document_parser import extract_text_from_file
from fastapi import APIRouter, File, HTTPException, UploadFile

router= APIRouter(prefix="/documents",tags=["Documents"])

UPLOAD_DIR=Path("uploads")

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

    safe_filename=f"{uuid4()}{file_extension}"
    file_path=UPLOAD_DIR/safe_filename

    file_content= await file.read()
    file_path.write_bytes(file_content)
    extracted_text=extract_text_from_file(file_path)


    return{
        "message":"Document Uploaded Successfully",
        "Original file_name": file.filename,
        "saved_filename":safe_filename,
        "content_type":file.content_type,
        "size_bytes":len(file_content),
        "path":str(file_path),
        "character_count":len(extracted_text),
        "text_preview":extracted_text[:500],
    }