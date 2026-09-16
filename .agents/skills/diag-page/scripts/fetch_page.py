#!/usr/bin/env python3
"""Fetch a page record from htmlhost.db for diagnosis.

Usage:
    python scripts/fetch_page.py <pages_id>
    python scripts/fetch_page.py <pages_id> --db /path/to/htmlhost.db

Outputs a JSON object to stdout: {id, title, user_id, page_id, status,
is_published, is_saved, file_size, prompt, step1, html, ...}.
`step1` is the parsed Step 1 JSON ({"refined_prompt", "libraries"}) or null.
id 保持字符串（Snowflake 17 位超出 JS safe integer）。
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path


def find_db() -> str:
    """Locate htmlhost.db by walking up from the script / cwd."""
    cwd = Path.cwd()
    here = Path(__file__).resolve()
    seen = set()
    for base in (here.parent, cwd, Path("/Users/gaoyuze/code/yd/aicoding_journey")):
        base = base.resolve()
        if base in seen:
            continue
        seen.add(base)
        # walk ancestors looking for backend/htmlhost.db or htmlhost.db
        for parent in (base, *base.parents):
            for cand in (parent / "backend" / "htmlhost.db", parent / "htmlhost.db"):
                if cand.exists():
                    return str(cand)
            if parent == Path("/"):
                break
    raise FileNotFoundError("找不到 htmlhost.db，请用 --db 显式指定路径")


def main() -> int:
    ap = argparse.ArgumentParser(description="拉取一条页面记录用于问题诊断")
    ap.add_argument("pages_id", help="pages 表主键 id（Snowflake，按字符串处理）")
    ap.add_argument("--db", help="htmlhost.db 路径（默认自动探测）")
    args = ap.parse_args()

    db_path = args.db or find_db()

    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT id, user_id, page_id, title, status, is_published, is_saved, "
        "file_size, prompt, step1_output, html_content, cover_url, "
        "created_at, updated_at FROM pages WHERE id = ?",
        (args.pages_id,),
    ).fetchone()
    conn.close()

    if row is None:
        print(
            json.dumps(
                {
                    "error": f"pages 表中不存在 id={args.pages_id}",
                    "hint": "可用 sqlite3 backend/htmlhost.db \"SELECT id,title,created_at FROM pages ORDER BY id DESC LIMIT 20;\" 查看现有记录",
                },
                ensure_ascii=False,
            )
        )
        return 1

    d = dict(row)
    step1 = None
    if d.get("step1_output"):
        try:
            step1 = json.loads(d["step1_output"])
        except (json.JSONDecodeError, TypeError):
            step1 = {"_raw": d["step1_output"]}

    out = {
        "id": str(d["id"]),
        "user_id": d["user_id"],
        "page_id": d["page_id"],
        "title": d["title"],
        "status": d["status"],
        "is_published": bool(d["is_published"]),
        "is_saved": bool(d["is_saved"]),
        "file_size": d["file_size"],
        "created_at": d["created_at"],
        "updated_at": d["updated_at"],
        # Step 1 的 refined_prompt（存入 prompt 字段）
        "prompt": d["prompt"],
        # Step 1 完整输出：{"refined_prompt": str, "libraries": [key] | null}
        "step1": step1,
        # 拼装后的完整 HTML（DOCTYPE + head CDN + style + body + script + SDK）
        "html": d["html_content"],
        "cover_url": d["cover_url"],
        "public_url": (
            f"/{d['user_id']}/{d['page_id']}" if d["page_id"] else None
        ),
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
