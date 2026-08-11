"""API Proxy Gateway — forwards requests from published pages."""

import logging
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

# Private IP ranges for SSRF protection
BLOCKED_CIDR_PREFIXES = ["10.", "172.16.", "192.168.", "127.", "0."]


@dataclass
class ProxyResult:
    status: int
    data: object


async def proxy_request(
    url: str,
    method: str = "GET",
    headers: dict | None = None,
    body: dict | None = None,
    client_ip: str = "",
) -> ProxyResult:
    """Forward a request to the target URL with safety checks."""

    parsed = urlparse(url)

    # 1. SSRF protection: block private IPs
    if not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid URL")

    for prefix in BLOCKED_CIDR_PREFIXES:
        if parsed.hostname.startswith(prefix):
            raise HTTPException(status_code=403, detail="Internal addresses are blocked")

    # 2. Domain whitelist check (only in strict mode)
    if settings.PROXY_WHITELIST_MODE == "strict":
        allowed = [d.strip() for d in settings.PROXY_ALLOWED_DOMAINS.split(",")]
        if parsed.hostname not in allowed:
            raise HTTPException(status_code=403, detail=f"Domain not in whitelist: {parsed.hostname}")

    # 3. Forward the request
    method = method.upper()
    if method not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
        raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.request(
                method=method,
                url=url,
                headers=headers or {},
                json=body,
                follow_redirects=True,
            )
            # Try to parse JSON, fallback to text
            try:
                data = resp.json()
            except Exception:
                data = resp.text
            return ProxyResult(status=resp.status_code, data=data)
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Upstream timeout")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Upstream error: {str(e)}")
