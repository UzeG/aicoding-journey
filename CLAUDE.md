# Manifest · 可复用的 HTML 页面平台

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
  → 生成策略 GENERATION_STRATEGY（env）分发：
    two_step（默认）: Step 1 LLM 理解需求+选 CDN 库 → Step 2 流式返回 HTML token
    single_step（实验）: 单次 LLM 直出完整 HTML（含自写 CDN 标签），后端仅规范化 doctype/title，不校验 CDN
  → 前端 Monaco 实时追加 + iframe 防抖预览
  → 用户点击发布 → 安全扫描 → SDK 注入 → 生成 page_id → /{user_id}/{page_id} 公开访问
```

## 已有功能

- 用户注册/登录（JWT），支持手机号 + 自定义 user_id
- 个人资料（头像上传/昵称/简介 bio/README Markdown），header 右上角 avatar 下拉菜单
- 关注体系：关注/取关他人、粉丝/正在关注计数（主页卡片）、粉丝/关注列表（tab）
- 用户主页（GitHub 风格）：tab 栏置于系统 header 下方，`首页/项目/设置`；首页 = README + 4 条最新项目 + 活跃度贡献图（类似 contribution）
- 5 个推荐提示词（套餐对比、话费计算器、祝福贺卡、抽奖转盘、流量可视化）
- SSE 流式生成 + 左右分屏实时预览
- 一键发布 + `/{user_id}/{page_id}` 短链接
- 页面管理（列表、编辑、删除，区分发布/草稿），自动生成页面封面快照
- 发布页互动：点赞/收藏（toggle）+ 评论（发/删自己的），互动组件**服务期注入**到发布页（不落库、不进快照）
- LLM 配置（platform/user 两级优先级）
- API 代理网关（解决生成页面的 CORS 问题）
- **发布页互动（同源设计）**：dev 下应用(5173)与发布页(8000)不同源，互动组件读不到 JWT——故**发布页与应用同源**：Vite proxy 把两段 `{user_id}/{page_id}` 字符集路径代理到 8000，`VITE_PUBLIC_BASE_URL`/`PUBLIC_BASE_URL` 指向 5173，组件直接读 `localStorage.access_token`。互动 3 张表 `page_likes/page_comments/page_favorites`；`serve_page` 服务期注入 `<div id="platform-interactions" data-pk>` + `/static/interactions.js`。**互动 UI 右侧抽屉式**：PC 右缘箭头触发侧滑抽屉（宽 `min(90vw,1000px)`），两个 tab = 作者（头像+TA 其他作品）/ 评论，点赞收藏在面板头部；overlay 在页之上、不影响布局；移动端变底部抽屉；全部挂 `documentElement`；`textContent` 防 XSS、未登录弹窗→`/login?redirect=`。`render_page`（快照）不注入
- 内容安全：prompt 过滤 + 发布前 HTML 扫描 + iframe sandbox
- Platform SDK 自动注入（`window.platform`）
- 个人主题色（设置页 7 色可选，CSS 变量驱动全站换主色）

## 关键设计决策 & 已知陷阱

- **Snowflake ID 精度**：17 位 ID 超过 JS `Number.MAX_SAFE_INTEGER`（16 位），全程用 `string` 传递，禁止 `parseInt`。Pydantic schema 用 `@field_validator("id", mode="before")` 做 int→str 转换
- **PUBLIC_BASE_URL**：开发环境配 `http://localhost:8000`（已发布页面由后端直接 serve，前端通过 `VITE_PUBLIC_BASE_URL` 拼绝对地址访问）
- **CDN 库**：LLM 生成的 HTML 使用 UnoCSS runtime（`@unocss/runtime`），不是 Tailwind CSS CDN（那个文件 404）
- **ECharts**：用 `ResizeObserver` 监听容器尺寸（不要用 `window.resize` 事件，首次加载不触发）
- **LLM 输出过滤**：后端流式输出会缓冲直到检测到 HTML 开始标记（`\`\`\`html` / `<!DOCTYPE` / `<html>`），再转发 token 给前端。流结束后发送 `final` 事件用精确提取的 HTML 替换 Monaco 内容
- **两步 LLM**：Step 1 理解需求 + 选 CDN 库 → Step 2 根据选中库注入 system prompt 生成 HTML。避免全量 CDN 列表暗示 LLM 添加不必要的图表/3D
- **单阶段策略（实验）**：`GENERATION_STRATEGY=single_step` 时跳过 Step 1，`get_single_step_prompt()` 把 `LIBRARY_REGISTRY` 全部 CDN 规则内嵌进单阶段 prompt，LLM 直出完整 HTML 文档（自行照抄 CDN 标签放进 `<head>`）；`_assemble_single_step` 仅规范化 doctype/charset/title，**不校验/剔除 CDN**。主链路读 env、测试台按次传 `strategy`，共用 `create_generation_stream` 分发；`generation_traces.strategy` 记录用于 A/B 对比
- **URL 方案**：`/{user_id}` 用户主页，`/{user_id}/{page_id}` 已发布页面，支持 page_id 修改后 301 重定向。主页 tab 用 query 驱动（`?tab=overview|projects|settings`，默认 overview），避免与发布页路径冲突；粉丝/关注列表不在 tab，走左侧卡片计数触发的弹窗
- **关注体系**：`follows` 表（follower_id/following_id 唯一约束、禁自关注）。`GET /api/users/{user_id}` 返回 `follower_count`/`following_count`/`is_following`（viewer 依赖，`get_optional_user`）。关注/取关返回最新 `follower_count`，前端乐观更新 + 失败回滚
- **README**：存 `users.readme`（TEXT，≤20000 字符，编辑资料弹窗录入）。渲染用 `react-markdown` + `remark-gfm`（默认禁 raw HTML，防 XSS）——**禁止 dangerouslySetInnerHTML**
- **个人主题色**：存 `users.theme`（`#RRGGBB`，迁移补列，`PUT /api/auth/me` 正则校验并落库小写）。前端 `lib/theme.ts` 覆盖 CSS 变量 `--primary/--ring/--live` 实现全站换主色（只换主色，纸面/墨色保持统一），设置页 7 色色卡，localStorage 缓存加速首帧
- **活跃度贡献图**：`GET /api/users/{user_id}/activity?year=` 按 `pages.created_at` 每日聚合（UTC `strftime('%Y-%m-%d')`），响应含 `years` 供年份选择。前端纯 CSS 热力图（52×7 格，flex-1 铺满对齐图例；hover 自定义 tooltip；月份标签；年份选择 PC 右上 / 手机下方下拉）
- **user_id / page_id**：大小写不敏感匹配，存储保留原始大小写
- **头像存储**：后端文件存储（方案 C）——`POST /api/auth/me/avatar` 上传，存 `backend/static/avatars/`，DB 存相对 URL `/static/avatars/xxx.png`。前端经 Vite proxy `/static` 加载。文件格式按 magic bytes 校验（防改扩展名），≤2MB
- **个人主页**：`GET /api/users/{user_id}` 用 `get_optional_user` 判断是否本人——本人返回含草稿，他人只返回已发布。tab 栏 sticky 在 header 下方（`top-[var(--header-height)]`），左侧卡片 sticky 需再加 `--profile-tab-height`（见 `index.css`）
- **页面封面快照**：生成完成后异步用 Playwright + 系统 Chrome 打开内部渲染端点 `GET /api/pages/{pk}/render`（JWT header 鉴权，仅本人）截图，存 `backend/static/snapshots/{page_pk}.png`，写回 `page.cover_url`。视口 1280×720（16:9），等 load + 2.5s（不能用 networkidle，无限动画页面永不结束），并发信号量 2，失败降级保留旧封面
