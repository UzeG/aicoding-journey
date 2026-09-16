---
name: diag-page
description: 诊断本平台自动生成 HTML 页面的问题根因。本项目用两步 LLM 生成 HTML——Step 1 输出 refined_prompt + 选中 CDN 库列表，Step 2 按后端预定义 system prompt 生成 style/body/script 片段并拼装成完整页面。当你发现某个生成页面样式不对、图表空白、JS 报错、3D 不渲染、页面白屏，却分不清问题是 CDN 引入方式不规范、Step 1 选库错误、后端预定义 prompt 不合理/可完善、还是生成管道故障时，用本 skill 根据 pages 表 id 定位到记录并诊断根因。任何"帮我看看这个页面为什么有问题""这个 id 的页面怎么了""这个页面报错 xx""分析一下这个生成页面的问题"并给出页面 id 的请求，都应使用本 skill。调用方式：/diag-page <pages_id> <reason>。
---

# diag-page — 生成页面问题根因诊断

诊断 `pages` 表中某条记录生成的 HTML 的问题根因，判定问题出在 **CDN 引入方式 / Step 1 选库 / 后端预定义 prompt / 生成管道 / LLM 偶发偏差 / 生成本身正确** 中的哪一类。

## 调用方式

```
/diag-page <pages_id> <reason>
```

| 参数 | 说明 |
|---|---|
| `pages_id` | `backend/htmlhost.db` 中 `pages` 表主键 id（Snowflake 数字，**按字符串处理，禁止 parseInt**） |
| `reason` | 你观察到的页面问题，如"图表空白""样式没生效""控制台报 echarts is not defined""页面是空壳"。可省略，省略则做常规体检 |

## 先读源码，建立"正确性基准"

这些文件正在迭代，**先读一遍当前版本再判断，不要凭记忆**：

- `backend/app/services/library_registry.py` — CDN 注册表：每个库的 `access`（global / importmap）、CDN URL、`usage_notes`、`default`
- `backend/app/services/system_prompt.py` — Step 1/2 预定义 prompt 的当前规则
- `backend/app/services/llm_service.py` — 拼装逻辑：CDN 由 `_assemble_html` 按 Step 1 选中库注入；`_parse_fragment` 会剥离 LLM 输出里带 `src` 的 `<script>`

### 必须掌握的关键事实

1. **CDN 标签不是 LLM 写的**。`<head>` 和 `</body>` 前的 CDN 标签是后端 `_assemble_html` 按 Step 1 选中库注入的，所以它们总是"符合注册表"的。问题只可能出在 LLM 写的 `<script type="module">` 内容里，或 Step 1 的选库本身。
2. **两种接入模式**（注册表 `access` 字段）：
   - `global`（echarts / dayjs / chartjs / fontawesome / unocss）：经 `<script src>`/`<link>` 加载，代码里用**全局变量**（`echarts`、`dayjs`）。**绝不允许 `import ... from 'echarts'`**。
   - `importmap`（three）：在 `<script type="module">` 里裸导入 `import * as THREE from 'three'`。禁止 `<script src>` 引 three、禁止 `THREE.OrbitControls`、禁止 `examples/js/` 路径。
3. **注入位置**：echarts/dayjs/chartjs 的 `<script src>` 放 `</body>` 前（body_end）；fontawesome 是 `<link>` 在 head；three 是 importmap 在 head；unocss 的 `<script src>` 在 head。判断 body 里出现 `<script src>` 是否异常时，看对应库**是否在 step1.libraries 里**——选中了就是组装器注入（正常），没选中就是 LLM 自写（异常）。
4. **LLM 输出里带 `src` 的 `<script>` 会被 `_parse_fragment` 直接丢弃**（记 warning）。最终 HTML 里残留 LLM 自写 CDN script，说明走的是旧解析器或 mock 路径，而非当前两步 LLM。

## 工作流

### Step 1 — 拉取记录
```bash
python .Codex/skills/diag-page/scripts/fetch_page.py <pages_id>
```
输出 JSON：`id / user_id / page_id / title / status / is_published / file_size / prompt(Step1 refined_prompt) / step1({refined_prompt, libraries}) / html(完整拼装页) / public_url`。
若 id 不存在，用 `sqlite3 backend/htmlhost.db "SELECT id,title,created_at FROM pages ORDER BY id DESC LIMIT 20;"` 列出最近记录，请用户确认。

### Step 2 — 提取 Step 1 选库
从 `step1.libraries` 取选中库 key 列表。unocss 是 default 库（永远注入），**不会也不应**出现在选中列表。

### Step 3 — 审计 A：CDN 接入方式（对照注册表 access）
检查最终 `html` 中 **LLM 写的部分**（`<script type="module">` 内容、body 内标签）：
- 找所有裸 import（`import ... from 'x'`），对每个 `x`：
  - 在注册表且 `access=global` → **违规**（对全局库用 import）
  - 在注册表且 `access=importmap` → 正确，但核对路径（three/addons 是否正确、`three/addons/controls/OrbitControls.js` 有无）
  - 不在注册表 → **杜撰/非法 import**
- three 特有违规：`THREE.OrbitControls`、`examples/js/` 路径、用 `<script src>` 引 three
- body 内出现非注册表 URL 的 `<script src>` / `<link>` → LLM 自写 CDN（异常；mock 页另判）

### Step 4 — 审计 B：选库 vs 使用（最常见问题）
- **使用了但未选中**：代码里出现 `echarts` / `dayjs` / `THREE` 等全局名，但 `step1.libraries` 没有该库 → **缺 CDN**，运行时必然 `xxx is not defined`。
- **选中但未使用**：step1 选了 X，但 HTML 里没有任何 X 的调用 → Step 1 过度选库，或 JS 片段在解析中丢失。

### Step 5 — 审计 C：页面结构完整性
- body 空？script 空？`<!-- TITLE:` 注释缺失？
- 整体字节数异常小（<1KB 且只有骨架+SDK）→ **生成管道故障**（LLM 空输出 / 截断 / 解析失败 / Step 1 失败）
- 有交互痕迹（onclick / addEventListener）却无 script → 解析丢脚本

### Step 6 — 审计 D：按 reason 症状深查

| 症状 (reason) | 排查点 |
|---|---|
| 样式没生效 / 布局乱 / 类名无效 | 是否用了 UnoCSS 不支持的类；custom `<style>` 是否覆盖工具类；unocss runtime 是否注入 head |
| 图表空白 / 不显示 | 容器是否有显式 `height`（ECharts 规则 1）；是否用了 `ResizeObserver`（规则 2）；是否用了 `window.resize`（违规）；`setOption` 是否被调用；数据是否为空 |
| 控制台 `xxx is not defined` | 定位到用的库 → 审计 B（缺 CDN / 选错库）；或 import 了全局库 → 审计 A |
| 3D 不渲染 | three 引入方式（importmap + 裸导入）；OrbitControls 路径；renderer 容器尺寸；动画循环是否启动 |
| 页面白屏 / 空壳 | 审计 C（管道故障）|
| 无交互 / 点击没反应 | script 是否为空 / JS 丢失；核心行为是否依赖 inline onclick（prompt 要求用 script）|
| 图标 / 特殊字体不显示 | fontawesome 是否选中（head `<link>`）；是否用了未引入的字体库 |
| 手机端错位 / 单页工具没居中 | viewport centering 规则：单页工具/卡片应 `min-h-screen flex items-center justify-center p-4`，宽表格/列表应主容器 `mx-auto` |

### Step 7 — 判定根因类别（可多选，按可信度排序）

| 类别 | 含义 | 判定要点 |
|---|---|---|
| `cdn_import_violation` | **CDN 非规范引入** | import 了全局库 / 杜撰 import / three 错误路径 / body 自写 CDN script |
| `missing_cdn` | **库缺失** | 用了库但 Step 1 没选 → 运行时 not defined |
| `step1_selection` | **Step 1 选库/需求理解问题** | 选错/漏选/过度选库；refined_prompt 曲解用户意图 |
| `system_prompt_bug` | **预定义 prompt 不合理** | prompt 有自相矛盾/错误/缺关键约束，导致 LLM **系统性**产出问题（同一症状在**多条记录**重复出现时倾向此类） |
| `system_prompt_improve` | **预定义 prompt 可完善** | 当前不算 bug 但能更好：usage_notes 缺失、tags 不全导致 Step 1 选不中、CDN 版本旧、规则可补强 |
| `pipeline_failure` | **生成管道故障** | Step 1/2 失败、输出为空/截断、解析丢 JS |
| `llm_flaky` | **LLM 偶发偏差** | 同类页面其他记录正常、仅此条不达标，重试可修复 |
| `correct` | **生成本身正确** | 问题不在生成 HTML，而在别处（SDK / 代理 / 渲染环境 / 浏览器缓存 / CDN 网络）|

特殊情形：`step1_output` 为空且 html 带 "Mock Mode" 页脚 → 该记录来自 `/api/mock/generate`，**不属于两步 LLM 链路**，不要归因到 prompt/LLM，单独说明即可。

**判定 `llm_flaky`（LLM 偶发）的方法** —— 它是最后才考虑的类别，不要一遇到问题就归它：
1. 先跑完审计 A-D，确认不是 CDN 引入 / 选库 / prompt 系统性 / 管道故障；
2. 查同诉求、同库、同类页面的其他记录：**都正常、只有这条不达标** → 倾向 `llm_flaky`；
3. 关键区分：若这条坏输出**被管道原样保存/发布**（如空壳落库、JS 被静默丢弃），即便源头是 LLM 偶发，也归 **`pipeline_failure`** 而非 `llm_flaky`——修复落点不同（一个该改管道守卫，一个重试即可）；
4. 报告对 `llm_flaky` 建议"重新生成一次对比验证"，并提示重试若仍复现则需升级为系统性问题。

### Step 8 — 输出诊断报告

> **只输出报告，不做任何修改**。本 skill 是纯分析工具：不修改任何源码、数据库、配置，也不执行修复。修复建议以文字写在报告里，是否实施由用户决定。

```markdown
# 页面诊断 — {title}（id={pages_id}）

## 结论
- **根因类别**：`xxx`（多个按可信度排序）
- **一句话结论**：……
- **置信度**：高 / 中 / 低

## 证据
- 记录概览：file_size、status、is_published、Step 1 选中库
- 关键发现（引用具体 HTML/代码片段，说明它违反/符合了哪条基准）

## 根因分析
- 链路解释：Step 1 → Step 2 → 组装，哪一环出问题、为什么
- 排除说明：为什么不是其他类别

## 修复建议
- **指向文件**：`backend/app/services/xxx.py` 的 `函数名`
- **具体改动**：改什么、怎么改（给出可直接使用的代码/文本）
- **验证**：如何复现验证修复生效
```

## 注意事项

- **本 skill 只诊断、不修改**。无论报告里给出多明确的修复建议，都不动任何文件、数据库、配置；修改必须等用户明确指示。
- **id 全程按字符串处理**（Snowflake 17 位超出 JS safe integer），不要 `parseInt`。
- **以当前源码为准**：library_registry / system_prompt 的规则可能刚改过，先读文件再下结论。
- **不要甩锅 LLM**：判定"LLM 违规"前，先确认对应规则确实存在于当前 prompt；若规则缺失/不清晰，应归为 `system_prompt_improve`（补规则）而不是 `cdn_import_violation`。
- 报告用中文；代码、文件路径、库名用英文。
