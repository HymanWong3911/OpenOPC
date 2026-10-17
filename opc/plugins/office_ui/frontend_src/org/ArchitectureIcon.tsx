interface ArchitectureIconProps {
  pattern?: string
}

function ArchitectureGlyph({ pattern }: ArchitectureIconProps) {
  switch (pattern) {
    case 'pipeline':
      return <>
        <rect x="2.5" y="9" width="4" height="6" rx="1" />
        <rect x="10" y="9" width="4" height="6" rx="1" />
        <rect x="17.5" y="9" width="4" height="6" rx="1" />
        <path d="M6.5 12H10m4 0h3.5" />
      </>
    case 'hub_spoke':
      return <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="3.5" r="1.5" />
        <circle cx="20.5" cy="12" r="1.5" />
        <circle cx="12" cy="20.5" r="1.5" />
        <circle cx="3.5" cy="12" r="1.5" />
        <path d="M12 5v4m3 3h4m-7 3v4M5 12h4" />
      </>
    case 'review_loop':
      return <>
        <rect x="3" y="9.5" width="5" height="5" rx="1" />
        <rect x="16" y="9.5" width="5" height="5" rx="1" />
        <path d="M6 6a7.5 7.5 0 0 1 12 0m0-3v3h-3M18 18a7.5 7.5 0 0 1-12 0m0 3v-3h3" />
      </>
    case 'hierarchical':
      return <>
        <rect x="9" y="3" width="6" height="5" rx="1" />
        <rect x="3" y="16" width="6" height="5" rx="1" />
        <rect x="15" y="16" width="6" height="5" rx="1" />
        <path d="M12 8v4M6 16v-4h12v4" />
      </>
    case 'flat':
      return <>
        <rect x="2.5" y="4" width="4" height="5" rx="1" />
        <rect x="10" y="4" width="4" height="5" rx="1" />
        <rect x="17.5" y="4" width="4" height="5" rx="1" />
        <path d="M4.5 9v7H12m0-7v7m7.5-7v7H12m0 0v4" />
      </>
    default:
      return <>
        <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
        <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
        <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
        <rect x="14.5" y="14.5" width="6" height="6" rx="1" />
        <path d="M9.5 6.5h5M6.5 9.5v5m11-5v5m-8 3h5" />
      </>
  }
}

export function ArchitectureIcon({ pattern }: ArchitectureIconProps) {
  return (
    <span className="architecture-icon" aria-hidden="true">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        <ArchitectureGlyph pattern={pattern} />
      </svg>
    </span>
  )
}
