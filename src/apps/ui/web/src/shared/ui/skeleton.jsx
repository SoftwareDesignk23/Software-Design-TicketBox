import { cn } from '../utils/cn'

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-[color:color-mix(in oklab, var(--surface-2) 70%, transparent)]',
        className
      )}
    />
  )
}
