// Lead Score Display Component
// Shows the lead score prominently with visual indicators

import { SCORE_LABEL_COLORS, CATEGORY_COLORS } from '@/lib/services/lead-scoring'

interface LeadScoreDisplayProps {
  score: number | null
  label: string | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function LeadScoreDisplay({
  score,
  label,
  size = 'md',
  showLabel = true,
}: LeadScoreDisplayProps) {
  if (score === null) {
    return (
      <span className="text-muted-foreground text-sm">No score</span>
    )
  }

  const normalizedLabel = (label || 'cold') as keyof typeof SCORE_LABEL_COLORS
  const colors = SCORE_LABEL_COLORS[normalizedLabel] || SCORE_LABEL_COLORS.cold

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const circleSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const fontSizes = {
    sm: 'text-xs font-medium',
    md: 'text-sm font-semibold',
    lg: 'text-lg font-bold',
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${circleSizes[size]} rounded-full ${colors.bg} flex items-center justify-center ring-2 ${colors.ring} ring-opacity-30`}
      >
        <span className={`${fontSizes[size]} ${colors.text}`}>
          {score}
        </span>
      </div>
      {showLabel && (
        <span className={`${sizeClasses[size]} capitalize ${colors.text}`}>
          {label || 'cold'}
        </span>
      )}
    </div>
  )
}

// Score badge for compact display
interface LeadScoreBadgeProps {
  score: number | null
  label: string | null
}

export function LeadScoreBadge({ score, label }: LeadScoreBadgeProps) {
  if (score === null) {
    return null
  }

  const normalizedLabel = (label || 'cold') as keyof typeof SCORE_LABEL_COLORS
  const colors = SCORE_LABEL_COLORS[normalizedLabel] || SCORE_LABEL_COLORS.cold

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      <span className="font-bold">{score}</span>
      <span className="capitalize">{label}</span>
    </span>
  )
}

// Score breakdown bar
interface ScoreBreakdownBarProps {
  breakdown: {
    demographic: number
    behavioral: number
    engagement: number
    fit: number
  } | null
  showLabels?: boolean
}

export function ScoreBreakdownBar({ breakdown, showLabels = false }: ScoreBreakdownBarProps) {
  if (!breakdown) {
    return null
  }

  const total = breakdown.demographic + breakdown.behavioral + breakdown.engagement + breakdown.fit
  const maxScore = Math.max(total, 100)

  const categories = [
    { key: 'demographic', value: breakdown.demographic, label: 'Demographic' },
    { key: 'behavioral', value: breakdown.behavioral, label: 'Behavioral' },
    { key: 'engagement', value: breakdown.engagement, label: 'Engagement' },
    { key: 'fit', value: breakdown.fit, label: 'Fit' },
  ] as const

  return (
    <div className="space-y-2">
      <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
        {categories.map(({ key, value }) => {
          const width = maxScore > 0 ? (value / maxScore) * 100 : 0
          const colors = CATEGORY_COLORS[key]
          return (
            <div
              key={key}
              className={`h-full ${colors.fill.replace('fill-', 'bg-')} transition-all duration-300`}
              style={{ width: `${width}%` }}
              title={`${key}: ${value} points`}
            />
          )
        })}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-3 text-xs">
          {categories.map(({ key, value, label }) => {
            const colors = CATEGORY_COLORS[key]
            return (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${colors.fill.replace('fill-', 'bg-')}`} />
                <span className="text-muted-foreground">{label}:</span>
                <span className={`font-medium ${colors.text}`}>{value}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Score progress ring (circular display)
interface ScoreProgressRingProps {
  score: number | null
  label: string | null
  size?: number
}

export function ScoreProgressRing({ score, label, size = 80 }: ScoreProgressRingProps) {
  const normalizedScore = score ?? 0
  const normalizedLabel = (label || 'cold') as keyof typeof SCORE_LABEL_COLORS
  const colors = SCORE_LABEL_COLORS[normalizedLabel] || SCORE_LABEL_COLORS.cold

  const strokeWidth = size * 0.1
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference

  const colorMap: Record<string, string> = {
    cold: '#3B82F6',
    warm: '#F59E0B',
    hot: '#F97316',
    qualified: '#22C55E',
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorMap[normalizedLabel] || colorMap.cold}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${colors.text}`}>
          {score ?? '--'}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {label || 'No score'}
        </span>
      </div>
    </div>
  )
}
