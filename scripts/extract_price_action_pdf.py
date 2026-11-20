#!/usr/bin/env python3
"""Extract page-indexed OCR text and provenance from the source PDF.

This intentionally does not copy the PDF into the repository or claim to
summarize it. The checked-in knowledge map contains curated, page-anchored
notes; this utility makes a fresh local extraction auditable when the source is
available. Requires the small optional ``pypdf`` package.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise SystemExit("Install pypdf first: python -m pip install pypdf") from exc
    if not args.pdf.is_file():
        raise SystemExit(f"PDF not found: {args.pdf}")
    digest = hashlib.sha256(args.pdf.read_bytes()).hexdigest().upper()
    reader = PdfReader(str(args.pdf))
    pages = []
    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({"pdf_page": index + 1, "text": text, "has_text": bool(text.strip())})
    payload = {
        "schema": "quantsmart.price-action-pdf-extraction/1",
        "source": {"path": str(args.pdf), "sha256": digest, "pdf_pages": len(pages)},
        "text_pages": sum(1 for page in pages if page["has_text"]),
        "pages": pages,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(args.output), "pdf_pages": len(pages), "text_pages": payload["text_pages"], "sha256": digest}))


if __name__ == "__main__":
    main()
