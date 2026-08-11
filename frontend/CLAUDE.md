# Frontend — AI Coding HTML 托管平台

React 19 + TypeScript + Vite + TailwindCSS 4 + Monaco Editor + Zustand。

## 启动

```bash
cd frontend
npm install        # 首次
npm run dev        # http://localhost:5173
```

Vite proxy 配置：`/api` 和 `/p` 自动转发到 `http://localhost:8000`。

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
├── stores/                       # Zustand
│   ├── auth.ts                   # 登录状态, user, fetchUser, logout
│   └── generation.ts             # 生成状态: isStreaming, codeContent, pageId
├── hooks/
│   └── useSSE.ts                 # SSE 流式消费 (fetch + ReadableStream)
├── components/
│   ├── layout/AppHeader.tsx      # 导航栏 (logo, 菜单, 登录状态)
│   ├── generator/
│   │   ├── PromptInput.tsx       # textarea + 发送按钮
│   │   ├── CodePanel.tsx         # Monaco Editor (readOnly, 流式追加)
│   │   ├── PreviewPanel.tsx      # iframe sandbox (500ms 防抖 srcdoc)
│   │   └── PublishButton.tsx     # 发布 + 结果弹窗 (链接/二维码)
│   ├── template/TemplateCard.tsx # 场景卡片
│   └── common/
│       ├── LoadingSpinner.tsx
│       └── ConfirmDialog.tsx
└── views/
    ├── HomeView.tsx              # 首页 (Hero + 模板市场)
    ├── GeneratorView.tsx         # 分屏生成器 ★核心页面
    ├── MyPagesView.tsx           # 我的页面列表 + 删除
    ├── LoginView.tsx             # 登录/注册
    ├── SettingsView.tsx          # LLM 配置 (model/api_key/base_url)
    └── PublishedPageView.tsx     # 发布成功页 (链接复制)
```

## 路由

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | HomeView | 首页 + 模板市场 |
| `/generator` | GeneratorView | 分屏生成器（支持 ?prompt=&templateId=） |
| `/mypages` | MyPagesView | 我的页面列表 |
| `/login` | LoginView | 登录/注册 |
| `/settings` | SettingsView | LLM 配置 |
| `/published/:shortCode` | PublishedPageView | 发布详情 |

## 核心数据流（GeneratorView）

```
PromptInput → useSSE.startGeneration(prompt, templateId, currentPageId)
  → 若 store 中已有未发布 pageId，透传至后端以便复用草稿（避免重复创建）
  → fetch POST /api/generate (ReadableStream, body 含 page_id)
  → SSE "token"  → generationStore.appendCode → Monaco 实时显示
  → SSE "final"  → generationStore.setCode → 用后端精确提取的 HTML 替换（去掉 ``` 等残留）
  → SSE "done"   → generationStore.finishStreaming → PublishButton 可用
  → 点击发布      → publishPage(pageId) → 安全扫描 → SDK 注入 → window.open 新窗口 + navigate /mypages
```

编辑已有页面：
```
MyPagesView 点击编辑 → navigate("/generator?pageId={id}")
  → GeneratorView 读取 pageId → getPage(id) → store.loadPage(id, html, prompt)
  → Monaco/iframe 回填已有内容
```

## 状态管理 (Zustand)

| Store | 关键字段 |
|---|---|
| `useAuthStore` | user, isAuthenticated, login(), register(), fetchUser(), logout() |
| `useGenerationStore` | isStreaming, codeContent, pageId, error, startStreaming(), appendCode(), setCode(), loadPage(), finishStreaming() |

## 关键设计决策

- **SSE 消费**: 使用 fetch + ReadableStream 而非 EventSource（需要 POST）
- **SSE 事件类型**: `token`（追加代码）、`final`（替换为精确 HTML）、`done`（结束）、`error`（错误）
- **iframe 预览**: `sandbox="allow-scripts"`（不加 allow-same-origin 防 XSS），500ms 防抖更新避免流式时过度重渲染。`key={debouncedHtml.length}` 强制内容变化时 iframe 重挂载（解决 srcDoc 不刷新的问题）
- **Monaco**: `@monaco-editor/react`，readOnly 模式，vs-dark 主题。编辑页面目前只能查看/重新生成，不能直接修改代码
- **LLM 配置**: Settings 页面存到后端 users 表，API Key 使用 password 输入框
- **401 处理**: axios 拦截器自动清除 token 并跳转 /login
- **TailwindCSS 4**: 使用 `@tailwindcss/vite` 插件，CSS-first 配置
- **ID 类型**: 所有 Page ID 为 `string`（不是 `number`），禁止 `parseInt()`——Snowflake ID 超 JS 安全整数
