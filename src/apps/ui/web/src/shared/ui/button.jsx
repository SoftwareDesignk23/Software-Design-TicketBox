import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] text-white shadow-glow hover:shadow-[0_0_25px_color-mix(in_oklab,var(--accent)_60%,transparent)] border border-transparent hover:-translate-y-0.5',
        secondary:
          'glass-panel text-primary hover:bg-surface-3 hover:border-glow hover:shadow-glow hover:-translate-y-0.5',
        ghost: 'text-primary hover:bg-surface-2 active:bg-surface-3',
        outline:
          'border border-subtle text-primary hover:bg-surface-2 hover:border-glow',
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
