import { cn } from '../utils/cn'

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'glass-panel text-primary hover:border-glow transition-colors',
    accent: 'bg-accent-soft text-[color:var(--accent)] border border-[color:color-mix(in_oklab,var(--accent)_30%,transparent)] backdrop-blur-md shadow-[0_0_10px_color-mix(in_oklab,var(--accent)_20%,transparent)]',
    success: 'bg-[color:color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)] border border-[color:color-mix(in_oklab,var(--success)_30%,transparent)] backdrop-blur-md',
    warning: 'bg-[color:color-mix(in_oklab,var(--warning)_15%,transparent)] text-[color:var(--warning)] border border-[color:color-mix(in_oklab,var(--warning)_30%,transparent)] backdrop-blur-md',
    danger: 'bg-[color:color-mix(in_oklab,var(--error)_15%,transparent)] text-[color:var(--error)] border border-[color:color-mix(in_oklab,var(--error)_30%,transparent)] backdrop-blur-md',
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
