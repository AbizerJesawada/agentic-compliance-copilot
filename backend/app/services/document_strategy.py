def has_extraction_quality_issue(extracted_text: str) -> bool:
    cleaned_text = extracted_text.strip()

    if len(cleaned_text) < 100:
        return True

    suspicious_markers = [
        "\ufffd",
        "\u0142",
        "�",
        "ł",
        "qSt",
        "Ma0",
        "Jesauonda",
    ]

    return any(
        marker in extracted_text
        for marker in suspicious_markers
    )


def recommend_chunking_strategy(
    file_extension: str,
    extracted_text: str,
) -> dict:
    extension = file_extension.lower()

    if extension == ".csv":
        return {
            "chunking_method": "csv_rows",
            "reason": (
                "CSV files contain rows and columns, so each row should "
                "remain together during chunking."
            ),
            "ocr_required": False,
        }

    if extension == ".pdf" and has_extraction_quality_issue(extracted_text):
        return {
            "chunking_method": "fixed",
            "reason": (
                "The PDF extraction looks short or contains suspicious "
                "characters, so fixed-size chunking is safer. OCR may "
                "improve the text quality."
            ),
            "ocr_required": True,
        }

    if extension in {".txt", ".docx", ".pdf"}:
        if "\n\n" in extracted_text:
            return {
                "chunking_method": "paragraph",
                "reason": (
                    "The document contains paragraph boundaries, so "
                    "paragraph chunking can preserve headings and policy "
                    "sections."
                ),
                "ocr_required": False,
            }

        return {
            "chunking_method": "fixed",
            "reason": (
                "No clear paragraph boundaries were found, so fixed-size "
                "chunking is the safer fallback."
            ),
            "ocr_required": False,
        }

    return {
        "chunking_method": "fixed",
        "reason": (
            "This file type has no specific strategy yet, so fixed-size "
            "chunking is used as a fallback."
        ),
        "ocr_required": False,
    }
