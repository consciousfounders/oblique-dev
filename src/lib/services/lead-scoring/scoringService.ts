// Lead Scoring Service
// Calculates and manages lead scores based on configurable rules

import { supabase } from '@/lib/supabase'
import type { Lead, LeadScoringRule, LeadScoreLabel } from '@/lib/supabase'
import type { ScoreBreakdown, LeadScoreResult, ScoringSettings } from './types'
import { DEFAULT_SCORING_SETTINGS } from './types'

export class LeadScoringService {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  // Get scoring settings for the tenant
  async getSettings(): Promise<ScoringSettings> {
    const { data, error } = await supabase
      .from('lead_scoring_settings')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .single()

    if (error || !data) {
      return DEFAULT_SCORING_SETTINGS
    }

    return {
      cold_threshold: data.cold_threshold,
      warm_threshold: data.warm_threshold,
      hot_threshold: data.hot_threshold,
      qualified_threshold: data.qualified_threshold,
      auto_convert_enabled: data.auto_convert_enabled,
      auto_convert_threshold: data.auto_convert_threshold,
      score_decay_enabled: data.score_decay_enabled,
      score_decay_days: data.score_decay_days,
      score_decay_percentage: data.score_decay_percentage,
      qualification_framework: data.qualification_framework,
      qualification_criteria: data.qualification_criteria,
    }
  }

  // Save scoring settings
  async saveSettings(settings: Partial<ScoringSettings>): Promise<void> {
    const { data: existing } = await supabase
      .from('lead_scoring_settings')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .single()

    if (existing) {
      await supabase
        .from('lead_scoring_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', this.tenantId)
    } else {
      await supabase.from('lead_scoring_settings').insert({
        tenant_id: this.tenantId,
        ...DEFAULT_SCORING_SETTINGS,
        ...settings,
      })
    }
  }

  // Get all scoring rules for the tenant
  async getRules(): Promise<LeadScoringRule[]> {
    const { data, error } = await supabase
      .from('lead_scoring_rules')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('priority', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Get active scoring rules
  async getActiveRules(): Promise<LeadScoringRule[]> {
    const { data, error } = await supabase
      .from('lead_scoring_rules')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Create a new scoring rule
  async createRule(rule: Omit<LeadScoringRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<LeadScoringRule> {
    const { data, error } = await supabase
      .from('lead_scoring_rules')
      .insert({
        ...rule,
        tenant_id: this.tenantId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update a scoring rule
  async updateRule(id: string, updates: Partial<LeadScoringRule>): Promise<void> {
    const { error } = await supabase
      .from('lead_scoring_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)

    if (error) throw error
  }

  // Delete a scoring rule
  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('lead_scoring_rules')
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId)

    if (error) throw error
  }

  // Calculate score for a single lead
  async calculateScore(lead: Lead): Promise<LeadScoreResult> {
    const rules = await this.getActiveRules()
    const settings = await this.getSettings()

    const breakdown: ScoreBreakdown = {
      demographic: 0,
      behavioral: 0,
      engagement: 0,
      fit: 0,
      total: 0,
    }

    const matchedRules: string[] = []

    for (const rule of rules) {
      if (this.evaluateRule(lead, rule)) {
        breakdown[rule.category] += rule.points
        matchedRules.push(rule.id)
      }
    }

    // Calculate total (max 100)
    breakdown.total = Math.min(
      100,
      breakdown.demographic + breakdown.behavioral + breakdown.engagement + breakdown.fit
    )

    // Determine label based on thresholds
    const label = this.getScoreLabel(breakdown.total, settings)

    return {
      score: breakdown.total,
      label,
      breakdown,
      matched_rules: matchedRules,
    }
  }

  // Evaluate if a rule matches a lead
  private evaluateRule(lead: Lead, rule: LeadScoringRule): boolean {
    const fieldValue = this.getLeadFieldValue(lead, rule.field_name)

    switch (rule.operator) {
      case 'equals':
        return String(fieldValue).toLowerCase() === String(rule.field_value).toLowerCase()

      case 'not_equals':
        return String(fieldValue).toLowerCase() !== String(rule.field_value).toLowerCase()

      case 'contains':
        if (!fieldValue || !rule.field_value) return false
        const containsValues = rule.field_value.split(',').map(v => v.trim().toLowerCase())
        const fieldLower = String(fieldValue).toLowerCase()
        return containsValues.some(v => fieldLower.includes(v))

      case 'not_contains':
        if (!fieldValue || !rule.field_value) return true
        const notContainsValues = rule.field_value.split(',').map(v => v.trim().toLowerCase())
        const fieldLowerNot = String(fieldValue).toLowerCase()
        return !notContainsValues.some(v => fieldLowerNot.includes(v))

      case 'greater_than':
        const numValue = Number(fieldValue) || 0
        const threshold = Number(rule.field_value) || 0
        return numValue > threshold

      case 'less_than':
        const numVal = Number(fieldValue) || 0
        const thresh = Number(rule.field_value) || 0
        return numVal < thresh

      case 'in':
        if (!rule.field_values || !fieldValue) return false
        return rule.field_values.map(v => v.toLowerCase()).includes(String(fieldValue).toLowerCase())

      case 'not_in':
        if (!rule.field_values) return true
        if (!fieldValue) return true
        return !rule.field_values.map(v => v.toLowerCase()).includes(String(fieldValue).toLowerCase())

      case 'exists':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''

      case 'not_exists':
        return fieldValue === null || fieldValue === undefined || fieldValue === ''

      default:
        return false
    }
  }

  // Get lead field value by field name
  private getLeadFieldValue(lead: Lead, fieldName: string): unknown {
    const fieldMap: Record<string, unknown> = {
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      title: lead.title,
      source: lead.source,
      status: lead.status,
      industry: lead.industry,
      company_size: lead.company_size,
      annual_revenue: lead.annual_revenue,
      activity_count: lead.activity_count,
    }

    return fieldMap[fieldName]
  }

  // Get score label based on thresholds
  private getScoreLabel(score: number, settings: ScoringSettings): LeadScoreLabel {
    if (score >= settings.qualified_threshold) return 'qualified'
    if (score >= settings.hot_threshold) return 'hot'
    if (score >= settings.warm_threshold) return 'warm'
    return 'cold'
  }

  // Update lead score in database
  async updateLeadScore(
    leadId: string,
    result: LeadScoreResult,
    triggeredBy?: string
  ): Promise<void> {
    // Get current score for history
    const { data: currentLead } = await supabase
      .from('leads')
      .select('score')
      .eq('id', leadId)
      .single()

    const previousScore = currentLead?.score

    // Update lead score
    const { error } = await supabase
      .from('leads')
      .update({
        score: result.score,
        score_label: result.label,
        demographic_score: result.breakdown.demographic,
        behavioral_score: result.breakdown.behavioral,
        engagement_score: result.breakdown.engagement,
        fit_score: result.breakdown.fit,
        score_breakdown: result.breakdown as unknown as Record<string, number>,
        last_score_update: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    if (error) throw error

    // Record score history
    if (previousScore !== result.score) {
      await supabase.from('lead_score_history').insert({
        tenant_id: this.tenantId,
        lead_id: leadId,
        previous_score: previousScore,
        new_score: result.score,
        change_reason: triggeredBy ? `Triggered by: ${triggeredBy}` : 'Manual recalculation',
        triggered_by: triggeredBy,
      })
    }
  }

  // Recalculate scores for all leads
  async recalculateAllScores(): Promise<{ updated: number; errors: string[] }> {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .neq('status', 'converted')

    if (error) throw error

    let updated = 0
    const errors: string[] = []

    for (const lead of leads || []) {
      try {
        const result = await this.calculateScore(lead)
        await this.updateLeadScore(lead.id, result, 'bulk_recalculation')
        updated++
      } catch (err) {
        errors.push(`Failed to update lead ${lead.id}: ${err}`)
      }
    }

    return { updated, errors }
  }

  // Apply score decay to inactive leads
  async applyScoreDecay(): Promise<{ updated: number }> {
    const settings = await this.getSettings()

    if (!settings.score_decay_enabled) {
      return { updated: 0 }
    }

    const decayDate = new Date()
    decayDate.setDate(decayDate.getDate() - settings.score_decay_days)

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .neq('status', 'converted')
      .lt('last_activity_at', decayDate.toISOString())
      .gt('score', 0)

    if (error) throw error

    let updated = 0

    for (const lead of leads || []) {
      const decayAmount = Math.ceil((lead.score || 0) * (settings.score_decay_percentage / 100))
      const newScore = Math.max(0, (lead.score || 0) - decayAmount)

      await supabase
        .from('leads')
        .update({
          score: newScore,
          score_label: this.getScoreLabel(newScore, settings),
          last_score_update: new Date().toISOString(),
        })
        .eq('id', lead.id)

      await supabase.from('lead_score_history').insert({
        tenant_id: this.tenantId,
        lead_id: lead.id,
        previous_score: lead.score,
        new_score: newScore,
        change_reason: `Score decay (${settings.score_decay_percentage}% after ${settings.score_decay_days} days)`,
        triggered_by: 'system_decay',
      })

      updated++
    }

    return { updated }
  }

  // Get score history for a lead
  async getScoreHistory(leadId: string): Promise<Array<{
    id: string
    previous_score: number | null
    new_score: number
    change_reason: string | null
    created_at: string
  }>> {
    const { data, error } = await supabase
      .from('lead_score_history')
      .select('id, previous_score, new_score, change_reason, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  }
}

// Helper function to create a scoring service instance
export function createScoringService(tenantId: string): LeadScoringService {
  return new LeadScoringService(tenantId)
}
