import { useProgressStore } from '../../stores/progress'

/** 全局顶部加载进度条（GitHub 风格）：固定视口顶部、主题色细条、深浅自适应（var(--primary)）。 */
export default function TopProgressBar() {
  const visible = useProgressStore((s) => s.visible)
  const value = useProgressStore((s) => s.value)

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[9999] pointer-events-none">
      <div
        className="h-full transition-[width] duration-200 ease-out"
        style={{
          width: `${value}%`,
          background: 'var(--primary)',
          boxShadow: '0 0 8px var(--primary)',
        }}
      />
    </div>
  )
}
