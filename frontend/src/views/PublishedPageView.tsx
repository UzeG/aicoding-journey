import { useParams } from 'react-router-dom'

export default function PublishedPageView() {
  const { shortCode } = useParams<{ shortCode: string }>()
  const url = `${window.location.origin}/p/${shortCode}`

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">页面已发布</h1>
        <p className="text-gray-500 text-sm mb-6">复制链接或扫描二维码访问你的页面</p>

        {/* Link */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <input
            readOnly
            value={url}
            className="w-full text-sm font-mono text-center bg-transparent border-none outline-none text-emerald-600"
            onFocus={(e) => e.target.select()}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigator.clipboard.writeText(url)}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
          >
            📋 复制链接
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm text-center no-underline transition-colors"
          >
            🔗 打开页面
          </a>
        </div>
      </div>
    </div>
  )
}
