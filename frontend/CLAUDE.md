# Frontend — Manifest 可复用的 HTML 页面平台

React 19 + TypeScript + Vite + TailwindCSS 4 + Monaco Editor + Zustand + shadcn/ui + lucide-react。

## 启动

```bash
cd frontend
npm install        # 首次
npm run dev        # http://localhost:5173（正式模式，真实 LLM 调用）
npm run dev:mock   # Mock 模式（跳过 LLM，使用样本 HTML，零 Token 消耗）
```

Vite proxy 配置：`/api`、`/static` 转发到 `http://localhost:8000`；**发布页同源**——`'/'` 代理用 `bypass` 把两段非 `/admin` 路径（`/{user}/{page}`）转发到 8000，其余走 SPA。Mock 模式下 `/api/generate` 被 rewrite 为 `/api/mock/generate`。**页面链接一律相对路径** `/{user_id}/{page_id}`（不再用 `VITE_PUBLIC_BASE_URL` 拼绝对地址；发布页与应用同源，互动组件才能读到 JWT）。

## 目录结构

```
frontend/src/
├── App.tsx                       # BrowserRouter + 路由
├── main.tsx                      # 入口
├── index.css                     # TailwindCSS
├── types/index.ts                # 公共类型定义
├── api/
│   ├── client.ts                 # axios 实例 (baseURL, JWT 拦截器, 401 处理)
│   └── endpoints.ts              # 所有 API 函数
├── data/
│   └── showcase.ts               # 首页示例作品静态假数据（TODO 接入真实发布数据）
├── lib/
│   ├── utils.ts                  # cn() 工具函数 (clsx + tailwind-merge, shadcn 依赖)
│   ├── promptMeta.ts             # 推荐提示词关键词 → icon/accent/label 映射
│   ├── theme.ts                  # 个人主题色：色卡/applyTheme(覆盖 --primary)/cache
│   └── download.ts               # downloadHtml / sanitizeFilename（Blob 下载，中文文件名安全）
├── stores/                       # Zustand
│   ├── auth.ts                   # 登录状态, user, fetchUser, logout
│   └── generation.ts             # 生成状态: isStreaming, codeContent, pageId, isSaved, progressStep
├── hooks/
│   └── useSSE.ts                 # SSE 流式消费 (fetch + ReadableStream)
├── components/
│   ├── ui/                       # shadcn/ui 组件 (Button/Input/Textarea/Card/Badge/Dialog/Select/Label)
│   ├── layout/AppHeader.tsx      # header (logo + 右侧 avatar 下拉菜单)
│   ├── home/                     # 首页区块组件
│   │   ├── HeroInput.tsx          # hero 输入区（上传/生成 分段切换，实际上传为草稿）
│   │   ├── HeroPreview.tsx        # hero 部署演示（上传或生成→页面组装→已上线，自演+随输入）
│   │   ├── HeroBackground.tsx     # hero Three.js 背景（细点+鼠标视差/推开+点击圆环，懒加载 three）
│   │   ├── PromptCard.tsx         # 推荐提示词卡片（图标 + 分类标签）
│   │   ├── PromptCardSkeleton.tsx # 推荐提示词加载骨架屏
│   │   ├── ShowcaseSection.tsx    # 示例作品展示区（静态假数据）
│   │   ├── MockThumbnail.tsx      # CSS 手绘页面骨架缩略图
│   │   ├── HowItWorks.tsx         # 三步流程区块
│   │   ├── FeaturesSection.tsx    # 平台特性区块
│   │   └── HomeFooter.tsx         # 首页 CTA + footer
│   ├── creation/
│   │   ├── PromptInput.tsx       # textarea + 发送按钮
│   │   ├── CodePanel.tsx         # Monaco Editor (生成中只读，否则可编辑 onChange 回写 store)
│   │   ├── PreviewPanel.tsx      # iframe sandbox (500ms 防抖 srcdoc)
│   │   ├── PublishButton.tsx     # 发布 + 新窗口打开 + 跳转用户主页
│   │   ├── SaveDraftButton.tsx   # 保存草稿 (is_saved=True 后列表可见；携带编辑器 html_content)
│   │   ├── UploadToEditorButton.tsx # 上传 html → 确认覆盖编辑器 → 上层**本地读取**覆盖内容（无需登录；发布/存草稿才需登录）
│   │   └── SavePageDialog.tsx    # 发布/保存表单 (标题 + page_id 实时校验；发布时含 tags 编辑：AI 预填、回车/逗号添加、chips 删除，≤5×20)
│   ├── user/                     # 个人主页专属组件
│   │   ├── ProjectCard.tsx        # 项目卡片（16:9 封面 + 下载/编辑/删除）
│   │   └── FollowList.tsx         # 关注者/正在关注列表（可回关）
│   └── common/
│       ├── Avatar.tsx            # 头像组件 (有图显示图，无图显示首字母)
│       ├── LoadingSpinner.tsx
│       ├── ConfirmDialog.tsx
│       ├── DownloadButton.tsx    # 下载 HTML（同步/异步 getContent，自带 loading）
│       ├── UploadHtmlButton.tsx  # 【已停用】上传 .html/.htm 为草稿（个人页上传入口已改为「去创作」→ /creation）
│       ├── FollowButton.tsx      # 关注/取关（乐观更新 + 未登录跳 /login）
│       ├── ContributionHeatmap.tsx # 活跃度贡献热力图（纯 CSS，52×7 格）
│       └── Markdown.tsx          # react-markdown + remark-gfm 封装（.markdown-body 样式）
└── views/
    ├── HomeView.tsx              # 首页（双栏 Hero：左文案+输入 / 右工具预览，+ Three.js 背景动效）
    ├── CreationView.tsx          # 创作页 ★核心页面（路由 /creation）
    ├── GalleryView.tsx           # 作品广场：卡片墙 + tag 筛选 chips + 最新/最热排序 + 搜索 + 分页；tag/q/sort/page 全部 URL query 驱动（useSearchParams，replace 防历史堆积，搜索防抖回写）
    ├── UserProfileView.tsx       # 用户主页（tab 栏下移 header；首页/项目/设置）
    ├── LoginView.tsx             # 登录/注册（支持手机号 + user_id）
    └── SettingsView.tsx          # LLM 配置（复用为主页设置 tab）
```

## 路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | HomeView | 首页 + 推荐提示词 |
| `/creation` | CreationView | 创作页（支持 ?prompt=&pageId=；header「创作」入口） |
| `/gallery` | GalleryView | 作品广场（公开浏览已发布页面，tag 筛选/搜索/排序/分页；筛选状态在 URL query `?tag=&q=&sort=&page=`，置于 `/:userId` 前防路由冲突） |
| `/:userId` | UserProfileView | 用户主页（自己=管理，别人=只读） |
| `/home` | HomeRedirect | 重定向到 /{当前用户id} |
| `/login` | LoginView | 登录/注册 |
| `/admin` | AdminLayout + AdminOverviewView | 后台管理（AdminLayout 守卫：未登录跳 /login，非 is_admin 显示无权限） |
| `/admin/users` · `/admin/users/:id` | AdminUsersView · AdminUserDetailView | 用户列表/详情 |
| `/admin/pages` · `/admin/pages/:pk` | AdminPagesView · AdminPageDetailView | 页面列表/详情 |
| `/admin/traces` · `/admin/traces/:id` | AdminTracesView · AdminTraceDetailView | 生成轨迹列表/详情（Step1 JSON、Step2 原始流、final HTML） |
| `/admin/audit-logs` | AdminAuditLogsView | 审计日志 |
| `/admin/llm-configs` | AdminLLMConfigsView | 平台默认 + 用户自定义 LLM 配置 |
| `/admin/system-prompts` | AdminSystemPromptsView | 当前 Step 1/2 System Prompt 现文 |
| `/admin/test-bench` | AdminTestBenchView | 测试台：prompt + 配置 → 实时看 Step1/Step2 中间输出 |
| `/admin/chat` | AdminChatView | LLM 聊天测试：单轮 prompt → 流式回复（平台默认/自定义配置，测连通性） |

## 核心数据流（CreationView）

```
PromptInput → useSSE.startGeneration(prompt, currentPageId)
  → 若 store 中已有未发布 pageId，透传至后端以便复用草稿（避免重复创建）
  → fetch POST /api/generate (ReadableStream, body 含 page_id)
  → SSE "progress" → generationStore 更新进度提示 (step1: 理解需求 / step2: 生成页面)
  → SSE "token"  → generationStore.appendCode → Monaco 实时显示
  → SSE "final"  → generationStore.setCode → 用后端精确提取的 HTML 替换（去掉 ``` 等残留）
  → SSE "done"   → generationStore.finishStreaming → PublishButton / SaveDraftButton 可用
  → 点击保存草稿 → saveDraft(pageId) → is_saved=True → 用户主页中可见
  → 点击发布      → publishPage(pageId) → 安全扫描 → SDK 注入 → window.open 新窗口 + navigate /{userId}
```

编辑已有页面：
```
UserProfileView 点击编辑 → navigate("/creation?pageId={id}")
  → CreationView 读取 pageId → getPage(id) → store.loadPage(id, html, prompt, isSaved)
  → Monaco/iframe 回填已有内容，SaveDraftButton 根据 isSaved 显示状态
```

## 状态管理 (Zustand)

| Store | 关键字段 |
|---|---|
| `useAuthStore` | user, isAuthenticated, loading, login(), register(), fetchUser(), logout() |
| `useGenerationStore` | isStreaming, codeContent, pageId, isSaved, title, tags, progressStep, error, startStreaming(), appendCode(), setCode(), loadPage(), finishStreaming(), setTags(), setSaved(), setTitle() |

## 关键设计决策

- **后台权限**: `User.is_admin`（来自 `GET /api/auth/me`，后端按 `ADMIN_USER_IDS` 计算）。`AppHeader` 下拉仅管理员显示「后台管理」；`AdminLayout` 做路由守卫。Admin API 全部走 `api/admin.ts`（axios 自动带 JWT、401 跳登录）
- **测试台 SSE**: `AdminTestBenchView` 本地实现 fetch+ReadableStream（不复用 `useSSE`，其与 generation store 耦合），消费 `step1`/`step1_prompt`/`step2_prompt`/`token_raw`/`token`/`final`/`done`/`error` 事件。`token_raw` 是 HTML 过滤前的原始流（正式生成会丢弃）。`step1_prompt`/`step2_prompt` 分别展示后端**实际发给 Step 1 / Step 2 LLM 的完整 system+user 消息**。流水线布局：原始 prompt → Step1（输入/输出）→ Step2（输入/输出）→ HTML（代码/页面）。测试台顶部可选**生成策略**（two_step/single_step，透传 `strategy`），single_step 时无 `step1`/`step1_prompt` 事件
- **LLM 聊天测试**: `AdminChatView`（`/admin/chat`）单轮 prompt → 流式回复（`chatSSE` 消费 `token`/`done`/`error`）；配置选择平台默认/自定义（model/base_url/api_key，仅本次请求不落库），Enter 发送 / 停止中止 / 清空
- **SSE 消费**: 使用 fetch + ReadableStream 而非 EventSource（需要 POST）
- **创作页登录态**: **生成/发布/存草稿都需要登录**——未登录点击时弹窗提示（`useLoginPrompt`：确认→`/login?redirect=/creation`，取消→留在原页）；登录后 SPA navigate 跳回，store 保留编辑器内容。**上传 HTML 本地读取覆盖编辑器，无需登录**（pageId 为空时发布/存草稿先 `POST /api/pages` 建草稿再操作）。`LoginView` 的 `?redirect=` 区分 SPA 路由（`navigate`，保留 store）vs 发布页两段路径（`location.href` 整页跳回，正则 `PUBLISHED_PAGE_RE` 与 vite proxy 一致）。**发布/存草稿按钮在有编辑器内容时可用**（AI 生成或上传均可发布），无内容/生成中禁用
- **SSE 事件类型**: `progress`（步骤进度）、`token`（追加代码）、`final`（替换为精确 HTML）、`done`（结束）、`error`（错误）
- **iframe 预览**: `sandbox="allow-scripts"`（不加 allow-same-origin 防 XSS），500ms 防抖更新避免流式时过度重渲染。`key={debouncedHtml.length}` 强制内容变化时 iframe 重挂载（解决 srcDoc 不刷新的问题）
- **Monaco**: `@monaco-editor/react`，vs-dark 主题。**编辑器可编辑**（生成中 `readOnly=isStreaming`），`onChange` 回写 `generationStore.codeContent`（iframe 预览 500ms 防抖随之实时刷新）。**发布/保存以编辑器内容为准**：`publishPage`/`saveDraft` 携带 `html_content`，后端 `PublishRequest`/`SaveDraftRequest` 新增该字段。**输入提示**：启用 VSCode-like IntelliSense（quickSuggestions / Emmet 缩写展开 / tab 补全 / snippet 优先 / 参数提示 / 自动配对），CDN 全量构建自带 HTML/CSS/JS 语言服务；`emmet` 运行时支持但缺类型声明，用 `as Partial<editor.IStandaloneEditorConstructionOptions>` 断言补充。**`!` → HTML5 骨架**：Monaco 自带 Emmet 对单个 `!` 缩写触发不稳，`handleMount(editor, monaco)` 里手动 `registerCompletionItemProvider('html')` 注册（snippet 制表位 `$1` 标题 / `$2` body），模块级标志防 StrictMode 重复注册
- **LLM 配置**: Settings 页面存到后端 users 表，API Key 使用 password 输入框
- **401 处理**: axios 拦截器自动清除 token 并跳转 /login
- **TailwindCSS 4**: 使用 `@tailwindcss/vite` 插件，CSS-first 配置
- **shadcn/ui**: CSS-first 配置，`index.css` 的 `:root` 定义 CSS 变量 + `@theme inline` 映射到 Tailwind token。色系「墨水与光」：纸 `#F7F6F2` / 墨 `#20221F` / 主色石板蓝 `#3D5A80` / 编译中深琥珀 `#A8580F` / 成功绿 `#4A7C59`。组件手写维护在 `src/components/ui/`（未用 shadcn CLI）
- **外观与主题（Chrome 风格）**: `lib/theme.ts` 提供「外观（浅色/深色/跟随设备）× 主题色（11 色，已移除纸白）」矩阵。每个主题色有 `hex`（浅色模式用深色系主色，白字可读）与 `darkHex`（深色模式用亮色系主色，深字可读）；`applyAppearance(mode)` 切根元素 `.dark` 类 + `applyTheme` 按深浅选变体并覆盖 `--primary/--ring/--live/--primary-foreground`。**平台默认石板蓝**（`DEFAULT_THEME=SLATE_THEME`，`index.css` 浅色 `--primary:#3D5A80`/深色 `#7BA3D2`）——未登录或未设置主题的用户生效。**中性色全由 `--primary` 派生**（`index.css` 里 `color-mix(in oklab, 基础色 N%, var(--primary))`）——背景/卡片/边框/弱化/悬停面随主题色带色相，深浅各自适配；深色调色板在 `:root.dark`。`App.tsx` 首帧用缓存、登录后以服务端 `user.theme`/`user.appearance` 为准；`SettingsView` 外观三段切换 + 色卡乐观更新回滚。`themechange` 事件供 HeroBackground 等跟随变色
- **首页 Hero**: 双栏布局——左文案 + 真实 `PromptInput`（onChange 驱动右面板），右 `HeroPreview` 工具部署演示（样本自演：prompt 打字机 → 迷你工具界面逐个组装 → 已部署；访客输入时标题跟随其文字）。背景 `HeroBackground`（Three.js：稀疏细点 + 鼠标视差/推开 + 点击扩散圆环，圆环/细点跟随主题色）。`three` 经动态 import 懒加载进独立 chunk；`prefers-reduced-motion` 静态一帧；canvas `pointer-events-none`（监听挂在 window）
- **发布页互动组件**：发布页由后端 serve 时注入 `backend/static/interactions.js`（vanilla，非 React）。**底部上滑抽屉（PC/移动端统一）**：右下角 36px 圆形触发按钮（常态 `opacity:.35`、打开后淡出并被抽屉盖住），抽屉 `translateY(100%)→0` 上滑、顶部横杠点击/拖拽收起；PC（≥641px）收窄锚右下角（`min(92vw,420px)`）、移动端全宽 78vh；overlay 在页之上、不影响项目布局；两个 tab = **作者**（头像/昵称/@id/bio + **N 关注者 + 关注按钮**：读 `/api/users/{author}` 的 `follower_count`/`is_following`，`viewer.is_self`=true 隐藏，乐观更新 + `e.stopPropagation()` 防触发作者栏跳转）+ TA 的其他已发布作品（封面+名+url，经 `/api/users/{author}` 拉取过滤当前页；**点击作者信息栏跳转 `/{author_user_id}` 主页**）+ **评论**（列表+表单+删自己的）；点赞/收藏在面板头部（标题下方 meta 行显示 发布时间 + tags；**tags 可点击** → `/gallery?tag=xxx` 整页跳转进入 gallery 检索）。trigger/panel/login-modal 全部 `appendChild(document.documentElement)`。读 `localStorage.access_token` 发 `Authorization`，未登录操作弹 modal → `/login?redirect=当前路径`；`LoginView` 支持 `?redirect=` 整页跳回（发布页非 React 路由，不能用 navigate()）。用户内容一律 `textContent` 渲染防 XSS。**抽屉跟随主题色/深浅**：读 `localStorage.manifest.theme`+`manifest.appearance`（`applyPiTheme`），深浅切换 surface 底色、深色用提亮主色，跟随系统深浅变化重算
- **图标**: 所有 UI 一律用 lucide-react 图标，禁用 emoji。推荐提示词图标映射见 `src/lib/promptMeta.ts`（关键词 → icon/accent/label，未命中回落 Sparkles）
- **Radix Select 哨兵值**: SelectItem 的 value 不允许空字符串，"自定义..." 选项用 `__custom__` 哨兵，选中后映射回 `''` 再渲染自定义 Input（见 SettingsView）
- **ID 类型**: 所有 Page ID 为 `string`（不是 `number`），禁止 `parseInt()`——Snowflake ID 超 JS 安全整数
- **Mock 模式**: `npm run dev:mock` 启动，`.env.mock` 设 `VITE_MOCK_LLM=true`。`vite.config.ts` 中 `/api/generate` 被 rewrite 为 `/api/mock/generate`，返回样本 HTML。前端代码无需改动。正式模式用 `npm run dev`
- **user_id 校验**: 注册页 300ms debounce 实时调用 `/api/auth/check`，大小写不敏感
- **page_id 校验**: 发布弹窗 300ms debounce 实时调用 `/api/pages/check-id`，大小写不敏感
- **Header**: 左侧 logo + 「创作」(`/creation`) + 「作品广场」(`/gallery`) 导航，登录/未登录都可见，`NavLink` 当前路由**选中态**（`text-primary bg-accent`）；右侧未登录显示「登录」按钮，已登录显示 Avatar 下拉菜单（我的主页/我的项目/设置/退出）。菜单点击外部关闭
- **用户主页 tab**: `?tab=overview|projects|settings` 用 query 驱动（不用路径，避免与 `/{user_id}/{page_id}` 发布页路由冲突），默认 overview。tab 栏 `sticky top-[var(--header-height)] z-40` 置于系统 header 下方，全宽；左侧卡片 sticky 需再加 `--profile-tab-height`（index.css 定义）。自己看含草稿 + 设置 tab + 编辑资料，别人看只读
- **Overview 首页**: README.md（有则渲染）+ 4 条最新项目（`pages.slice(0,4)`）+ 活跃度贡献热力图（`getUserActivity(user_id, year?)`，纯 CSS 52×7 格，零依赖）。README 用 `Markdown` 组件（react-markdown + remark-gfm），样式 `.markdown-body` 在 index.css，默认禁 raw HTML 防 XSS
- **活跃度热力图**（`ContributionHeatmap`）：`flex-1` 周列 + `aspect-square` 格子铺满容器宽，图例/月份标签天然右对齐热力图；hover 自定义 tooltip（"6 contributions on July 4th" 风格，absolute 定位跟随滚动）；月份标签在每列换月处显示；年份选择 PC 右上 / 手机热力图下方下拉（切年经 `onYearChange` 重拉）
- **关注体系**: `FollowButton` 乐观更新（点击立即翻转 is_following/计数，失败回滚）；未登录点击跳 /login。粉丝/正在关注计数在左卡片可点击，打开 `FollowList` 弹窗（`followDialog` state，Radix Dialog 关闭卸载内容、每次打开重新拉取）；列表项内嵌 FollowButton 支持回关（`u.id !== currentUser?.id` 才显示）
- **头像**: `Avatar` 组件展示 `user.avatar_url`（相对路径 `/static/...`，经 Vite proxy 加载），无头像显示首字母。上传走 `POST /api/auth/me/avatar`
- **页面封面**: `PageItem.cover_url`（相对路径 `/static/snapshots/...`，经 Vite proxy 加载）。项目卡片左侧 `aspect-video`（16:9）显示封面，无封面显示占位图标
- **下载/上传闭环**: `DownloadButton` + `lib/download.ts`（Blob + `<a download>`，中文文件名安全）。**个人页 projects tab 上传入口已改为「去创作」**（导航 `/creation`，上传/编辑在创作页完成）；`UploadHtmlButton`（`accept=".html,.htm"`，上传即草稿 `is_saved=True`）停用未删

## 首页 TODO（静态展示数据待接入后端）

- [ ] **示例作品展示区**：当前为静态假数据（`src/data/showcase.ts` + `MockThumbnail` CSS 手绘骨架）。
      后续接入真实发布数据：后端新增 `GET /api/showcase` 返回精选已发布作品（`cover_url`/`title`/`tags`），
      前端把 `<MockThumbnail>` 替换为 `<img src={cover_url}>`，字段对齐后删除 `showcase.ts` 与 `MockThumbnail` 的 variant 分支。
