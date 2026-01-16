// Lead Scoring Panel Component
// Displays lead score with breakdown and actions

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLeadScoring, useScoreHistory } from '@/lib/hooks/useLeadScoring'
import {
  ScoreBreakdownBar,
  ScoreProgressRing,
} from './LeadScoreDisplay'
import {
  TrendingUp,
  RefreshCw,
  Loader2,
  History,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Users,
  Activity,
} from 'lucide-react'
import { CATEGORY_COLORS } from '@/lib/services/lead-scoring'

interface LeadScoringPanelProps {
  leadId: string
  onScoreUpdate?: (score: number, label: string) => void
}

export function LeadScoringPanel({ leadId, onScoreUpdate }: LeadScoringPanelProps) {
  const {
    score,
    scoreLabel,
    breakdown,
    loading,
    calculating,
    error,
    calculateScore,
  } = useLeadScoring({ leadId })

  const [showHistory, setShowHistory] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(true)

  const handleCalculate = async () => {
    const result = await calculateScore()
    if (result && onScoreUpdate) {
      onScoreUpdate(result.score, result.label)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading score data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            Lead Score
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCalculate}
            disabled={calculating}
            title="Recalculate lead score"
          >
            {calculating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {score === null ? 'Calculate' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {error && (
          <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded">
            {error}
          </div>
        )}

        {/* Main score display */}
        <div className="flex items-center justify-center py-4">
          <ScoreProgressRing score={score} label={scoreLabel} size={100} />
        </div>

        {/* Score breakdown */}
        {breakdown && (
          <div>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full text-left py-2"
            >
              <span className="text-sm font-medium text-muted-foreground">Score Breakdown</span>
              {showBreakdown ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {showBreakdown && (
              <div className="space-y-4">
                <ScoreBreakdownBar breakdown={breakdown} showLabels={false} />
                <div className="grid grid-cols-2 gap-3">
                  <ScoreCategoryCard
                    icon={<Users className="w-4 h-4" />}
                    label="Demographic"
                    value={breakdown.demographic}
                    category="demographic"
                  />
                  <ScoreCategoryCard
                    icon={<Zap className="w-4 h-4" />}
                    label="Behavioral"
                    value={breakdown.behavioral}
                    category="behavioral"
                  />
                  <ScoreCategoryCard
                    icon={<Activity className="w-4 h-4" />}
                    label="Engagement"
                    value={breakdown.engagement}
                    category="engagement"
                  />
                  <ScoreCategoryCard
                    icon={<Target className="w-4 h-4" />}
                    label="Fit"
                    value={breakdown.fit}
                    category="fit"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* History toggle */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide history' : 'Show history'}
          </button>
          {showHistory && <ScoreHistoryList leadId={leadId} />}
        </div>

        {/* No score state */}
        {score === null && !error && (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No score calculated yet</p>
            <p className="text-xs mt-1">Click "Calculate" to generate a score</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Score category card
interface ScoreCategoryCardProps {
  icon: React.ReactNode
  label: string
  value: number
  category: keyof typeof CATEGORY_COLORS
}

function ScoreCategoryCard({ icon, label, value, category }: ScoreCategoryCardProps) {
  const colors = CATEGORY_COLORS[category]
  return (
    <div className={`p-3 rounded-lg ${colors.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={colors.text}>{icon}</span>
        <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
      </div>
      <span className={`text-lg font-bold ${colors.text}`}>{value}</span>
    </div>
  )
}

// Score history list
function ScoreHistoryList({ leadId }: { leadId: string }) {
  const { history, loading, error } = useScoreHistory(leadId)

  if (loading) {
    return (
      <div className="py-4 text-center">
        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-red-500">
        Failed to load history
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No score history yet
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
        >
          <div>
            <div className="flex items-center gap-2">
              {entry.previous_score !== null ? (
                <>
                  <span className="text-muted-foreground">{entry.previous_score}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className={entry.new_score > (entry.previous_score || 0) ? 'text-green-600' : 'text-red-600'}>
                    {entry.new_score}
                  </span>
                </>
              ) : (
                <span className="text-green-600">Initial: {entry.new_score}</span>
              )}
            </div>
            {entry.change_reason && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {entry.change_reason}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(entry.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}
