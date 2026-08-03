def extract_text_with_ocr(file_path, page_texts: list[str] | None = None) -> str:
    """Extract text from scanned PDFs using OCR.

    Uses pytesseract if available. Falls back to empty string if OCR
    is not installed so the main pipeline can continue.
    """
    try:
        import fitz
        import pytesseract
        from PIL import Image
    except ImportError:
        return ""

    try:
        document = fitz.open(file_path)

        if page_texts and any(page.strip() for page in page_texts):
            return ""

        combined_pages = []

        for page in document:
            page_image = page.get_pixmap(dpi=200)
            image = Image.frombytes(
                "RGB",
                (page_image.width, page_image.height),
                page_image.samples,
            )
            page_ocr_text = pytesseract.image_to_string(image)
            combined_pages.append(page_ocr_text)

        document.close()

        return "\n\n".join(combined_pages)

    except Exception:
        return ""
