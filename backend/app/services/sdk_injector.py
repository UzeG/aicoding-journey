"""Inject platform SDK into published HTML pages."""


def inject_sdk(html: str, page_id: str, short_code: str) -> str:
    """Inject window.platform SDK before </body> tag."""

    sdk_script = f"""
<script>
(function() {{
  var p = window.platform = {{
    page: {{ id: '{page_id}', shortCode: '{short_code}' }},
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
  console.log('[Platform SDK] Page ready:', p.page.shortCode);
}})();
</script>
<!-- AI 辅助生成 -->
"""

    if "</body>" in html:
        return html.replace("</body>", sdk_script + "\n</body>")
    else:
        return html + "\n" + sdk_script
