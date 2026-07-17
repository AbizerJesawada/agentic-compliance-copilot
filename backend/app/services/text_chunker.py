import re
import csv
from io import StringIO

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[str]:
    cleaned_text = text.strip()

    if not cleaned_text:
        return []

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size.")

    chunks = []
    start = 0

    while start < len(cleaned_text):
        end = start + chunk_size
        chunk = cleaned_text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start += chunk_size - chunk_overlap

    return chunks


def split_long_paragraph(
    paragraph: str,
    chunk_size: int,
) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", paragraph.strip())

    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if not sentence:
            continue

        if len(sentence) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""

            chunks.extend(
                chunk_text(
                    text=sentence,
                    chunk_size=chunk_size,
                    chunk_overlap=0,
                )
            )
            continue

        possible_chunk = f"{current_chunk} {sentence}".strip()

        if len(possible_chunk) <= chunk_size:
            current_chunk = possible_chunk
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())

            current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks
def is_heading(paragraph: str) -> bool:
    cleaned_paragraph = paragraph.strip()

    return (
        len(cleaned_paragraph) <= 100
        and "\n" not in cleaned_paragraph
        and not re.search(r"[.!?]$", cleaned_paragraph)
    )


def group_headings_with_content(paragraphs: list[str]) -> list[str]:
    grouped_paragraphs = []
    index = 0

    while index < len(paragraphs):
        current_paragraph = paragraphs[index].strip()

        if (
            is_heading(current_paragraph)
            and index + 1 < len(paragraphs)
        ):
            next_paragraph = paragraphs[index + 1].strip()

            grouped_paragraphs.append(
                f"{current_paragraph}\n\n{next_paragraph}"
            )

            index += 2
            continue

        grouped_paragraphs.append(current_paragraph)
        index += 1

    return grouped_paragraphs

def chunk_text_by_paragraphs(
    text: str,
    chunk_size: int = 1000,
) -> list[str]:
    cleaned_text = text.strip()

    if not cleaned_text:
        return []

    raw_paragraphs = re.split(r"\n\s*\n+", cleaned_text)

    paragraphs = group_headings_with_content(
    [
        paragraph
        for paragraph in raw_paragraphs
        if paragraph.strip()
    ]
)

    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        paragraph = paragraph.strip()

        if not paragraph:
            continue

        if len(paragraph) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""

            chunks.extend(
                split_long_paragraph(
                    paragraph=paragraph,
                    chunk_size=chunk_size,
                )
            )
            continue

        possible_chunk = f"{current_chunk}\n\n{paragraph}".strip()

        if len(possible_chunk) <= chunk_size:
            current_chunk = possible_chunk
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())

            current_chunk = paragraph

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

def chunk_csv_rows(text: str) -> list[str]:
    cleaned_text = text.strip()

    if not cleaned_text:
        return []

    lines = [
        line.strip()
        for line in cleaned_text.splitlines()
        if line.strip()
    ]

    if len(lines) >= 2 and "|" in lines[0]:
        headers = [
            header.strip()
            for header in lines[0].split("|")
        ]

        chunks = []

        for row_number, line in enumerate(lines[1:], start=1):
            values = [
                value.strip()
                for value in line.split("|")
            ]

            if len(headers) != len(values):
                raise ValueError(
                    "CSV row has a different number of values than headers."
                )

            row_parts = [f"CSV row: {row_number}"]

            for header, value in zip(headers, values):
                if value:
                    row_parts.append(f"{header}: {value}")

            chunks.append("\n".join(row_parts))

        return chunks

    reader = csv.DictReader(StringIO(cleaned_text))

    if not reader.fieldnames:
        raise ValueError(
            "CSV file must contain a header row."
        )

    chunks = []

    for row_number, row in enumerate(reader, start=1):
        row_parts = [f"CSV row: {row_number}"]

        for column_name, value in row.items():
            cleaned_value = (value or "").strip()

            if cleaned_value:
                row_parts.append(
                    f"{column_name}: {cleaned_value}"
                )

        if len(row_parts) > 1:
            chunks.append("\n".join(row_parts))

    return chunks