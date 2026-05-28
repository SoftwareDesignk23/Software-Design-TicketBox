import { cn } from '../utils/cn'

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'min-h-[120px] w-full resize-none rounded-3xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-primary placeholder:text-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]',
        className
      )}
      {...props}
    />
  )
}
