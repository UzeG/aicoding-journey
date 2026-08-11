"""Mock API endpoints for development — skip real LLM calls but exercise the full SSE pipeline."""

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.api.deps import get_current_user, get_db
from app.models import User
from app.schemas import GenerateRequest
from app.services.llm_service import _distill_title
from app.utils.snowflake import generate_id

router = APIRouter()
logger = logging.getLogger(__name__)

# Sample HTML page for mock generation — a data dashboard with UnoCSS + ECharts
MOCK_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dev Mock — 数据仪表盘</title>
<script src="https://cdn.jsdelivr.net/npm/@unocss/runtime@0.62.0"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
</style>
</head>
<body>
<div class="max-w-5xl mx-auto px-4 py-8 md:px-8 md:py-12">
  <header class="text-center mb-10">
    <h1 class="text-3xl md:text-4xl font-bold text-white mb-3">数据仪表盘</h1>
    <p class="text-slate-400 text-sm">Dev Mock Preview — VITE_MOCK_LLM=true, 零 Token 消耗</p>
  </header>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
    <div class="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div class="text-xs text-slate-400 uppercase tracking-wide mb-2">活跃用户</div>
      <div class="text-3xl font-bold text-emerald-400">2,847</div>
      <div class="text-xs text-emerald-500/70 mt-1">+12.5% vs 上周</div>
    </div>
    <div class="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div class="text-xs text-slate-400 uppercase tracking-wide mb-2">页面浏览量</div>
      <div class="text-3xl font-bold text-blue-400">48.2K</div>
      <div class="text-xs text-blue-500/70 mt-1">+8.3% vs 上周</div>
    </div>
    <div class="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div class="text-xs text-slate-400 uppercase tracking-wide mb-2">平均会话</div>
      <div class="text-3xl font-bold text-purple-400">4m 32s</div>
      <div class="text-xs text-purple-500/70 mt-1">+2.1% vs 上周</div>
    </div>
    <div class="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div class="text-xs text-slate-400 uppercase tracking-wide mb-2">可用率</div>
      <div class="text-3xl font-bold text-amber-400">99.97%</div>
      <div class="text-xs text-amber-500/70 mt-1">本月</div>
    </div>
  </div>
  <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-10">
    <h2 class="text-lg font-semibold text-white mb-4">周流量趋势</h2>
    <div id="chart" style="width:100%;height:320px;"></div>
  </div>
  <footer class="text-center border-t border-slate-800 pt-6">
    <p class="text-xs text-slate-500">Mock Mode · 未消耗 LLM Token</p>
  </footer>
</div>
<script>
(function() {
  var el = document.getElementById('chart');
  if (!el) return;
  var c = echarts.init(el);
  c.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], axisLabel: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#334155' } } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    series: [{ data: [6200,7100,6800,7500,8900,10200,9800], type: 'line', smooth: true,
      areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{offset:0,color:'rgba(0,166,80,0.25)'},{offset:1,color:'rgba(0,166,80,0.02)'}] } },
      lineStyle: { color: '#00a650', width: 3 }, itemStyle: { color: '#00a650' }, symbol: 'circle', symbolSize: 6 }]
  });
  c.resize();
  window.addEventListener('resize', function() { c.resize(); });
})();
</script>
</body>
</html>"""

# Chunk size for streaming — ~20 characters per token event
CHUNK_SIZE = 20
# Delay between chunks in seconds — simulates LLM streaming speed
CHUNK_DELAY = 0.03


@router.post("/mock/generate")
async def mock_generate(
    req: GenerateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mock SSE streaming HTML generation — returns sample HTML instead of calling LLM.

    Follows the exact same SSE protocol as /api/generate (token → final → done)
    and creates a real Page record so save/publish flows work identically.
    Content filter is skipped in mock mode to allow testing with any prompt.
    """
    # Build page_id — reuse existing draft if page_id provided, otherwise create new
    from app.models import Page
    from sqlalchemy import select as _select

    existing_page = None
    if req.page_id is not None:
        result = await db.execute(
            _select(Page).where(
                Page.id == req.page_id,
                Page.user_id == user.id,
                Page.is_published == False,
            )
        )
        existing_page = result.scalar_one_or_none()

    distilled_title = _distill_title(req.prompt)
    if existing_page is not None:
        existing_page.title = distilled_title
        existing_page.html_content = MOCK_HTML
        existing_page.prompt = req.prompt
        existing_page.file_size = len(MOCK_HTML.encode("utf-8"))
        final_page_id = existing_page.id
    else:
        new_id = generate_id()
        page = Page(
            id=new_id,
            user_id=user.id,
            title=distilled_title,
            html_content=MOCK_HTML,
            prompt=req.prompt,
            file_size=len(MOCK_HTML.encode("utf-8")),
        )
        db.add(page)
        final_page_id = new_id

    await db.commit()

    async def event_stream():
        try:
            # Emit token chunks to simulate streaming
            for i in range(0, len(MOCK_HTML), CHUNK_SIZE):
                if await request.is_disconnected():
                    logger.info("Mock stream: client disconnected")
                    return
                chunk = MOCK_HTML[i:i + CHUNK_SIZE]
                yield f"data: {json.dumps({'type': 'token', 'content': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(CHUNK_DELAY)

            # Emit final event with complete HTML
            yield f"data: {json.dumps({'type': 'final', 'content': MOCK_HTML}, ensure_ascii=False)}\n\n"

            # Emit done event
            yield f"data: {json.dumps({'type': 'done', 'page_id': str(final_page_id), 'tokens_used': 0, 'title': distilled_title}, ensure_ascii=False)}\n\n"

        except asyncio.CancelledError:
            logger.info("Mock stream: cancelled")
        except Exception as e:
            logger.exception("Mock stream error")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
