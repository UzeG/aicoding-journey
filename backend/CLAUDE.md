# Backend — AI Coding HTML 托管平台

Python 3.12 + FastAPI + SQLAlchemy async + SQLite。

## 环境

```bash
conda activate aicoding-platform
pip install -r requirements.txt    # 已有环境则跳过
python -m app.seed                 # 初始化 DB + 种子数据
uvicorn app.main:app --port 8000 --reload
```

## 目录结构

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py            # pydantic-settings, 读 .env
│   ├── database.py          # SQLAlchemy async engine + session
│   ├── seed.py              # 种子数据（模板 + demo 用户）
│   ├── models/__init__.py   # User, Page, Template, AuditLog ORM
│   ├── schemas/__init__.py  # Pydantic 请求/响应模型
│   ├── api/                 # 路由层
│   │   ├── auth.py          # /api/auth/{register,login,me}
│   │   ├── generate.py      # /api/generate (SSE 流式) ★核心
│   │   ├── pages.py         # /api/pages CRUD + /p/{short_code} 公开访问
│   │   ├── templates.py     # /api/templates
│   │   ├── proxy.py         # /api/proxy (CORS 代理)
│   │   ├── settings.py      # /api/settings/llm (用户 LLM 配置)
│   │   └── deps.py          # get_current_user, get_db, get_client_ip
│   ├── services/            # 业务逻辑层
│   │   ├── llm_service.py   # OpenAI SDK 封装, SSE stream 生成
│   │   ├── system_prompt.py # System Prompt 模板 + 场景追加
│   │   ├── short_url.py     # 短链接生成
│   │   ├── sdk_injector.py  # Platform SDK 注入
│   │   ├── publish_scanner.py # 发布前 HTML 安全扫描
│   │   ├── content_filter.py  # Prompt 敏感词过滤
│   │   └── proxy_service.py   # API 代理 (SSRF 防护 + 域名白名单)
│   ├── middleware/
│   └── utils/
│       ├── __init__.py      # hash_password, verify_password, JWT
│       └── snowflake.py     # Snowflake ID → Base62 短码
├── .env                     # 实际配置（gitignore）
├── .env.example             # 配置模板
└── requirements.txt
```

## API 概览

| Method | Path | Auth | 说明 |
|---|---|---|---|
| POST | /api/auth/register | No | 注册 |
| POST | /api/auth/login | No | 登录 |
| GET | /api/auth/me | JWT | 用户信息 |
| POST | /api/generate | JWT | SSE 流式生成 HTML |
| GET | /api/pages | JWT | 页面列表 |
| GET/PUT/DELETE | /api/pages/{id} | JWT | 页面 CRUD |
| POST | /api/pages/{id}/publish | JWT | 发布 |
| GET | /p/{short_code} | No | 公开访问已发布页面 |
| GET | /api/templates | No | 模板列表 |
| POST | /api/proxy | No | API 代理网关 |
| GET/PUT | /api/settings/llm | JWT | LLM 配置 |

## 关键设计决策

- **数据库**: SQLite + aiosqlite（Demo 简化；生产应切 PostgreSQL）
- **ID 类型**: Page 用 Snowflake BigInteger（17+ 位），API 层全程 `str`，DB 查询时 `int(page_id)` 转换。Pydantic schema 的 `id: str` 字段必须加 `@field_validator("id", mode="before")` 做 int→str 转换——Pydantic v2 不会自动转换！
- **API Key 存储**: Fernet 对称加密（`ENCRYPTION_KEY` 环境变量）
- **SSE**: `StreamingResponse` + `text/event-stream`，headers 含 `X-Accel-Buffering: no`
- **SSE 事件协议**: `token`（流式代码） → `final`（精确提取的 HTML，替换 Monaco 内容） → `done`（page_id + tokens_used） → 可选 `error`
- **流式过滤**: `create_llm_stream` 会缓冲 token 直到检测到 HTML 开始标记（`\`\`\`html` / `<!DOCTYPE` / `<html>`），才转发给前端。防止 LLM 输出的中文描述文字混入 Monaco 编辑器
- **Page 复用**: `GenerateRequest.page_id` 可选字段——前端重新生成时传入已有 pageId，后端在 `create_llm_stream` 中检查：若页面存在、属于当前用户且 `is_published=False`，则 UPDATE 该记录而非 INSERT 新记录；已发布的页面不会被覆盖（会创建新 Page）。这避免了"我的页面"中出现多余的草稿记录
- **LLM 优先级**: 请求参数 > 用户配置 > `.env` 平台默认
- **短码**: Snowflake ID → Base62 → 取后 7 位
- **passlib/bcrypt**: 需 `bcrypt<4.1.0`（新版不兼容 passlib）
- **PUBLIC_BASE_URL**: 默认 `http://localhost:5173`（开发走 Vite proxy）
- **max_tokens**: 8192（太小会导致 HTML 生成不完整）
- **System Prompt**: UnoCSS runtime CDN（非 Tailwind！后者 npm 包无预编译 CSS），ECharts 强制 `setOption` 后 `resize()`
