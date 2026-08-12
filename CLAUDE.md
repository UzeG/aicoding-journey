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

前端 dev server 已配置 proxy：`/api` 自动转发到 `localhost:8000`。已发布页面直接访问 `http://localhost:8000/{user_id}/{page_id}`（PUBLIC_BASE_URL 指向 8000）。

## 环境

| 工具 | 位置 |
|---|---|
| Python 环境 | conda env `aicoding-platform` (Python 3.12) |
| 数据库 | SQLite (`backend/htmlhost.db`)，种子数据通过 `python -m app.seed` 初始化 |
| LLM 配置 | `backend/.env`（平台默认）+ Settings 页面（用户级，加密存库） |
| Demo 账号 | 13800138000 / 123456，user_id=demo |

## 核心链路

```
用户输入 prompt → POST /api/generate (SSE)
  → Step 1 LLM: 理解需求 + 选择 CDN 库
  → Step 2 LLM: 流式返回 HTML token
  → 前端 Monaco 实时追加 + iframe 防抖预览
  → 用户点击发布 → 安全扫描 → SDK 注入 → 生成 page_id → /{user_id}/{page_id} 公开访问
```

## 已有功能

- 用户注册/登录（JWT），支持手机号 + 自定义 user_id
- 个人资料（头像上传/昵称/简介 bio），header 右上角 avatar 下拉菜单
- 用户主页（GitHub 风格）：左侧资料卡片 + 右侧「项目/设置」tab（query 驱动）
- 5 个推荐提示词（套餐对比、话费计算器、祝福贺卡、抽奖转盘、流量可视化）
- SSE 流式生成 + 左右分屏实时预览
- 一键发布 + `/{user_id}/{page_id}` 短链接
- 页面管理（列表、编辑、删除，区分发布/草稿）
- LLM 配置（platform/user/request 三级优先级）
- API 代理网关（解决生成页面的 CORS 问题）
- 内容安全：prompt 过滤 + 发布前 HTML 扫描 + iframe sandbox
- Platform SDK 自动注入（`window.platform`）

## 关键设计决策 & 已知陷阱

- **Snowflake ID 精度**：17 位 ID 超过 JS `Number.MAX_SAFE_INTEGER`（16 位），全程用 `string` 传递，禁止 `parseInt`。Pydantic schema 用 `@field_validator("id", mode="before")` 做 int→str 转换
- **PUBLIC_BASE_URL**：开发环境配 `http://localhost:8000`（已发布页面由后端直接 serve，前端通过 `VITE_PUBLIC_BASE_URL` 拼绝对地址访问）
- **CDN 库**：LLM 生成的 HTML 使用 UnoCSS runtime（`@unocss/runtime`），不是 Tailwind CSS CDN（那个文件 404）
- **ECharts**：用 `ResizeObserver` 监听容器尺寸（不要用 `window.resize` 事件，首次加载不触发）
- **LLM 输出过滤**：后端流式输出会缓冲直到检测到 HTML 开始标记（`\`\`\`html` / `<!DOCTYPE` / `<html>`），再转发 token 给前端。流结束后发送 `final` 事件用精确提取的 HTML 替换 Monaco 内容
- **两步 LLM**：Step 1 理解需求 + 选 CDN 库 → Step 2 根据选中库注入 system prompt 生成 HTML。避免全量 CDN 列表暗示 LLM 添加不必要的图表/3D
- **URL 方案**：`/{user_id}` 用户主页，`/{user_id}/{page_id}` 已发布页面，支持 page_id 修改后 301 重定向。主页 tab 用 query 驱动（`?tab=settings`），避免与发布页路径冲突
- **user_id / page_id**：大小写不敏感匹配，存储保留原始大小写
- **头像存储**：后端文件存储（方案 C）——`POST /api/auth/me/avatar` 上传，存 `backend/static/avatars/`，DB 存相对 URL `/static/avatars/xxx.png`。前端经 Vite proxy `/static` 加载。文件格式按 magic bytes 校验（防改扩展名），≤2MB
- **个人主页**：`GET /api/users/{user_id}` 用 `get_optional_user` 判断是否本人——本人返回含草稿，他人只返回已发布
