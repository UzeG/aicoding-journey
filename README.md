# Ship · 一句话部署网页工具 — Demo

自然语言 → HTML 页面 → 公网链接，端到端自动化。

## 快速启动

### 1. 配置 LLM API Key

编辑 `backend/.env`，填入你的 LLM API Key：

```bash
LLM_MODEL=deepseek-chat              # 模型名称
LLM_API_KEY=sk-your-api-key-here     # ⚠️ 必填：你的 API Key
LLM_BASE_URL=https://api.deepseek.com # API 地址
```

支持的模型和 Base URL 见 Settings 页面下拉选项。

### 2. 初始化数据库

```bash
conda activate aicoding-platform
cd backend
python -m app.seed
```

这会创建 SQLite 数据库、预设 5 个推荐提示词和一个 Demo 用户（13800138000 / 123456，user_id=demo）。

### 3. 启动后端

```bash
conda activate aicoding-platform
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:5173

## 使用流程

1. 打开 http://localhost:5173 → 看到首页 + 5 个推荐提示词
2. 注册/登录（或用 Demo 账号：13800138000 / 123456，支持手机号或 user_id=demo 登录）
3. 输入描述或点击推荐提示词 → 跳转到生成器
4. 左侧代码实时流式打出，右侧 iframe 实时预览
5. 点击「发布页面」→ 设置 page_id → 获得短链接 `/{你的user_id}/{page_id}`
6. 点击右上角头像 → 菜单进入「我的主页」，管理项目（发布/草稿，带自动封面快照）、编辑资料、配置 LLM
7. 「我的主页 → 设置」里可选个人主题色（7 色），登录后全站跟随你的主色

## LLM 配置

两个配置入口：

| 位置 | 说明 | 优先级 |
|---|---|---|
| `backend/.env` | 平台级默认值，所有用户共用 | 最低 |
| 个人页面的设置 tab（`/{user_id}?tab=settings`） | 用户级配置，加密存储 | 最高 |

## 项目结构

```
├── frontend/          # React + TypeScript + TailwindCSS 4 + Monaco Editor
│   └── src/
│       ├── components/  # UI 组件
│       ├── views/       # 页面
│       ├── stores/      # Zustand 状态管理
│       ├── hooks/       # useSSE 等自定义 hooks
│       └── api/         # API 客户端
├── backend/           # Python FastAPI
│   └── app/
│       ├── api/         # 路由 (auth, generate, pages, prompts, proxy, settings)
│       ├── services/    # 业务逻辑 (LLM, SSE, 安全扫描, SDK 注入)
│       ├── models/      # ORM 模型
│       └── schemas/     # Pydantic 模型
└── reports/           # 参考文档
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite + TailwindCSS 4 + Monaco Editor + Zustand |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy async + SQLite |
| AI | OpenAI Python SDK (兼容 DeepSeek / 通义千问 / OpenAI) |
