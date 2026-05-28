import { cn } from '../utils/cn'

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-surface-2 text-primary border border-subtle',
    accent: 'bg-accent-soft text-[color:var(--accent)]',
    success: 'bg-[color:color-mix(in oklab, var(--success) 18%, transparent)] text-[color:var(--success)]',
    warning: 'bg-[color:color-mix(in oklab, var(--warning) 18%, transparent)] text-[color:var(--warning)]',
    danger: 'bg-[color:color-mix(in oklab, var(--error) 18%, transparent)] text-[color:var(--error)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
