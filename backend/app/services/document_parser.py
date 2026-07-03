from pathlib import Path
import csv

from docx import Document
from pypdf import PdfReader


def extract_text_from_file(file_path: Path) -> str:
    file_extension = file_path.suffix.lower()

    if file_extension == ".txt":
        return extract_text_from_txt(file_path)

    if file_extension == ".csv":
        return extract_text_from_csv(file_path)

    if file_extension == ".pdf":
        return extract_text_from_pdf(file_path)

    if file_extension == ".docx":
        return extract_text_from_docx(file_path)

    raise ValueError(f"Unsupported file type: {file_extension}")


def extract_text_from_txt(file_path: Path) -> str:
    return file_path.read_text(encoding="utf-8", errors="ignore")


def extract_text_from_csv(file_path: Path) -> str:
    rows = []

    with file_path.open("r", encoding="utf-8", errors="ignore", newline="") as csv_file:
        reader = csv.reader(csv_file)

        for row in reader:
            rows.append(" | ".join(row))

    return "\n".join(rows)


def extract_text_from_pdf(file_path: Path) -> str:
    reader = PdfReader(str(file_path))
    pages_text = []

    for page in reader.pages:
        text = page.extract_text() or ""
        pages_text.append(text)

    return "\n\n".join(pages_text)


def extract_text_from_docx(file_path: Path) -> str:
    document = Document(str(file_path))
    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    return "\n".join(paragraphs)