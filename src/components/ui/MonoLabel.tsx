export function MonoLabel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`font-mono text-[12px] font-medium tracking-[0.05em] uppercase ${className}`}
    >
      {children}
    </span>
  )
}
