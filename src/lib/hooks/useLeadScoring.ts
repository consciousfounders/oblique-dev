// Lead Scoring Hook
// Provides lead scoring functionality to React components

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { LeadScoringRule, LeadScoringSettings } from '@/lib/supabase'
import { createScoringService, type LeadScoreResult } from '@/lib/services/lead-scoring'

interface UseLeadScoringOptions {
  leadId?: string
  autoCalculate?: boolean
}

interface UseLeadScoringReturn {
  score: number | null
  scoreLabel: string | null
  breakdown: {
    demographic: number
    behavioral: number
    engagement: number
    fit: number
  } | null
  loading: boolean
  calculating: boolean
  error: string | null
  calculateScore: () => Promise<LeadScoreResult | null>
  refreshScore: () => Promise<void>
}

export function useLeadScoring({ leadId, autoCalculate = false }: UseLeadScoringOptions): UseLeadScoringReturn {
  const { user } = useAuth()
  const [score, setScore] = useState<number | null>(null)
  const [scoreLabel, setScoreLabel] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<{
    demographic: number
    behavioral: number
    engagement: number
    fit: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current lead score
  const fetchScore = useCallback(async () => {
    if (!leadId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('score, score_label, demographic_score, behavioral_score, engagement_score, fit_score')
        .eq('id', leadId)
        .single()

      if (fetchError) throw fetchError

      setScore(data?.score ?? null)
      setScoreLabel(data?.score_label ?? null)
      setBreakdown(data ? {
        demographic: data.demographic_score ?? 0,
        behavioral: data.behavioral_score ?? 0,
        engagement: data.engagement_score ?? 0,
        fit: data.fit_score ?? 0,
      } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch score')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Calculate and update lead score
  const calculateScore = useCallback(async (): Promise<LeadScoreResult | null> => {
    if (!leadId || !user?.tenantId) return null

    try {
      setCalculating(true)
      setError(null)

      // Fetch full lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadError || !lead) throw new Error('Lead not found')

      // Calculate score
      const scoringService = createScoringService(user.tenantId)
      const result = await scoringService.calculateScore(lead)

      // Update lead with new score
      await scoringService.updateLeadScore(leadId, result, 'manual_calculation')

      // Update local state
      setScore(result.score)
      setScoreLabel(result.label)
      setBreakdown({
        demographic: result.breakdown.demographic,
        behavioral: result.breakdown.behavioral,
        engagement: result.breakdown.engagement,
        fit: result.breakdown.fit,
      })

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate score')
      return null
    } finally {
      setCalculating(false)
    }
  }, [leadId, user?.tenantId])

  // Initial fetch
  useEffect(() => {
    fetchScore()
  }, [fetchScore])

  // Auto calculate if enabled and no score exists
  useEffect(() => {
    if (autoCalculate && !loading && score === null && leadId) {
      calculateScore()
    }
  }, [autoCalculate, loading, score, leadId, calculateScore])

  return {
    score,
    scoreLabel,
    breakdown,
    loading,
    calculating,
    error,
    calculateScore,
    refreshScore: fetchScore,
  }
}

// Hook for managing scoring rules
interface UseScoringRulesReturn {
  rules: LeadScoringRule[]
  loading: boolean
  error: string | null
  createRule: (rule: Omit<LeadScoringRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateRule: (id: string, updates: Partial<LeadScoringRule>) => Promise<void>
  deleteRule: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useScoringRules(): UseScoringRulesReturn {
  const { user } = useAuth()
  const [rules, setRules] = useState<LeadScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const scoringService = createScoringService(user.tenantId)
      const data = await scoringService.getRules()
      setRules(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rules')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const createRule = useCallback(async (
    rule: Omit<LeadScoringRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user?.tenantId) return

    const scoringService = createScoringService(user.tenantId)
    await scoringService.createRule(rule)
    await fetchRules()
  }, [user?.tenantId, fetchRules])

  const updateRule = useCallback(async (id: string, updates: Partial<LeadScoringRule>) => {
    if (!user?.tenantId) return

    const scoringService = createScoringService(user.tenantId)
    await scoringService.updateRule(id, updates)
    await fetchRules()
  }, [user?.tenantId, fetchRules])

  const deleteRule = useCallback(async (id: string) => {
    if (!user?.tenantId) return

    const scoringService = createScoringService(user.tenantId)
    await scoringService.deleteRule(id)
    await fetchRules()
  }, [user?.tenantId, fetchRules])

  return {
    rules,
    loading,
    error,
    createRule,
    updateRule,
    deleteRule,
    refresh: fetchRules,
  }
}

// Hook for scoring settings
interface UseScoringSettingsReturn {
  settings: LeadScoringSettings | null
  loading: boolean
  error: string | null
  saveSettings: (updates: Partial<LeadScoringSettings>) => Promise<void>
  refresh: () => Promise<void>
}

export function useScoringSettings(): UseScoringSettingsReturn {
  const { user } = useAuth()
  const [settings, setSettings] = useState<LeadScoringSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data } = await supabase
        .from('lead_scoring_settings')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .single()

      setSettings(data)
    } catch (err) {
      // No settings exist yet, use defaults
      setSettings(null)
      setError(err instanceof Error ? err.message : null)
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = useCallback(async (updates: Partial<LeadScoringSettings>) => {
    if (!user?.tenantId) return

    const scoringService = createScoringService(user.tenantId)
    await scoringService.saveSettings(updates)
    await fetchSettings()
  }, [user?.tenantId, fetchSettings])

  return {
    settings,
    loading,
    error,
    saveSettings,
    refresh: fetchSettings,
  }
}

// Hook for score history
interface UseScoreHistoryReturn {
  history: Array<{
    id: string
    previous_score: number | null
    new_score: number
    change_reason: string | null
    created_at: string
  }>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useScoreHistory(leadId: string): UseScoreHistoryReturn {
  const { user } = useAuth()
  const [history, setHistory] = useState<Array<{
    id: string
    previous_score: number | null
    new_score: number
    change_reason: string | null
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!user?.tenantId || !leadId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const scoringService = createScoringService(user.tenantId)
      const data = await scoringService.getScoreHistory(leadId)
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, leadId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
  }
}
