"""Content safety: basic prompt filtering for demo."""

# Minimal keyword list for demo — production would use third-party API
BLOCKED_KEYWORDS = [
    "赌博", "博彩", "色情", "成人", "裸体",
    "诈骗", "钓鱼", "仿冒",
    "反动", "颠覆", "分裂",
]


async def check_prompt(text: str) -> dict:
    """Check prompt text against blocked keywords. Returns {passed: bool, reason: str}."""
    text_lower = text.lower()
    for kw in BLOCKED_KEYWORDS:
        if kw in text_lower or kw in text:
            return {"passed": False, "reason": f"Content contains blocked keyword: {kw}"}
    return {"passed": True, "reason": ""}
