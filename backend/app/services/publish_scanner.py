"""Pre-publish HTML safety scanner."""

from urllib.parse import urlparse

ALLOWED_CDN_DOMAINS = [
    "cdn.jsdelivr.net",
    "unpkg.com",
    "esm.sh",
    "cdn.bootcdn.net",
    "cdn.bootcss.com",
]

DANGEROUS_PATTERNS = [
    ("eval(", "Dynamic code execution (eval)"),
    ("new Function(", "Dynamic code execution (new Function)"),
    ("document.cookie", "Cookie access"),
    ("localStorage.", "localStorage access"),
    ("sessionStorage.", "sessionStorage access"),
    ("document.write(", "document.write usage"),
]

PHISHING_KEYWORDS = ["银行", "公安", "政府", "法院", "支付宝", "微信支付", "登录", "密码", "验证码", "身份证", "银行卡号"]


async def scan_html(html_code: str) -> dict:
    """Scan HTML content for safety issues. Returns {passed: bool, issues: list}."""
    issues = []

    # 1. Check for dangerous JS patterns
    for pattern, desc in DANGEROUS_PATTERNS:
        if pattern in html_code:
            issues.append(f"Dangerous API: {desc}")

    # 2. Check external links (basic — parse with regex for demo)
    import re

    urls = re.findall(r'(?:src|href)=["\'](https?://[^"\']+)["\']', html_code)
    for url in urls:
        domain = urlparse(url).hostname
        if domain and domain not in ALLOWED_CDN_DOMAINS:
            issues.append(f"Unauthorized external link: {domain}")

    # 3. Check for phishing keywords
    visible_text = re.sub(r"<[^>]+>", "", html_code)
    phishing_count = sum(1 for kw in PHISHING_KEYWORDS if kw in visible_text)
    if phishing_count >= 3:
        issues.append(f"Suspicious phishing content (keywords hit: {phishing_count})")

    # 4. Check for external iframes
    if "<iframe" in html_code.lower():
        issues.append("Contains iframe — blocked for safety")

    return {"passed": len(issues) == 0, "issues": issues}
