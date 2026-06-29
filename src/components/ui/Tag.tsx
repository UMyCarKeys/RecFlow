import { cn } from '@/lib/utils'

interface TagProps {
  label: string
  onRemove?: () => void
  className?: string
}

export function Tag({ label, onRemove, className }: TagProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent', className)}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-accent-hover transition-colors">×</button>
      )}
    </span>
  )
}
