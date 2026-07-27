export function Icon({
  name,
  filled = false,
  className = '',
}: {
  name: string
  filled?: boolean
  className?: string
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : undefined
      }
    >
      {name}
    </span>
  )
}
