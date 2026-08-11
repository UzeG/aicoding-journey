import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PartyPopper, Clipboard, ExternalLink, Check } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '../components/ui/card'

export default function PublishedPageView() {
  const { shortCode } = useParams<{ shortCode: string }>()
  const url = `${window.location.origin}/p/${shortCode}`
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-50 text-primary mb-4">
            <PartyPopper className="size-8" />
          </div>
          <CardTitle className="text-xl mb-2">页面已发布</CardTitle>
          <CardDescription className="mb-6">复制链接或扫描二维码访问你的页面</CardDescription>

          {/* Link */}
          <div className="bg-muted rounded-lg p-4 mb-4">
            <input
              readOnly
              value={url}
              className="w-full text-sm font-mono text-center bg-transparent border-none outline-none text-primary"
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? <Check className="size-4 text-emerald-600" /> : <Clipboard className="size-4" />}
              {copied ? '已复制' : '复制链接'}
            </Button>
            <Button className="flex-1" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" className="no-underline">
                <ExternalLink className="size-4" />
                打开页面
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
