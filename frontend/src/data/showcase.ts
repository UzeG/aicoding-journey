// ============================================================================
// TODO(showcase): 本文件为静态演示假数据（CSS 手绘骨架缩略图），后续接入真实发布数据。
//   后端计划：新增 GET /api/showcase 返回精选已发布作品（字段 cover_url / title / tags）
//   前端计划：ShowcaseSection 把 <MockThumbnail> 替换为真实封面
//             <img src={item.cover_url} className="aspect-video w-full object-cover" alt={item.title} />
//             字段对齐后删除本文件与 MockThumbnail 的 variant 分支。
// ============================================================================

export type AccentKey = 'emerald' | 'sky' | 'rose' | 'amber' | 'violet' | 'cyan'
export type ThumbVariant = 'table' | 'calc' | 'greeting' | 'wheel' | 'dashboard' | 'cards'

export interface ShowcaseItem {
  id: string
  title: string
  description: string
  tags: string[]
  /** 假想的 HTML 文件名，卡片底部规格行展示（接入真实数据后由 cover_url 等字段替代） */
  file: string
  /** 假想的收藏数 */
  likes: string
  accent: AccentKey // 决定骨架块颜色（映射表见 MockThumbnail）
  variant: ThumbVariant // 决定骨架布局（对比表/计算器/贺卡/转盘/仪表盘/落地页）
}

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 's1',
    title: '手机套餐对比表',
    description: '5 大运营商套餐横向对比，支持按月费排序筛选',
    tags: ['对比表', '数据表格'],
    file: 'plan-compare.html',
    likes: '1.2k',
    accent: 'emerald',
    variant: 'table',
  },
  {
    id: 's2',
    title: '话费计算器',
    description: '选择套餐输入用量，自动算出当月账单明细',
    tags: ['计算器', '工具'],
    file: 'bill-calc.html',
    likes: '986',
    accent: 'sky',
    variant: 'calc',
  },
  {
    id: 's3',
    title: '中秋祝福贺卡',
    description: '渐变背景 + 飘落花瓣动画，可填写收件人姓名',
    tags: ['贺卡', '动画'],
    file: 'moon-card.html',
    likes: '754',
    accent: 'rose',
    variant: 'greeting',
  },
  {
    id: 's4',
    title: '8 格幸运转盘',
    description: '8 格奖品转盘，减速动画 + 中奖弹窗',
    tags: ['抽奖', '互动'],
    file: 'lucky-wheel.html',
    likes: '2.1k',
    accent: 'amber',
    variant: 'wheel',
  },
  {
    id: 's5',
    title: '流量数据仪表盘',
    description: '环形图 + 趋势折线 + 统计卡片，移动端自适应',
    tags: ['仪表盘', '图表'],
    file: 'traffic-board.html',
    likes: '643',
    accent: 'violet',
    variant: 'dashboard',
  },
  {
    id: 's6',
    title: '品牌产品落地页',
    description: '响应式导航 + 首屏 Banner + 特性卡片',
    tags: ['落地页', '响应式'],
    file: 'brand-landing.html',
    likes: '1.0k',
    accent: 'cyan',
    variant: 'cards',
  },
]
