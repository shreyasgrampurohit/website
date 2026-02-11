#!/usr/bin/env python3
"""
Build Knowledge Base
Preprocesses all documents in materials/ and the root directory
into a chunked JSON file for the website chatbot.

Usage:
    python build_knowledge.py

Outputs:
    knowledge_base.json — chunked text with metadata for RAG search

Supported formats: .pdf, .txt, .md, .html, .tex, .json, .csv
"""

import glob
import hashlib
import json
import os
import re
from pathlib import Path

# --- Configuration ---
ROOT_DIR = Path(__file__).parent
MATERIALS_DIR = ROOT_DIR / "materials"
OUTPUT_FILE = ROOT_DIR / "knowledge_base.json"
CHUNK_SIZE = 800  # characters per chunk
CHUNK_OVERLAP = 150  # overlap between chunks
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv"}
SKIP_FILES = {"build_knowledge.py", "knowledge_base.json", "package-lock.json"}
SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".md",
    ".html",
    ".htm",
    ".tex",
    ".json",
    ".csv",
    ".py",
    ".js",
    ".css",
}


def extract_text_from_pdf(filepath: str) -> str:
    """Extract text from a PDF file."""
    try:
        import PyPDF2

        text_parts = []
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)
    except ImportError:
        try:
            import fitz  # PyMuPDF

            doc = fitz.open(filepath)
            text_parts = [page.get_text() for page in doc]
            doc.close()
            return "\n".join(text_parts)
        except ImportError:
            print(
                f"  ⚠ Skipping PDF '{filepath}' — install PyPDF2 or PyMuPDF: pip install PyPDF2"
            )
            return ""


def extract_text_from_html(filepath: str) -> str:
    """Extract visible text from HTML, stripping tags."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    # Remove script and style blocks
    content = re.sub(
        r"<script[^>]*>.*?</script>", "", content, flags=re.DOTALL | re.IGNORECASE
    )
    content = re.sub(
        r"<style[^>]*>.*?</style>", "", content, flags=re.DOTALL | re.IGNORECASE
    )
    # Remove HTML tags
    content = re.sub(r"<[^>]+>", " ", content)
    # Decode common HTML entities
    content = content.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    content = content.replace("&nbsp;", " ").replace("&quot;", '"')
    # Collapse whitespace
    content = re.sub(r"\s+", " ", content).strip()
    return content


def extract_text_from_file(filepath: str) -> str:
    """Extract text from a file based on its extension."""
    ext = Path(filepath).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(filepath)
    elif ext in {".html", ".htm"}:
        return extract_text_from_html(filepath)
    else:
        # Plain text, markdown, tex, code, etc.
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            print(f"  ⚠ Could not read '{filepath}': {e}")
            return ""


def chunk_text(
    text: str, source: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP
) -> list:
    """Split text into overlapping chunks with metadata."""
    if not text.strip():
        return []

    # Clean up excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size

        # Try to break at a sentence boundary
        if end < len(text):
            # Look for sentence end near the chunk boundary
            for sep in [". ", ".\n", "\n\n", "\n", " "]:
                idx = text.rfind(sep, start + chunk_size // 2, end + 100)
                if idx != -1:
                    end = idx + len(sep)
                    break

        chunk_text_content = text[start:end].strip()
        if chunk_text_content and len(chunk_text_content) > 30:
            chunk_id = hashlib.md5(f"{source}:{start}".encode()).hexdigest()[:10]
            chunks.append(
                {
                    "id": chunk_id,
                    "source": source,
                    "text": chunk_text_content,
                }
            )

        start = end - overlap if end < len(text) else len(text)

    return chunks


def collect_files() -> list:
    """Collect all processable files from root and materials/."""
    files = []

    # Collect from root directory (non-recursive for root, only specific files)
    for f in ROOT_DIR.iterdir():
        if (
            f.is_file()
            and f.name not in SKIP_FILES
            and f.suffix.lower() in SUPPORTED_EXTENSIONS
        ):
            files.append(str(f))

    # Collect from materials/ recursively
    if MATERIALS_DIR.exists():
        for root, dirs, filenames in os.walk(MATERIALS_DIR):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for filename in filenames:
                filepath = Path(root) / filename
                if (
                    filepath.suffix.lower() in SUPPORTED_EXTENSIONS
                    and filepath.name not in SKIP_FILES
                ):
                    files.append(str(filepath))

    return sorted(set(files))


def build_knowledge_base():
    """Main function to build the knowledge base."""
    print("🔍 Scanning for files...")
    files = collect_files()
    print(f"   Found {len(files)} file(s) to process\n")

    all_chunks = []
    for filepath in files:
        rel_path = str(Path(filepath).relative_to(ROOT_DIR))
        print(f"📄 Processing: {rel_path}")

        text = extract_text_from_file(filepath)
        if not text.strip():
            print(f"   (empty or unreadable, skipped)")
            continue

        chunks = chunk_text(text, source=rel_path)
        all_chunks.extend(chunks)
        print(f"   → {len(chunks)} chunk(s)")

    # Build the output
    knowledge_base = {
        "version": "1.0",
        "total_chunks": len(all_chunks),
        "sources": list(set(c["source"] for c in all_chunks)),
        "chunks": all_chunks,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Knowledge base built: {OUTPUT_FILE.name}")
    print(
        f"   {len(all_chunks)} chunks from {len(knowledge_base['sources'])} source(s)"
    )
    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"   File size: {size_kb:.1f} KB")


if __name__ == "__main__":
    build_knowledge_base()
