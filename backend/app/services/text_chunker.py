import re


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