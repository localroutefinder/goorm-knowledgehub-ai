import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-container text-on-primary-container hard-shadow hover:-translate-y-0.5 active:translate-y-1 active:shadow-none',
  secondary:
    'bg-surface-bright text-brushed-silver milled-edge hard-shadow-secondary hover:-translate-y-0.5',
  ghost:
    'bg-transparent text-on-surface-variant hover:text-secondary hover:bg-surface-variant/40',
  danger:
    'bg-tertiary-container text-on-tertiary-container hard-shadow-tertiary',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-bold tracking-tight transition-all duration-100 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
