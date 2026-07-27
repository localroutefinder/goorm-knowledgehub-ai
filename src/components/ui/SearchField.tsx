export function SearchField({
  placeholder = 'Search…',
  className = '',
  value,
  onChange,
}: {
  placeholder?: string
  className?: string
  value?: string
  onChange?: (v: string) => void
}) {
  return (
    <label
      className={`electronic-glow flex items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 ${className}`}
    >
      <span className="material-symbols-outlined text-outline text-[18px]">
        search
      </span>
      <input
        className="w-full bg-transparent font-body text-sm text-on-surface outline-none placeholder:text-outline"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  )
}
