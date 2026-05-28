import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[color:var(--accent)] text-[color:var(--ink-900)] shadow-soft hover:bg-[color:var(--accent-hover)]',
        secondary:
          'bg-surface-2 text-primary border border-subtle hover:bg-surface-3',
        ghost: 'text-primary hover:bg-surface-2',
        outline:
          'border border-subtle text-primary hover:bg-surface-2',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-5 text-base',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
