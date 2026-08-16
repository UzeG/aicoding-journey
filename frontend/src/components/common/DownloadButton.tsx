import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { downloadHtml, sanitizeFilename } from '../../lib/download'

interface Props {
  /** Returns the full HTML to download (sync or async — e.g. fetch page detail first). */
  getContent: () => string | Promise<string>
  /** Base name for the file; sanitized internally, falls back to a timestamp name. */
  fileName?: string | null
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export default function DownloadButton({ getContent, fileName, disabled, variant = 'ghost', size = 'sm' }: Props) {
  const [downloading, setDownloading] = useState(false)

  const handleClick = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const html = await getContent()
      downloadHtml(html, sanitizeFilename(fileName))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={disabled || downloading}>
      {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      <span className="hidden sm:inline">{downloading ? '下载中...' : '下载'}</span>
    </Button>
  )
}
