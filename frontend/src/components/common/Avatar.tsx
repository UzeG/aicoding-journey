import { cn } from '../../lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  className?: string
}

export default function Avatar({ src, name, className }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={cn('rounded-full object-cover shrink-0', className)}
      />
    )
  }
  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold select-none shrink-0',
        className
      )}
    >
      {initial}
    </div>
  )
}
