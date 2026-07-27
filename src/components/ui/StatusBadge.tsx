const tones: Record<string, string> = {
  operational: 'bg-secondary-container/20 text-secondary-fixed-dim border-secondary-container/40',
  syncing: 'bg-primary-container/20 text-primary border-primary/40',
  degraded: 'bg-tertiary-container/30 text-tertiary border-tertiary/40',
  indexed: 'bg-secondary-container/20 text-secondary-fixed-dim border-secondary-container/40',
  failed: 'bg-error-container/40 text-error border-error/40',
  info: 'bg-surface-bright text-on-surface-variant border-outline-variant',
  warn: 'bg-tertiary-container/20 text-tertiary border-tertiary/30',
  error: 'bg-error-container/40 text-error border-error/40',
}

export function StatusBadge({
  status,
  label,
}: {
  status: string
  label?: string
}) {
  const tone = tones[status] ?? tones.info
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      {label ?? status}
    </span>
  )
}
