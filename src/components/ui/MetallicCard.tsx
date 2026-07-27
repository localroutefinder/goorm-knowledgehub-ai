import type { ReactNode } from 'react'

export function MetallicCard({
  children,
  className = '',
  hover = false,
}: {
  children?: ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={`relative rounded bg-surface-container-low/80 milled-edge backdrop-blur-xl ${
        hover ? 'transition-transform hover:-translate-y-1' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
