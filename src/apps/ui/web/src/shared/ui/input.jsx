import { cn } from '../utils/cn'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-2xl border border-subtle bg-surface-2 px-4 text-sm text-primary placeholder:text-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]',
        className
      )}
      {...props}
    />
  )
}
