import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import Reveal from '../common/Reveal'

/** 首页专属 CTA + Footer。仅在此组件内渲染，不放进 App.tsx 全局（避免与 /creation 全屏页冲突） */
export default function HomeFooter() {
  return (
    <div>
      {/* CTA */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              想部署一个能用的页面？
            </h2>
            <p className="mt-2 text-muted-foreground">
              上传你的 HTML，或让 AI 生成一个——一键部署上线，分享给所有人使用
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link to="/creation">
                <Sparkles className="size-4" /> 开始部署
              </Link>
            </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="text-sm font-bold tracking-tight text-foreground">Manifest</span>
            <p>上传或生成，一键部署上线 · HTML 页面平台</p>
            <p className="text-xs">© 2026</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
