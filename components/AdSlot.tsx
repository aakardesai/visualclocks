const isDev = process.env.NODE_ENV === 'development'

type AdSlotType = 'leaderboard' | 'rectangle' | 'mobile-banner'

const dimensions: Record<AdSlotType, { width: number; height: number }> = {
  leaderboard: { width: 728, height: 90 },
  rectangle: { width: 300, height: 250 },
  'mobile-banner': { width: 320, height: 50 },
}

interface AdSlotProps {
  type: AdSlotType
  className?: string
}

export default function AdSlot({ type, className = '' }: AdSlotProps) {
  const { width, height } = dimensions[type]

  return (
    <div
      className={`ad-slot ad-${type} ${className}`}
      data-ad-slot={type}
      style={{
        width: type === 'leaderboard' ? '100%' : width,
        maxWidth: '100%',
        height,
        ...(isDev
          ? {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed rgba(201,168,76,0.2)',
              borderRadius: 4,
            }
          : {}),
      }}
    >
      {isDev && (
        <span
          style={{
            fontSize: 10,
            color: 'rgba(201,168,76,0.35)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}
        >
          Ad · {width}×{height}
        </span>
      )}
    </div>
  )
}
