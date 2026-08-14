import { Children, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { useInView } from '../../hooks/useInView'

interface RevealProps {
  children: ReactNode
  /** 每个子元素错峰出现的间隔（ms） */
  stagger?: number
  className?: string
  threshold?: number
}

/**
 * 滚动进入视口时，子元素逐个淡入上移（逐条出现）。
 * reduced-motion：不等待滚动，直接可见。
 */
export default function Reveal({ children, stagger = 110, className, threshold }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>(threshold)

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child
        const el = child as ReactElement<{ className?: string; style?: CSSProperties }>
        return cloneElement(el, {
          className: cn(
            el.props.className,
            'transition-all duration-700 ease-out motion-reduce:transition-none',
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          ),
          style: { ...el.props.style, transitionDelay: `${i * stagger}ms` },
        })
      })}
    </div>
  )
}
