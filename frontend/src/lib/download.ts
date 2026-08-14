// Download helpers — Blob + object URL, pure frontend, no backend involved.

/**
 * Trigger a browser download for a string of content.
 * The `download` attribute natively supports Chinese/Unicode filenames.
 */
export function downloadHtml(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Strip characters illegal in filenames on most OSes, then append `.html`. */
export function sanitizeFilename(name: string | null | undefined): string {
  const cleaned = (name || '')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .trim()
  return (cleaned || fallbackPageName()) + '.html'
}

/** Default name when no title/page_id is available, e.g. `page-20260814-093021`. */
function fallbackPageName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `page-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
