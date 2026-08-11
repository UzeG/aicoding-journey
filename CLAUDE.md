# AI Coding HTML 托管平台

自然语言 → LLM 流式生成 HTML → 一键发布为公网短链接 的端到端 Demo。

## 项目结构

```
├── frontend/          # React 19 + TypeScript + Vite + TailwindCSS 4
├── backend/           # Python 3.12 + FastAPI + SQLAlchemy async + SQLite
└── reports/           # 产品报告 & 技术报告（参考文档）
```

## 快速启动

```bash
# 后端
conda activate aicoding-platform
cd backend && uvicorn app.main:app --port 8000 --reload

# 前端
cd frontend && npm run dev
```

前端 dev server 已配置 proxy：`/api` 和 `/p` 自动转发到 `localhost:8000`。

## 环境

| 工具 | 位置 |
|---|---|
| Python 环境 | conda env `aicoding-platform` (Python 3.12) |
| 数据库 | SQLite (`backend/htmlhost.db`)，种子数据通过 `python -m app.seed` 初始化 |
| LLM 配置 | `backend/.env`（平台默认）+ Settings 页面（用户级，加密存库） |
| Demo 账号 | 13800138000 / 123456 |

## 核心链路

```
用户输入 prompt → POST /api/generate (SSE)
  → LLM 流式返回 token → 前端 Monaco 实时追加 + iframe 防抖预览
  → 用户点击发布 → 安全扫描 → SDK 注入 → 生成短码 → /p/{short_code} 公开访问
```

## 已有功能

- 用户注册/登录（JWT）
- 5 个预设模板场景（套餐对比、话费计算器、祝福贺卡、抽奖转盘、流量可视化）
- SSE 流式生成 + 左右分屏实时预览
- 一键发布 + 短链接
- 页面管理（列表、编辑、删除）
- LLM 配置（platform/user/request 三级优先级）
- API 代理网关（解决生成页面的 CORS 问题）
- 内容安全：prompt 过滤 + 发布前 HTML 扫描 + iframe sandbox
- Platform SDK 自动注入（`window.platform`）

## 关键设计决策 & 已知陷阱

- **Snowflake ID 精度**：17 位 ID 超过 JS `Number.MAX_SAFE_INTEGER`（16 位），全程用 `string` 传递，禁止 `parseInt`。Pydantic schema 用 `@field_validator("id", mode="before")` 做 int→str 转换
- **PUBLIC_BASE_URL**：开发环境配 `http://localhost:5173`（走 Vite proxy），不是 8000
- **CDN 库**：LLM 生成的 HTML 使用 UnoCSS runtime（`@unocss/runtime`），不是 Tailwind CSS CDN（那个文件 404）
- **ECharts**：必须在 `setOption()` 后立即调用 `chart.resize()`，否则容器宽度未就绪导致横向溢出
- **LLM 输出过滤**：后端流式输出会缓冲直到检测到 HTML 开始标记（`\`\`\`html` / `<!DOCTYPE` / `<html>`），再转发 token 给前端。流结束后发送 `final` 事件用精确提取的 HTML 替换 Monaco 内容
