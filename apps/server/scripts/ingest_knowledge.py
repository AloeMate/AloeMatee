"""
RAG Knowledge Ingestion Script
================================
Reads all .txt knowledge documents, splits into sections, embeds with Gemini,
and stores in ChromaDB for retrieval-augmented treatment guidance.

Usage (from apps/server directory):
    python scripts/ingest_knowledge.py

Requires:
    GEMINI_API_KEY set in .env file
"""
import sys
import time
import hashlib
from pathlib import Path

# Add server root to Python path
server_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(server_root))

from app.config import settings


def chunk_document(text: str, disease_id: str) -> list[dict]:
    """
    Split a knowledge document into chunks by section headers.
    Each UPPERCASE: header starts a new chunk.
    Returns list of {"text": ..., "section": ..., "disease": ...}
    """
    SECTION_KEYWORDS = (
        "DISEASE:", "CONDITION:", "SCIENTIFIC NAME:", "CATEGORY:", "AFFECTS:",
        "DESCRIPTION", "SYMPTOMS:", "CAUSES:", "SCIENTIFIC TREATMENT:",
        "AYURVEDIC", "DOSAGE AND FREQUENCY:", "SAFETY WARNINGS:", "PREVENTION:",
        "WHEN TO CONSULT", "RESEARCH CITATIONS:", "GEL HARVE", "PROPAGATION",
        "OPTIMAL GROWING", "ROUTINE CARE", "PREVENTIVE DISEASE", "SIGNS OF STRESS",
    )

    chunks = []
    current_section = "OVERVIEW"
    current_lines: list[str] = []

    def flush_chunk():
        joined = "\n".join(current_lines).strip()
        if len(joined) > 80:  # skip tiny fragments
            chunks.append({
                "text": joined,
                "section": current_section,
                "disease": disease_id,
            })

    for line in text.splitlines():
        stripped = line.strip()
        is_header = any(stripped.upper().startswith(kw) for kw in SECTION_KEYWORDS)
        if is_header:
            flush_chunk()
            current_section = stripped.rstrip(":").upper()
            current_lines = [line]
        else:
            current_lines.append(line)

    flush_chunk()
    return chunks


def embed_texts(texts: list[str], task_type: str, api_key: str) -> list[list[float]]:
    """Embed a list of texts using Google Gemini text-embedding-004."""
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    embeddings = []
    for i, text in enumerate(texts):
        try:
            result = genai.embed_content(
                model=settings.GEMINI_EMBED_MODEL,
                content=text,
                task_type=task_type,
            )
            embeddings.append(result["embedding"])
        except Exception as exc:
            print(f"  ⚠  Embedding failed for chunk {i}: {exc}")
            embeddings.append(None)
        # Respect free-tier rate limit (~60 requests/min)
        if (i + 1) % 5 == 0:
            time.sleep(1)
    return embeddings


def make_chunk_id(disease_id: str, section: str, index: int) -> str:
    raw = f"{disease_id}|{section}|{index}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]


def ingest(documents_dir: Path, chroma_path: Path, collection_name: str, api_key: str):
    import chromadb

    txt_files = sorted(documents_dir.glob("*.txt"))
    if not txt_files:
        print(f"No .txt files found in {documents_dir}")
        return

    print(f"Found {len(txt_files)} knowledge documents:")
    for f in txt_files:
        print(f"  {f.name}")

    # Collect all chunks first
    all_chunks: list[dict] = []
    for txt_file in txt_files:
        disease_id = txt_file.stem  # e.g. "aloe_rust"
        text = txt_file.read_text(encoding="utf-8")
        chunks = chunk_document(text, disease_id)
        print(f"\n  {disease_id}: {len(chunks)} chunks")
        for chunk in chunks:
            print(f"    [{chunk['section'][:50]}]  {len(chunk['text'])} chars")
        all_chunks.extend(chunks)

    print(f"\nTotal chunks to embed: {len(all_chunks)}")

    # Embed all chunks
    print("Embedding with Gemini text-embedding-004 ...")
    texts = [c["text"] for c in all_chunks]
    embeddings = embed_texts(texts, task_type="retrieval_document", api_key=api_key)

    # Filter out failed embeddings
    valid = [
        (chunk, emb)
        for chunk, emb in zip(all_chunks, embeddings)
        if emb is not None
    ]
    if len(valid) < len(all_chunks):
        print(f"  ⚠  {len(all_chunks) - len(valid)} chunks failed to embed and will be skipped.")

    # Store in ChromaDB
    chroma_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_path))

    # Drop existing collection so we get a clean ingest on re-run
    try:
        client.delete_collection(name=collection_name)
        print(f"\nDropped existing collection '{collection_name}' for clean re-ingest.")
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # Batch-add to ChromaDB (max 500 per add call)
    BATCH = 100
    ids_added = 0
    for start in range(0, len(valid), BATCH):
        batch = valid[start : start + BATCH]
        collection.add(
            ids=[make_chunk_id(c["disease"], c["section"], start + i) for i, (c, _) in enumerate(batch)],
            embeddings=[emb for _, emb in batch],
            documents=[c["text"] for c, _ in batch],
            metadatas=[{"disease": c["disease"], "section": c["section"]} for c, _ in batch],
        )
        ids_added += len(batch)

    print(f"\n✅ Ingestion complete — {ids_added} chunks stored in '{collection_name}'")
    print(f"   ChromaDB path: {chroma_path}")


def main():
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "PASTE_YOUR_KEY_HERE":
        print("ERROR: GEMINI_API_KEY is not set in .env")
        print("  Edit apps/server/.env and set your key from https://aistudio.google.com/app/apikey")
        sys.exit(1)

    documents_dir = server_root / "data" / "knowledge" / "rag_documents"
    chroma_path = server_root / settings.RAG_CHROMA_PATH

    if not documents_dir.exists():
        print(f"ERROR: Knowledge documents directory not found: {documents_dir}")
        sys.exit(1)

    ingest(
        documents_dir=documents_dir,
        chroma_path=chroma_path,
        collection_name=settings.RAG_COLLECTION,
        api_key=settings.GEMINI_API_KEY,
    )


if __name__ == "__main__":
    main()
