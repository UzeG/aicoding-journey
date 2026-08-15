"""Inject platform SDK into published HTML pages."""


def inject_sdk(html: str, page_pk: str, page_id: str) -> str:
    """Inject window.platform SDK before </body> tag.

    Args:
        html: The page HTML content.
        page_pk: Internal page primary key (Snowflake ID as string).
        page_id: Public page slug.
    """

    # 防重复注入：编辑器内容可能已含 SDK（如编辑已发布页后重新发布）
    if "window.platform" in html or "AI 辅助生成" in html:
        return html

    sdk_script = f"""
<script>
(function() {{
  var p = window.platform = {{
    page: {{ id: '{page_pk}', pageId: '{page_id}' }},
    api: {{
      call: async function(url, opts) {{
        opts = opts || {{}};
        var resp = await fetch('/api/proxy', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{
            url: url,
            method: opts.method || 'GET',
            headers: opts.headers || {{}},
            body: opts.body || null
          }})
        }});
        return await resp.json();
      }}
    }}
  }};
  console.log('[Platform SDK] Page ready:', p.page.pageId);
}})();
</script>
<!-- AI 辅助生成 -->
"""

    if "</body>" in html:
        return html.replace("</body>", sdk_script + "\n</body>")
    else:
        return html + "\n" + sdk_script
