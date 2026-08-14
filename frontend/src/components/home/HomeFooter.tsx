import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '../ui/button'

/** 首页专属 CTA + Footer。仅在此组件内渲染，不放进 App.tsx 全局（避免与 /generator 全屏页冲突） */
export default function HomeFooter() {
  return (
    <div>
      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              想做一个能用的工具？一句话开始
            </h2>
            <p className="mt-2 text-muted-foreground">
              说出你的想法，几分钟内拥有一个可以分享的网页工具
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link to="/generator">
                <Sparkles className="size-4" /> 开始创作
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded bg-primary text-primary-foreground font-mono text-[0.6rem] font-semibold">
                &lt;/&gt;
              </span>
              <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                HTML<span className="text-primary">_</span>HOST
              </span>
            </div>
            <p>一句话，编译成能用的网页 · HTML 托管平台</p>
            <p className="font-mono text-xs">© 2026 HTML_HOST</p>
          </div>
          <p className="mt-5 text-center font-mono text-xs text-muted-foreground/70">&lt;/footer&gt;</p>
        </div>
      </footer>
    </div>
  )
}
