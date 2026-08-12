"""CDN library registry — defines available libraries that Step 1 can select from.

Each entry: {key: {name, type, tags, access, ...}}
- default=True: always injected into Step 2 (not selectable by LLM)
- tags: used in Step 1 prompt to help LLM match libraries to user needs
- access: "global" (loaded via <script src>/<link>, use as global var, DO NOT import)
         or "importmap" (use bare import in <script type="module">)
- usage_notes: injected into Step 2 prompt only when selected (avoids polluting context)
"""

import json

LIBRARY_REGISTRY: dict[str, dict] = {
    "unocss": {
        "name": "UnoCSS Runtime",
        "url": "https://cdn.jsdelivr.net/npm/@unocss/runtime@0.62.0",
        "type": "script",
        "head": True,
        "access": "global",
        "tags": ["样式", "CSS", "布局"],
        "description": "原子化 CSS 框架，支持所有 Tailwind 类名",
        "default": True,
    },
    "echarts": {
        "name": "ECharts",
        "url": "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js",
        "type": "script",
        "access": "global",
        "tags": ["图表", "可视化", "数据", "趋势", "统计", "仪表盘", "折线图", "柱状图", "饼图", "环形图"],
        "description": "功能丰富的数据可视化图表库",
        "usage_notes": (
            "ECharts 使用规范：1) 图表容器必须显式设置 width 和 height（不可依赖 auto）；"
            "2) chart.setOption() 之后使用 new ResizeObserver(() => chart.resize()).observe(container) 监听容器尺寸，"
            "这会在容器首次获得尺寸时自动触发，解决首次加载尺寸为 0 的问题；"
            "3) 不要使用 window.addEventListener('resize', ...)，页面首次加载不会触发 resize 事件"
        ),
    },
    "dayjs": {
        "name": "Day.js",
        "url": "https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js",
        "type": "script",
        "access": "global",
        "tags": ["日期", "时间", "日历", "倒计时", "日期计算"],
        "description": "轻量日期时间处理库",
    },
    "chartjs": {
        "name": "Chart.js",
        "url": "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js",
        "type": "script",
        "access": "global",
        "tags": ["图表", "可视化", "数据"],
        "description": "简单易用的图表库，渲染为 Canvas",
    },
    "fontawesome": {
        "name": "Font Awesome",
        "url": "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.0/css/all.min.css",
        "type": "css",
        "access": "global",
        "tags": ["图标", "icon"],
        "description": "图标字体库，用 CSS class 使用图标",
    },
    "three": {
        "name": "Three.js",
        "type": "importmap",
        "access": "importmap",
        "importmap": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
        },
        "tags": ["3D", "三维", "立体", "动画", "WebGL"],
        "description": "3D 渲染引擎，适用于 3D 场景、粒子效果",
        "usage_notes": (
            "Three.js 使用规范：1) 必须通过 ES importmap 引入，不可用 <script> 标签；"
            "2) OrbitControls 从 'three/addons/controls/OrbitControls.js' 引入；"
            "3) 禁止使用 examples/js/（已移除）和 THREE.OrbitControls（不存在）"
        ),
    },
}


def get_selectable_libraries() -> dict[str, dict]:
    """Return libraries that Step 1 can choose from (exclude default-always)."""
    return {k: v for k, v in LIBRARY_REGISTRY.items() if not v.get("default")}


def get_default_libraries() -> list[str]:
    """Return library keys that are always included."""
    return [k for k, v in LIBRARY_REGISTRY.items() if v.get("default")]


def build_libraries_selection_text() -> str:
    """Generate the library selection options text for Step 1 prompt."""
    lines = []
    for key, lib in get_selectable_libraries().items():
        tags = "、".join(lib.get("tags", [])[:5])
        lines.append(f"- **{key}** ({lib['name']}): {lib['description']}。适用场景：{tags}")
    return "\n".join(lines)


def build_step2_usage_notes(selected_keys: list[str]) -> str:
    """Build library usage notes for Step 2 system prompt.

    Only includes libraries that were selected in Step 1 + always-default ones.
    Returns empty string if no library has usage_notes.
    Auto-prepends access-mode hints ("global" vs "importmap") for each library.
    """
    all_keys = set(selected_keys) | set(get_default_libraries())
    lines = []
    for key in all_keys:
        lib = LIBRARY_REGISTRY.get(key)
        if not lib:
            continue

        access_hint = _build_access_hint(lib)
        notes_content = lib.get("usage_notes", "")

        if not access_hint and not notes_content:
            continue

        parts = [f"### {lib['name']}", access_hint, notes_content]
        lines.append("\n".join(p for p in parts if p))

    return "\n\n".join(lines) if lines else ""


def _build_access_hint(lib: dict) -> str:
    """Generate access-mode hint for a library."""
    access = lib.get("access")
    if access == "global":
        return (
            "⚠️ **全局变量** — 此库已通过 CDN `<script>` 标签加载，"
            "直接使用全局变量（如 `echarts`、`dayjs`），**不要 import**。"
        )
    if access == "importmap":
        return (
            "✅ **ES 模块** — 此库已通过 `<script type=\"importmap\">` 配置，"
            "在 `<script type=\"module\">` 中使用 bare import，"
            "如 `import * as THREE from 'three'`。"
        )
    return ""


def build_cdn_includes(selected_keys: list[str]) -> dict:
    """Build CDN HTML tags for injection into the page skeleton.

    Returns {"head": str, "body_end": str}.
    - head: importmap → CSS links → head scripts (ordered)
    - body_end: scripts that go before </body>
    """
    all_keys = set(selected_keys) | set(get_default_libraries())
    importmaps = []
    head_others = []
    body_parts = []

    for key in all_keys:
        lib = LIBRARY_REGISTRY.get(key)
        if not lib:
            continue

        if lib["type"] == "importmap":
            importmaps.append(
                f'<script type="importmap">{json.dumps({"imports": lib["importmap"]})}</script>'
            )
        elif lib["type"] == "css":
            head_others.append(f'<link rel="stylesheet" href="{lib["url"]}">')
        elif lib["type"] == "script":
            if lib.get("head"):
                head_others.append(f'<script src="{lib["url"]}"></script>')
            else:
                body_parts.append(f'<script src="{lib["url"]}"></script>')

    head = "\n  ".join(importmaps + head_others)
    body_end = "\n  ".join(body_parts)
    return {"head": head, "body_end": body_end}
