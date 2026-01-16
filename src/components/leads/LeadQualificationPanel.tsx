// Lead Qualification Panel Component
// Provides BANT/MEDDIC checklist for lead qualification

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useScoringSettings } from '@/lib/hooks/useLeadScoring'
import { BANT_CRITERIA, MEDDIC_CRITERIA } from '@/lib/services/lead-scoring'
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface LeadQualificationPanelProps {
  leadId: string
  initialChecklist?: Record<string, boolean> | null
  initialStatus?: string | null
  onStatusChange?: (status: string, checklist: Record<string, boolean>) => void
}

export function LeadQualificationPanel({
  leadId,
  initialChecklist,
  initialStatus,
  onStatusChange,
}: LeadQualificationPanelProps) {
  const { settings } = useScoringSettings()
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialChecklist || {})
  const [status, setStatus] = useState(initialStatus || 'not_started')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const framework = settings?.qualification_framework || 'bant'
  const criteria = framework === 'meddic' ? MEDDIC_CRITERIA : BANT_CRITERIA

  // Initialize checklist with criteria keys
  useEffect(() => {
    if (!initialChecklist) {
      const defaultChecklist: Record<string, boolean> = {}
      Object.keys(criteria).forEach(key => {
        defaultChecklist[key] = false
      })
      setChecklist(defaultChecklist)
    }
  }, [criteria, initialChecklist])

  // Calculate progress
  const totalItems = Object.keys(criteria).length
  const completedItems = Object.values(checklist).filter(Boolean).length
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Determine status based on checklist
  const calculateStatus = (check: Record<string, boolean>) => {
    const completed = Object.values(check).filter(Boolean).length
    const total = Object.keys(criteria).length

    if (completed === 0) return 'not_started'
    if (completed === total) return 'qualified'
    return 'in_progress'
  }

  // Toggle a checklist item
  const toggleItem = async (key: string) => {
    const newChecklist = {
      ...checklist,
      [key]: !checklist[key],
    }
    const newStatus = calculateStatus(newChecklist)

    setChecklist(newChecklist)
    setStatus(newStatus)

    // Save to database
    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          qualification_checklist: newChecklist,
          qualification_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)

      if (updateError) throw updateError

      onStatusChange?.(newStatus, newChecklist)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Mark all as complete
  const markAllComplete = async () => {
    const newChecklist: Record<string, boolean> = {}
    Object.keys(criteria).forEach(key => {
      newChecklist[key] = true
    })

    setChecklist(newChecklist)
    setStatus('qualified')

    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          qualification_checklist: newChecklist,
          qualification_status: 'qualified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)

      if (updateError) throw updateError

      onStatusChange?.('qualified', newChecklist)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Disqualify lead
  const disqualify = async () => {
    try {
      setSaving(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          qualification_status: 'disqualified',
          status: 'unqualified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)

      if (updateError) throw updateError

      setStatus('disqualified')
      onStatusChange?.('disqualified', checklist)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    qualified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    disqualified: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-500" />
            Qualification ({framework.toUpperCase()})
          </CardTitle>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.not_started}`}>
            {status.replace('_', ' ')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedItems}/{totalItems} ({progress}%)</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist items */}
        <div className="space-y-2">
          {Object.entries(criteria).map(([key, { label, description }]) => (
            <button
              key={key}
              onClick={() => toggleItem(key)}
              disabled={saving || status === 'disqualified'}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                checklist[key]
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${(saving || status === 'disqualified') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {checklist[key] ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className={`font-medium text-sm ${checklist[key] ? 'text-green-700 dark:text-green-300' : ''}`}>
                  {label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        {status !== 'disqualified' && (
          <div className="flex gap-2 pt-2">
            {progress < 100 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markAllComplete}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Mark All Complete
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={disqualify}
              disabled={saving}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Disqualify
            </Button>
          </div>
        )}

        {/* Qualified state */}
        {status === 'qualified' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Lead is fully qualified!</span>
          </div>
        )}

        {/* Disqualified state */}
        {status === 'disqualified' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Lead has been disqualified</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
