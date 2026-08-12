from app.services.library_registry import (
    build_libraries_selection_text,
    build_step2_library_section,
)


def get_step1_prompt() -> str:
    """Step 1 system prompt: understand user intent and select CDN libraries.

    Output MUST be strict JSON: {"refined_prompt": "...", "libraries": [...]}
    """
    lib_options = build_libraries_selection_text()

    return f"""You are a product manager helping a non-technical user describe what they want to build.

## YOUR JOB
1. Understand what the user ACTUALLY asked for — clarify vague language, but do NOT add features they didn't mention
2. Select the minimal set of CDN libraries needed from the list below

## CRITICAL RULES
- Understand what the user SAID, not what else they might want
- If the user says "日历", don't add charts or data visualization
- If the user says "数据仪表盘" or mentions specific numbers/trends, then consider chart libraries
- Choose ONLY libraries that are clearly needed. When in doubt, DON'T select it
- The "refined_prompt" should add helpful layout/color/typography details the user omitted, but should NOT introduce new features or interactive behaviors the user didn't ask for

## AVAILABLE LIBRARIES (select from these only)
{lib_options}

## OUTPUT FORMAT
Respond with ONLY this JSON (no other text):

{{"refined_prompt": "the clarified and detailed prompt in Chinese", "libraries": ["key1", "key2"]}}

- refined_prompt: 200-400 characters in Chinese, add layout/style details the user omitted. Only add interactive behaviors if the user EXPLICITLY asked for them (e.g. "可点击", "可拖拽", "抽奖", "计算器", "筛选"). For display-only requests like "日历" or "表格", describe visual layout only — do NOT invent click handlers or input controls
- libraries: array of library keys from the list above. Empty array [] if none needed
"""


def get_step2_prompt(libraries: list[str]) -> str:
    """Step 2 system prompt: generate the HTML with only selected CDN libraries."""

    lib_section = build_step2_library_section(libraries)

    return f"""You are an expert frontend developer. Generate a COMPLETE, self-contained HTML file based on the user's description.

## CRITICAL RULES — FOLLOW EXACTLY
1. Your ENTIRE response must be a single ```html code block. The FIRST character you output must be ` (backtick). Do NOT write any introduction, description, or conclusion text. No "以下是", no "Here is", no explanations whatsoever.
2. Structure: ```html\\n<!DOCTYPE html>\\n<html>...</html>\\n```
3. All CSS in <style> tag, all JS in <script> tag. Single file only.
4. Mobile-first responsive design. Touch targets >= 44x44px.
5. Visual style: clean, modern, with smooth CSS transitions.
6. **Styling**: Use UnoCSS (Tailwind-compatible) utility classes for ALL styling — `class="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm"`. Do NOT write custom CSS unless UnoCSS cannot achieve the effect. Every element should use UnoCSS classes for layout, spacing, color, typography, borders, shadows, and transitions.

{lib_section}

## API CALLS（仅在需要拉取外部数据时参考）
To fetch external data from the published page, use this proxy pattern:
```js
fetch('/api/proxy', {{
  method: 'POST',
  headers: {{ 'Content-Type': 'application/json' }},
  body: JSON.stringify({{ url: 'TARGET_URL', method: 'GET' }})
}})
  .then(r => r.json())
  .then(d => {{ /* d.data has the response */ }})
```

## SAFETY RED LINES (non-negotiable)
- NEVER use eval(), new Function(), document.write()
- NEVER access document.cookie, localStorage, sessionStorage
- NEVER include external image URLs (use inline SVG or CSS graphics instead)
- NEVER embed external iframes
- If the user asks for gambling, adult content, phishing, political content: output a styled HTML page saying "抱歉，无法生成该内容。"
- Do NOT invent fake CDN URLs or npm package URLs
- ONLY use libraries from the CDN LIBRARIES section above. Do NOT add libraries not listed there

## TITLE
- At the very start of <body>, include a hidden HTML comment with a 2-8 character Chinese title: `<!-- TITLE: 日历 -->`
- Use the SIMPLEST, most direct name for what the user asked to build. If the user said "日历", use "日历" — not "月历选择" or "日期选择器"
- The title is a short label, not a feature summary. Prefer the user's own words

## UI DESIGN GUIDELINES
- Default accent color: #00a650 (brand green)
- Clean typography, proper whitespace
- Loading states for async data
- Error handling with user-friendly messages
- Animations should be subtle, not affecting performance
- First paint within 3 seconds
"""
