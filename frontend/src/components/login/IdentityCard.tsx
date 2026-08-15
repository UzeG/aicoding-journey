import { Zap, FileText, Users, ArrowUpRight, Sparkles, Upload, Rocket, Phone } from 'lucide-react'
import Avatar from '../common/Avatar'
import { cn } from '../../lib/utils'

type Mode = 'login' | 'register'

interface Props {
  mode: Mode
  /** 头像预览（本地 object URL），未选则为 null → 用名字首字母 */
  avatarSrc: string | null
  name: string
  userId: string
  phone: string
}

const STEPS = [
  { icon: Sparkles, label: '生成' },
  { icon: Upload, label: '部署' },
  { icon: Rocket, label: '分享' },
]

/**
 * 登录页左半屏：品牌声明 + 实时「名片」预览。
 * 注册模式实时镜像右侧表单（昵称/头像/ID 即输即现）；登录模式镜像输入的账号。
 */
export default function IdentityCard({ mode, avatarSrc, name, userId, phone }: Props) {
  const isRegister = mode === 'register'

  // 名片预览：注册 = 镜像表单；登录 = 镜像账号
  const cardName = name.trim() || (isRegister ? '新朋友' : '你的身份')
  const cardId = isRegister ? (userId.trim() || 'your-id') : null
  const cardAvatarSrc = isRegister ? avatarSrc : null
  const cardPhone = isRegister ? phone : null

  return (
    <div className="hidden lg:flex flex-1 relative overflow-hidden">
      {/* 环境光：主色光晕 + 细网格（跟随主题色/深浅） */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-1/3 -left-1/4 size-[38rem] rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, var(--primary), transparent 65%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="absolute -bottom-1/4 -right-1/4 size-[30rem] rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, var(--live), transparent 65%)' }} />
      </div>

      <div className="relative z-10 m-auto w-full max-w-md px-10">
        {/* 品牌 */}
        <div className="flex items-center gap-3 mb-6 animate-fade-up">
          <span className="flex items-center justify-center size-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Zap className="size-6" fill="currentColor" />
          </span>
          <div>
            <p className="text-xl font-extrabold tracking-tight text-foreground leading-none">Manifest</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">一句话 · 一个网页</p>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight leading-[1.15] text-foreground mb-6 animate-fade-up">
          {isRegister ? (
            <>
              创建你的
              <span className="text-primary">数字名片</span>
            </>
          ) : (
            <>
              欢迎回到
              <span className="text-primary">Manifest</span>
            </>
          )}
        </h1>

        {/* 名片预览（签名元素：表单输入实时镜像） */}
        <div className="rounded-2xl border border-border bg-card shadow-[0_28px_60px_-28px_rgba(24,32,28,0.3)] overflow-hidden animate-fade-up">
          {/* 名片标题栏 */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/50">
            <span className="font-mono text-xs text-muted-foreground">manifest · 名片</span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-live">
              <span className="size-1.5 rounded-full bg-live animate-pulse" />
              {isRegister ? '编辑中' : '登录中'}
            </span>
          </div>

          {/* 名片主体 */}
          <div className="px-6 py-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={cardAvatarSrc}
                name={cardName}
                className="size-16 text-xl ring-2 ring-primary/20"
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground truncate">{cardName}</p>
                {cardId && <p className="text-sm text-muted-foreground truncate">@{cardId}</p>}
                {cardPhone && (
                  <p className="text-xs font-mono text-muted-foreground/70 mt-0.5">{cardPhone}</p>
                )}
                {!isRegister && (
                  <p className="text-xs text-muted-foreground mt-0.5">支持手机号或用户 ID 登录</p>
                )}
              </div>
            </div>

            <div className="my-5 h-px bg-border" />

            {/* 统计占位：新账号从 0 开始 */}
            <div className="flex items-center gap-5 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="size-4 text-primary" />
                页面 <span className="font-semibold text-foreground">0</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="size-4 text-primary" />
                粉丝 <span className="font-semibold text-foreground">0</span>
              </span>
              {isRegister && (
                <span className="flex items-center gap-1 font-mono text-xs text-success ml-auto">
                  /{cardId}
                  <ArrowUpRight className="size-3" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 三步链路（mono 终端语言，呼应首页） */}
        <div className="mt-6 flex items-center gap-2 font-mono text-xs text-muted-foreground animate-fade-up">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/50">→</span>}
              <span className="flex items-center gap-1.5">
                <s.icon className={cn('size-3.5', i === STEPS.length - 1 ? 'text-success' : 'text-primary')} />
                {s.label}
              </span>
            </div>
          ))}
          <span className="flex items-center gap-1 ml-auto opacity-60">
            <Phone className="size-3" />
            {phone ? phone : '手机号'}
          </span>
        </div>
      </div>
    </div>
  )
}
