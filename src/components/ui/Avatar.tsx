import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const sizeClass = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }[size]

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={cn('rounded-full object-cover', sizeClass, className)}
      />
    )
  }

  return (
    <div className={cn('rounded-full bg-accent/30 flex items-center justify-center font-semibold text-accent-hover', sizeClass, className)}>
      {initials}
    </div>
  )
}
