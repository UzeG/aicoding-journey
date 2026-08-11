import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { publishPage } from '../../api/endpoints'
import type { PublishResult } from '../../types'

interface Props {
  pageId: string | null
  disabled: boolean
}

export default function PublishButton({ pageId, disabled }: Props) {
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handlePublish = async () => {
    if (!pageId) return
    setPublishing(true)
    setError(null)
    try {
      const res = await publishPage(pageId)
      setResult(res.data)
      window.open(res.data.url, '_blank')
      navigate('/mypages')
    } catch (err: any) {
      setError(err.response?.data?.detail || '发布失败，请重试')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePublish}
        disabled={disabled || publishing || !pageId}
        className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium
                   hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   transition-colors"
      >
        {publishing ? '发布中...' : '📤 发布页面'}
      </button>

      {result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setResult(null)}>
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">🎉 发布成功！</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500 mb-2">页面链接</p>
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 break-all text-sm font-mono hover:underline">
                {result.url}
              </a>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(result.url)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                📋 复制链接
              </button>
              <button
                onClick={() => window.open(result.url, '_blank')}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm transition-colors"
              >
                🔗 打开页面
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}
