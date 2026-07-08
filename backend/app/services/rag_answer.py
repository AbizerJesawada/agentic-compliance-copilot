import re


def build_context_from_matches(matches: list[dict]) -> str:
    context_parts = []

    for index, match in enumerate(matches, start=1):
        source = match.get("metadata", {}).get("source_path", "unknown source")
        chunk_index = match.get("metadata", {}).get("chunk_index", "unknown chunk")
        text = match.get("text", "")

        context_parts.append(
            f"Source {index}:\n"
            f"File: {source}\n"
            f"Chunk: {chunk_index}\n"
            f"Content:\n{text}"
        )

    return "\n\n".join(context_parts)


def split_into_sentences(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [sentence.strip() for sentence in sentences if sentence.strip()]


def choose_best_sentence(question: str, text: str) -> str:
    sentences = split_into_sentences(text)

    if not sentences:
        return text

    question_words = {
        word.lower()
        for word in re.findall(r"\b[a-zA-Z]{3,}\b", question)
    }

    best_sentence = sentences[0]
    best_score = 0

    for sentence in sentences:
        sentence_words = {
            word.lower()
            for word in re.findall(r"\b[a-zA-Z]{3,}\b", sentence)
        }

        score = len(question_words.intersection(sentence_words))

        if score > best_score:
            best_score = score
            best_sentence = sentence

    return best_sentence

def remove_duplicate_matches(matches: list[dict]) -> list[dict]:
    unique_matches = []
    seen_texts = set()

    for match in matches:
        text = match.get("text", "").strip()

        if not text:
            continue

        if text in seen_texts:
            continue

        seen_texts.add(text)
        unique_matches.append(match)

    return unique_matches

def calculate_confidence(matches: list[dict]) -> str:
    if not matches:
        return "low"

    best_distance = matches[0].get("distance")

    if best_distance is None:
        return "unknown"

    if best_distance <= 0.30:
        return "high"

    if best_distance <= 0.70:
        return "medium"

    return "low"

def generate_grounded_answer(question: str, matches: list[dict]) -> dict:
    matches = remove_duplicate_matches(matches)

    if not matches:
        return {
            "answer": "I could not find relevant information in the indexed documents.",
            "sources": [],
            "context_used": "",
            "confidence": "low",
        }

    confidence = calculate_confidence(matches)
    if confidence == "low":
        return {
        "answer": "I could not find relevant information in the indexed documents.",
        "sources": [],
        "context_used": "",
        "confidence": confidence,
    }
    best_match = matches[0]
    best_text = best_match.get("text", "")
    best_sentence = choose_best_sentence(question, best_text)

    sources = []

    for match in matches:
        metadata = match.get("metadata", {})

        sources.append(
            {
                "chunk_id": match.get("id"),
                "source_path": metadata.get("source_path"),
                "chunk_index": metadata.get("chunk_index"),
                "distance": match.get("distance"),
            }
        )

    context = build_context_from_matches(matches)

    return {
        "answer": (
            "Based on the retrieved document context: "
            f"{best_sentence}"
        ),
        "sources": sources,
        "context_used": context,
        "confidence": confidence,
    }