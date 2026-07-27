type BrandLogoProps = {
  className?: string
  /** Compact sidebar mark vs full lockup */
  variant?: 'full' | 'mark'
}

export function BrandLogo({ className = '', variant = 'full' }: BrandLogoProps) {
  return (
    <img
      src="/brand/goorm-knowledgehub-logo.png"
      alt="Goorm KnowledgeHub AI"
      className={
        variant === 'mark'
          ? `h-10 w-auto object-contain object-left ${className}`
          : `h-auto w-full max-w-[220px] object-contain object-center ${className}`
      }
      decoding="async"
    />
  )
}
