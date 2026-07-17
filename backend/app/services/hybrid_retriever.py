import re

from app.services.vector_store import search_similar_chunks


STOP_WORDS = {
    "about",
    "after",
    "before",
    "between",
    "does",
    "from",
    "have",
    "into",
    "long",
    "should",
    "that",
    "their",
    "there",
    "these",
    "they",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
}


def normalize_keyword(word: str) -> str:
    if word.endswith("ies") and len(word) > 4:
        return f"{word[:-3]}y"

    if (
        word.endswith("s")
        and not word.endswith("ss")
        and len(word) > 3
    ):
        return word[:-1]

    return word


def extract_keywords(text: str) -> set[str]:
    cleaned_text = text.lower().replace("_", " ")

    words = re.findall(
        r"\b(?:[a-zA-Z]{3,}|\d+)\b",
        cleaned_text,
    )

    return {
        normalize_keyword(word)
        for word in words
        if normalize_keyword(word) not in STOP_WORDS
    }


def calculate_keyword_score(query: str, chunk_text: str) -> float:
    query_keywords = extract_keywords(query)

    if not query_keywords:
        return 0.0

    chunk_keywords = extract_keywords(chunk_text)

    matching_keywords = query_keywords.intersection(chunk_keywords)

    return len(matching_keywords) / len(query_keywords)


def calculate_semantic_score(distance: float | None) -> float:
    if distance is None:
        return 0.0

    return max(0.0, 1.0 - distance)


def get_retrieval_reason(
    semantic_score: float,
    keyword_score: float,
) -> str:
    if semantic_score >= 0.5 and keyword_score > 0:
        return "Matched semantic meaning and exact query keywords."

    if semantic_score >= 0.5:
        return "Matched the semantic meaning of the query."

    if keyword_score > 0:
        return "Matched exact query keywords."

    return "Returned as a semantic-search candidate."

def remove_duplicate_chunks(matches: list[dict]) -> list[dict]:
    unique_matches = []
    seen_texts = set()

    for match in matches:
        text = match.get("text", "").strip()

        if not text or text in seen_texts:
            continue

        seen_texts.add(text)
        unique_matches.append(match)

    return unique_matches

def hybrid_search(
    query: str,
    top_k: int = 5,
    semantic_weight: float = 0.7,
    keyword_weight: float = 0.3,
) -> dict:
    if not query.strip():
        raise ValueError("Search query cannot be empty.")

    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    if semantic_weight + keyword_weight != 1:
        raise ValueError(
            "semantic_weight and keyword_weight must add up to 1."
        )

    candidate_count = max(top_k * 3, 10)

    search_result = search_similar_chunks(
        query=query,
        top_k=candidate_count,
    )

    reranked_matches = []

    for match in search_result["matches"]:
        distance = match.get("distance")
        chunk_text = match.get("text", "")

        semantic_score = calculate_semantic_score(distance)
        keyword_score = calculate_keyword_score(
            query=query,
            chunk_text=chunk_text,
        )

        hybrid_score = (
            semantic_score * semantic_weight
            + keyword_score * keyword_weight
        )

        reranked_match = {
            **match,
            "semantic_score": round(semantic_score, 4),
            "keyword_score": round(keyword_score, 4),
            "hybrid_score": round(hybrid_score, 4),
            "retrieval_reason": get_retrieval_reason(
                semantic_score=semantic_score,
                keyword_score=keyword_score,
            ),
        }

        reranked_matches.append(reranked_match)

    reranked_matches.sort(
        key=lambda match: match["hybrid_score"],
        reverse=True,
    )
    unique_matches = remove_duplicate_chunks(reranked_matches)

    return {
        "query": query,
        "retrieval_method": "hybrid",
        "semantic_weight": semantic_weight,
        "keyword_weight": keyword_weight,
        "candidate_count": len(search_result["matches"]),
        "unique_candidate_count": len(unique_matches),
        "matches": unique_matches[:top_k],
    }