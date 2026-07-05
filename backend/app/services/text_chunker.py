def chunk_text(text:str, chunk_size:int=1000, chunk_overlap:int=200)-> list[str]:
    cleaned_text=text.strip()

    if not cleaned_text:
        return []
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    chunks=[]
    start=0

    while start < len(cleaned_text):
        end=start+chunk_size
        chunk=cleaned_text[start:end].strip()

        if chunk:
            chunks.append(chunk)
        start+= chunk_size - chunk_overlap
    return chunks
