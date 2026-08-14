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
│   ├── seed.py              # 种子数据（推荐提示词 + demo 用户）
│   ├── models/__init__.py   # User(avatar_url/bio/readme), Page(cover_url), Follow, PageIdRedirect, RecommendedPrompt, AuditLog ORM
│   ├── schemas/__init__.py  # Pydantic 请求/响应模型
│   ├── api/                 # 路由层
│   │   ├── __init__.py      # 路由注册
│   │   ├── auth.py          # /api/auth/{register,login,me,check,me/avatar}
│   │   ├── generate.py      # /api/generate (SSE 流式) ★核心
│   │   ├── pages.py         # /api/pages CRUD + /{user_id}/{page_id} 公开访问
│   │   ├── prompts.py       # /api/prompts
│   │   ├── proxy.py         # /api/proxy (CORS 代理)
│   │   ├── settings.py      # /api/settings/llm (用户 LLM 配置)
│   │   ├── mock.py          # /api/mock/generate (开发用，跳过 LLM)
│   │   └── deps.py          # get_current_user, get_db, get_client_ip
│   ├── services/            # 业务逻辑层
│   │   ├── llm_service.py   # OpenAI SDK 封装, 两步 SSE stream 生成
│   │   ├── system_prompt.py # Step 1/2 System Prompt
│   │   ├── library_registry.py # CDN 库注册表
│   │   ├── page_id.py       # page_id 生成与校验
│   │   ├── snapshot.py      # 页面封面快照（Playwright + headless Chrome）
│   │   ├── sdk_injector.py  # Platform SDK 注入
│   │   ├── publish_scanner.py # 发布前 HTML 安全扫描
│   │   ├── content_filter.py  # Prompt 敏感词过滤
│   │   └── proxy_service.py   # API 代理 (SSRF 防护 + 域名白名单)
│   ├── middleware/
│   └── utils/
│       ├── __init__.py      # hash_password, verify_password, JWT
│       └── snowflake.py     # Snowflake ID → Base62
├── static/                  # 静态文件（avatars/），main.py mount 到 /static
├── .env                     # 实际配置（gitignore）
├── .env.example             # 配置模板
└── requirements.txt
```

## API 概览

| Method | Path | Auth | 说明 |
|---|---|---|---|
| POST | /api/auth/register | No | 注册（需 user_id） |
| POST | /api/auth/login | No | 登录（手机号或 user_id） |
| GET | /api/auth/me | JWT | 用户信息（含 avatar_url/bio） |
| PUT | /api/auth/me | JWT | 更新资料（nickname/bio/readme） |
| POST | /api/auth/me/avatar | JWT | 上传头像（multipart，≤2MB） |
| GET | /api/auth/check?user_id= | No | 检查 user_id 可用性 |
| POST | /api/generate | JWT | SSE 流式生成 HTML（两步 LLM） |
| POST | /api/mock/generate | JWT | Mock SSE 流式（开发用，跳过 LLM） |
| GET | /api/pages | JWT | 页面列表 |
| GET / PUT / DELETE | /api/pages/{pk} | JWT | 页面 CRUD（pk 为 DB 主键） |
| POST | /api/pages/{pk}/publish | JWT | 发布（可选自定义 page_id） |
| POST | /api/pages/{pk}/save-draft | JWT | 保存草稿（is_saved=True） |
| GET | /api/pages/{pk}/render | JWT | 内部渲染端点（返回完整 HTML，快照截图用，仅本人） |
| GET | /api/pages/check-id?page_id= | JWT | 检查 page_id 可用性 |
| PUT | /api/pages/{pk}/page-id | JWT | 修改 page_id（旧→新 301 重定向） |
| GET | /api/prompts | No | 推荐提示词列表 |
| GET | /api/users/{user_id} | No | 用户公开信息 + 已发布页面 + 关注统计（follower_count/following_count/is_following） |
| POST | /api/users/{user_id}/follow | JWT | 关注（禁自关注，幂等） |
| DELETE | /api/users/{user_id}/follow | JWT | 取关（幂等） |
| GET | /api/users/{user_id}/followers | No | 关注者列表（is_following 为 viewer 是否关注该用户） |
| GET | /api/users/{user_id}/following | No | 正在关注列表 |
| GET | /api/users/{user_id}/activity?days= | No | 每日页面创建数（近 N 天，默认 365，活跃度贡献图数据） |
| POST | /api/pages/upload | JWT | 上传 .html/.htm 为草稿页（≤5MB，内容需含 <html>/<!DOCTYPE>） |
| POST | /api/proxy | No | API 代理网关 |
| GET / PUT | /api/settings/llm | JWT | LLM 配置 |
| GET | /{user_id} | No | 用户主页 HTML |
| GET | /{user_id}/{page_id} | No | 已发布页面（含 301 重定向支持） |
| GET | /api/admin/stats | Admin | 概览计数（用户/页面/轨迹/审计等） |
| GET | /api/admin/users | Admin | 用户列表（search/page/page_size，含 pages_count） |
| GET | /api/admin/users/{id} | Admin | 用户详情（LLM 配置只返回 has_api_key） |
| GET | /api/admin/pages | Admin | 页面列表（含 user_nickname） |
| GET | /api/admin/pages/{pk} | Admin | 页面详情（含 step1_output + html_content） |
| GET | /api/admin/traces | Admin | 生成轨迹列表（不返回大字段，可 source/status 过滤） |
| GET | /api/admin/traces/{id} | Admin | 轨迹详情（含 step2_raw / final_html） |
| GET | /api/admin/audit-logs | Admin | 审计日志列表 |
| GET | /api/admin/llm-configs | Admin | 平台默认 + 用户自定义 LLM 配置（key 脱敏） |
| GET | /api/admin/system-prompts | Admin | 当前 Step 1/2 System Prompt 现文 |
| POST | /api/admin/test-generate | Admin | SSE 测试台：verbose 流，不走 content filter、不落 Page，记录 source=test 轨迹 |

## 关键设计决策

- **数据库**: SQLite + aiosqlite（Demo 简化；生产应切 PostgreSQL）
- **ID 类型**: Page 用 Snowflake BigInteger（17+ 位），API 层全程 `str`，DB 查询时 `int(pk)` 转换。Pydantic schema 的 `id: str` 字段必须加 `@field_validator("id", mode="before")` 做 int→str 转换——Pydantic v2 不会自动转换！
- **API Key 存储**: Fernet 对称加密（`ENCRYPTION_KEY` 环境变量）
- **SSE**: `StreamingResponse` + `text/event-stream`，headers 含 `X-Accel-Buffering: no`
- **SSE 事件协议**: `progress`（Step 1/2 进度） → `token`（流式代码） → `final`（精确提取的 HTML，替换 Monaco 内容） → `done`（page_id + title + tokens_used） → 可选 `error`
- **流式过滤**: `create_llm_stream` 会缓冲 token 直到检测到 HTML 开始标记（`\`\`\`html` / `<!DOCTYPE` / `<html>`），才转发给前端。防止 LLM 输出的中文描述文字混入 Monaco 编辑器
- **两步 LLM**: Step 1 理解需求 + 从注册表选 CDN 库 → Step 2 根据选中库注入对应的 system prompt（含 CDN 链接 + 使用规范）。避免全量库列表暗示 LLM 添加不必要的图表/3D
- **片段解析**: `_parse_fragment` 用 BeautifulSoup 提取 LLM 输出的 `<style>`/`<body>`/`<script>`（不用正则，避免脚本被静默丢弃）。支持普通 `<script>` 与 `<script type="module">`、多个 script、script 在 body 内；组装时统一包成 `<script type="module">`。若检测到交互痕迹（`<script>`/`onclick`/`addEventListener`）但提取不到 JS，记 warning
- **封面快照**: 生成完成后 `asyncio.create_task(capture_snapshot(...))` 异步截图（不阻塞 SSE）。用 Playwright 复用系统 Chrome（`executable_path`，headless），JWT 通过 context `extra_http_headers` 传给内部渲染端点。**陷阱**：`get_current_user` 只读 Authorization header 不读 query；`page.goto` 无 headers 参数必须用 `new_context(extra_http_headers=...)`；等待用 `load` + sleep 而非 `networkidle`（无限动画页面永不空闲）。依赖 `playwright` 包 + 系统 Chrome，缺失时快照自动禁用
- **Page 复用**: `GenerateRequest.page_id` 可选字段——前端重新生成时传入已有 pageId，后端在 `create_llm_stream` 中检查：若页面存在、属于当前用户且 `is_published=False`，则 UPDATE 该记录而非 INSERT 新记录；已发布的页面不会被覆盖（会创建新 Page）
- **is_saved 机制**: 生成时 `is_saved=False`，页面不会出现在列表（`list_pages` 过滤 `is_published OR is_saved`）。用户主动点击"保存草稿"后 `is_saved=True`，页面才在用户主页中可见
- **LLM 优先级**: 用户配置 > `.env` 平台默认（api_key 由 `_build_client` 统一解密，仅一处）
- **user_id**: 注册必填，大小写不敏感匹配（存储保留原始大小写），保留字禁止注册。支持作为登录凭据
- **头像存储**: 上传端点 `POST /api/auth/me/avatar`（multipart），格式按 magic bytes 校验（jpg/png/webp/gif），存 `static/avatars/{user_id}_{ts}.{ext}`，换头像删旧文件，DB 存相对 URL。`main.py` mount `/static`
- **关注体系**: `Follow` 表（`follower_id`/`following_id` 唯一约束 `uq_follow_pair`，禁自关注）。follow/unfollow 幂等、返回最新 `follower_count`；followers/following 列表用 `Follow JOIN User` + `_build_follow_items` 批量算 viewer 的 `is_following`。新表由 `create_all` 自动建，无需迁移脚本
- **README**: `users.readme` TEXT 列（迁移在 `_run_migration_sync` 加 `ALTER TABLE users ADD COLUMN readme TEXT`）。`GET /api/users/{user_id}` 与 `PUT /api/auth/me` 均带 readme；空串存为 NULL
- **活跃度**: `GET /api/users/{user_id}/activity` 按 `strftime('%Y-%m-%d', pages.created_at)` 每日聚合（UTC，`datetime.utcnow()`），补齐全部日期返回固定长度数组；口径 = 每天创建页面数
- **get_optional_user**: 公开端点的可选鉴权依赖（有 token 解析用户，无则 None）。`get_user_profile` 用它判断是否本人，本人返回 `is_published OR is_saved`（含草稿），他人只返回已发布
- **page_id**: 发布时可自定义，同用户内唯一（大小写不敏感）。修改时旧 page_id 记录到 `page_id_redirects` 表，访问旧链接 301 重定向
- **passlib/bcrypt**: 需 `bcrypt<4.1.0`（新版不兼容 passlib）
- **PUBLIC_BASE_URL**: 开发环境配 `http://localhost:8000`（已发布页面由后端直接 serve）
- **max_tokens**: 32768（DeepSeek V4 支持最大 384K，32K 足够大部分 HTML 页面）
- **System Prompt**: UnoCSS runtime CDN（非 Tailwind！后者 npm 包无预编译 CSS），ECharts 强制 `ResizeObserver` 监听容器
- **Mock API**: `/api/mock/generate`（`app/api/mock.py`）返回硬编码样本 HTML，与正式端点 SSE 协议一致，同样创建 DB 记录。前端通过 `npm run dev:mock` 启用（Vite proxy rewrite `/api/generate` → `/api/mock/generate`）。Mock 端点跳过 content filter
- **ENVIRONMENT**: `config.py` 新增 `ENVIRONMENT` 字段（默认 `"development"`），附带 `is_development()` / `is_production()` 便捷方法
- **管理员**: `config.py` 的 `ADMIN_USER_IDS`（逗号分隔 phone 或 user_id，大小写不敏感）。`deps.py` 的 `is_admin_user(user)` / `get_current_admin` 判断；`GET /api/auth/me` 返回 `is_admin`。空配置 → 全员无后台权限（安全默认）
- **生成轨迹**: `create_two_step_stream` 每次运行自动写 `generation_traces`（Step1 JSON / Step2 原始流 / token / 耗时 / 生效 model·base_url·config_source / status / error）。通过 `try/finally` 落库，写失败仅 log 不打断生成。kwargs：`persist=False`（测试台不落 Page）、`verbose=True`（额外 yield `step1`/`token_raw` 事件）、`source`（`generation`|`test`）。mock 路径不产生 trace
