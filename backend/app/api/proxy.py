import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError

from app.api.deps import get_client_ip, get_db
from app.schemas import ProxyRequest
from app.services.proxy_service import ProxyResult, proxy_request

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/proxy")
async def proxy_endpoint(req: ProxyRequest, request: Request):
    """API proxy gateway for published pages. Limited rate by IP."""
    client_ip = await get_client_ip(request)

    try:
        result: ProxyResult = await proxy_request(
            url=req.url,
            method=req.method,
            headers=req.headers,
            body=req.body,
            client_ip=client_ip,
        )
        return {"status": result.status, "data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Proxy error")
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")
