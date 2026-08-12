# Frontend — AI Coding HTML 托管平台

React 19 + TypeScript + Vite + TailwindCSS 4 + Monaco Editor + Zustand + shadcn/ui + lucide-react。

## 启动

```bash
cd frontend
npm install        # 首次
npm run dev        # http://localhost:5173（正式模式，真实 LLM 调用）
npm run dev:mock   # Mock 模式（跳过 LLM，使用样本 HTML，零 Token 消耗）
```

Vite proxy 配置：`/api`、`/static` 转发到 `http://localhost:8000`。Mock 模式下 `/api/generate` 被 rewrite 为 `/api/mock/generate`。

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
├── lib/
│   └── utils.ts                  # cn() 工具函数 (clsx + tailwind-merge, shadcn 依赖)
├── stores/                       # Zustand
│   ├── auth.ts                   # 登录状态, user, fetchUser, logout
│   └── generation.ts             # 生成状态: isStreaming, codeContent, pageId, isSaved, progressStep
├── hooks/
│   └── useSSE.ts                 # SSE 流式消费 (fetch + ReadableStream)
├── components/
│   ├── ui/                       # shadcn/ui 组件 (Button/Input/Textarea/Card/Badge/Dialog/Select/Label)
│   ├── layout/AppHeader.tsx      # header (logo + 右侧 avatar 下拉菜单)
│   ├── generator/
│   │   ├── PromptInput.tsx       # textarea + 发送按钮
│   │   ├── CodePanel.tsx         # Monaco Editor (readOnly, 流式追加)
│   │   ├── PreviewPanel.tsx      # iframe sandbox (500ms 防抖 srcdoc)
│   │   ├── PublishButton.tsx     # 发布 + 新窗口打开 + 跳转用户主页
│   │   ├── SaveDraftButton.tsx   # 保存草稿 (is_saved=True 后列表可见)
│   │   └── SavePageDialog.tsx    # 发布/保存表单 (标题 + page_id 实时校验)
│   └── common/
│       ├── Avatar.tsx            # 头像组件 (有图显示图，无图显示首字母)
│       ├── LoadingSpinner.tsx
│       └── ConfirmDialog.tsx
└── views/
    ├── HomeView.tsx              # 首页 (Hero + 推荐提示词)
    ├── GeneratorView.tsx         # 分屏生成器 ★核心页面
    ├── UserProfileView.tsx       # 用户主页（左卡片 + 右 tab：项目/设置）
    ├── LoginView.tsx             # 登录/注册（支持手机号 + user_id）
    └── SettingsView.tsx          # LLM 配置（复用为主页设置 tab）
```

## 路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | HomeView | 首页 + 推荐提示词 |
| `/generator` | GeneratorView | 分屏生成器（支持 ?prompt=&pageId=） |
| `/:userId` | UserProfileView | 用户主页（自己=管理，别人=只读） |
| `/home` | HomeRedirect | 重定向到 /{当前用户id} |
| `/login` | LoginView | 登录/注册 |

## 核心数据流（GeneratorView）

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
UserProfileView 点击编辑 → navigate("/generator?pageId={id}")
  → GeneratorView 读取 pageId → getPage(id) → store.loadPage(id, html, prompt, isSaved)
  → Monaco/iframe 回填已有内容，SaveDraftButton 根据 isSaved 显示状态
```

## 状态管理 (Zustand)

| Store | 关键字段 |
|---|---|
| `useAuthStore` | user, isAuthenticated, loading, login(), register(), fetchUser(), logout() |
| `useGenerationStore` | isStreaming, codeContent, pageId, isSaved, title, progressStep, error, startStreaming(), appendCode(), setCode(), loadPage(), finishStreaming(), setSaved(), setTitle() |

## 关键设计决策

- **SSE 消费**: 使用 fetch + ReadableStream 而非 EventSource（需要 POST）
- **SSE 事件类型**: `progress`（步骤进度）、`token`（追加代码）、`final`（替换为精确 HTML）、`done`（结束）、`error`（错误）
- **iframe 预览**: `sandbox="allow-scripts"`（不加 allow-same-origin 防 XSS），500ms 防抖更新避免流式时过度重渲染。`key={debouncedHtml.length}` 强制内容变化时 iframe 重挂载（解决 srcDoc 不刷新的问题）
- **Monaco**: `@monaco-editor/react`，readOnly 模式，vs-dark 主题。编辑页面目前只能查看/重新生成，不能直接修改代码
- **LLM 配置**: Settings 页面存到后端 users 表，API Key 使用 password 输入框
- **401 处理**: axios 拦截器自动清除 token 并跳转 /login
- **TailwindCSS 4**: 使用 `@tailwindcss/vite` 插件，CSS-first 配置
- **shadcn/ui**: CSS-first 配置，`index.css` 的 `:root` 定义 CSS 变量 + `@theme inline` 映射到 Tailwind token（主色 emerald）。组件手写维护在 `src/components/ui/`（未用 shadcn CLI）
- **图标**: 所有 UI 一律用 lucide-react 图标，禁用 emoji。`HomeView` 内置推荐提示词图标映射
- **Radix Select 哨兵值**: SelectItem 的 value 不允许空字符串，"自定义..." 选项用 `__custom__` 哨兵，选中后映射回 `''` 再渲染自定义 Input（见 SettingsView）
- **ID 类型**: 所有 Page ID 为 `string`（不是 `number`），禁止 `parseInt()`——Snowflake ID 超 JS 安全整数
- **Mock 模式**: `npm run dev:mock` 启动，`.env.mock` 设 `VITE_MOCK_LLM=true`。`vite.config.ts` 中 `/api/generate` 被 rewrite 为 `/api/mock/generate`，返回样本 HTML。前端代码无需改动。正式模式用 `npm run dev`
- **user_id 校验**: 注册页 300ms debounce 实时调用 `/api/auth/check`，大小写不敏感
- **page_id 校验**: 发布弹窗 300ms debounce 实时调用 `/api/pages/check-id`，大小写不敏感
- **Header**: 无中间导航，右侧未登录显示「登录」按钮，已登录显示 Avatar 下拉菜单（我的主页/我的项目/设置/退出）。菜单点击外部关闭
- **用户主页 tab**: `?tab=settings` 用 query 驱动（不用路径，避免与 `/{user_id}/{page_id}` 发布页路由冲突）。自己看含草稿 + 设置 tab + 编辑资料，别人看只读已发布项目
- **头像**: `Avatar` 组件展示 `user.avatar_url`（相对路径 `/static/...`，经 Vite proxy 加载），无头像显示首字母。上传走 `POST /api/auth/me/avatar`
