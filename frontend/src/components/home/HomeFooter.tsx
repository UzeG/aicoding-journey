import { Link } from 'react-router-dom'
import { Sparkles, Zap } from 'lucide-react'
import { Button } from '../ui/button'

/** 首页专属 CTA + Footer。仅在此组件内渲染，不放进 App.tsx 全局（避免与 /generator 全屏页冲突） */
export default function HomeFooter() {
  return (
    <div>
      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">准备好了吗？一句话开始创作</h2>
            <p className="mt-2 text-muted-foreground">输入你的想法，几分钟内拥有一个可分享的网页</p>
            <Button size="lg" className="mt-6" asChild>
              <Link to="/generator">
                <Sparkles className="size-4" /> 立即开始生成
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Zap className="size-4 text-primary" /> HTML Host
          </div>
          <p>用自然语言创造网页 · AI Coding HTML 托管平台</p>
          <p className="text-xs">© 2026 HTML Host</p>
        </div>
      </footer>
    </div>
  )
}
