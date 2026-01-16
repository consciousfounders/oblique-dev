// Enrichment Service
// Handles data enrichment operations with caching, rate limiting, and cost tracking

import { supabase } from '@/lib/supabase'
import { createProvider } from './providers'
import type {
  EnrichmentProvider,
  EnrichmentSettings,
  EnrichmentUsage,
  CompanyEnrichmentData,
  ContactEnrichmentData,
  EnrichCompanyRequest,
  EnrichContactRequest,
  EnrichmentResult,
  EnrichmentTrigger,
  EnrichmentJob,
} from '@/lib/types/enrichment'

// Cache duration in milliseconds (1 hour for in-memory cache)
const MEMORY_CACHE_DURATION = 60 * 60 * 1000
const DEFAULT_STALE_DAYS = 90

// In-memory cache for settings to avoid repeated DB calls
interface CacheEntry<T> {
  data: T
  expires: number
}

const settingsCache = new Map<string, CacheEntry<EnrichmentSettings>>()

export class EnrichmentService {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  // Get tenant's enrichment settings (with caching)
  async getSettings(): Promise<EnrichmentSettings | null> {
    const cacheKey = this.tenantId
    const cached = settingsCache.get(cacheKey)

    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    try {
      const { data, error } = await supabase
        .from('enrichment_settings')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return null
          return null
        }
        throw error
      }

      // Cache the result
      settingsCache.set(cacheKey, {
        data: data as EnrichmentSettings,
        expires: Date.now() + MEMORY_CACHE_DURATION,
      })

      return data as EnrichmentSettings
    } catch (error) {
      console.error('Error fetching enrichment settings:', error)
      return null
    }
  }

  // Save or update enrichment settings
  async saveSettings(settings: Partial<EnrichmentSettings>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('enrichment_settings')
        .upsert({
          tenant_id: this.tenantId,
          ...settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id',
        })

      if (error) throw error

      // Clear cache
      settingsCache.delete(this.tenantId)

      return { success: true }
    } catch (error) {
      console.error('Error saving enrichment settings:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Check if we can perform enrichment (rate limiting)
  async canEnrich(): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await this.getSettings()
    if (!settings) {
      return { allowed: false, reason: 'Enrichment not configured' }
    }

    // Check daily limit
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const { data: dailyUsage } = await supabase
      .from('enrichment_usage')
      .select('total_enrichments')
      .eq('tenant_id', this.tenantId)
      .gte('period_start', startOfDay.toISOString())
      .single()

    if (dailyUsage && dailyUsage.total_enrichments >= settings.daily_enrichment_limit) {
      return { allowed: false, reason: 'Daily enrichment limit reached' }
    }

    // Check monthly credit budget
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const { data: monthlyUsage } = await supabase
      .from('enrichment_usage')
      .select('credits_used')
      .eq('tenant_id', this.tenantId)
      .gte('period_start', startOfMonth.toISOString())
      .lte('period_end', endOfMonth.toISOString())

    const totalCredits = monthlyUsage?.reduce((sum, u) => sum + (u.credits_used || 0), 0) || 0
    if (totalCredits >= settings.monthly_credit_budget) {
      return { allowed: false, reason: 'Monthly credit budget exceeded' }
    }

    return { allowed: true }
  }

  // Get API key for a provider
  private async getApiKey(provider: EnrichmentProvider): Promise<string | null> {
    const settings = await this.getSettings()
    if (!settings) return null

    switch (provider) {
      case 'clearbit':
        return settings.clearbit_enabled ? settings.clearbit_api_key_encrypted || null : null
      case 'apollo':
        return settings.apollo_enabled ? settings.apollo_api_key_encrypted || null : null
      case 'zoominfo':
        return settings.zoominfo_enabled ? settings.zoominfo_api_key_encrypted || null : null
      default:
        return null
    }
  }

  // Enrich a company
  async enrichCompany(
    request: EnrichCompanyRequest,
    trigger: EnrichmentTrigger = 'on_demand'
  ): Promise<EnrichmentResult<CompanyEnrichmentData>> {
    // Check rate limits
    const canProceed = await this.canEnrich()
    if (!canProceed.allowed) {
      return { success: false, error: canProceed.reason }
    }

    // Check for existing non-stale enrichment
    if (!request.force_refresh) {
      const existing = await this.getCompanyEnrichment(request.account_id)
      if (existing && !this.isStale(existing.enriched_at)) {
        return { success: true, data: existing, cached: true }
      }
    }

    // Get provider
    const settings = await this.getSettings()
    const provider = request.provider || settings?.default_company_provider || 'clearbit'
    const apiKey = await this.getApiKey(provider)

    if (!apiKey) {
      return {
        success: false,
        error: `Provider ${provider} is not configured`,
      }
    }

    // Create provider instance and enrich
    const providerInstance = createProvider(provider, apiKey)
    if (!providerInstance) {
      return { success: false, error: `Unknown provider: ${provider}` }
    }

    // Update status to in_progress
    await this.updateCompanyEnrichmentStatus(request.account_id, provider, 'in_progress')

    const result = await providerInstance.enrichCompany(request)

    if (result.success && result.data) {
      // Save enrichment data
      await this.saveCompanyEnrichment(request.account_id, {
        ...result.data,
        triggered_by: trigger,
      })

      // Track usage
      await this.trackUsage(provider, 'company', result.credits_used || 1, result.success)

      // Update the account with key fields
      await this.updateAccountFromEnrichment(request.account_id, result.data)
    } else {
      // Update status to failed
      await this.updateCompanyEnrichmentStatus(
        request.account_id,
        provider,
        'failed',
        result.error
      )
    }

    return result
  }

  // Enrich a contact
  async enrichContact(
    request: EnrichContactRequest,
    trigger: EnrichmentTrigger = 'on_demand'
  ): Promise<EnrichmentResult<ContactEnrichmentData>> {
    // Check rate limits
    const canProceed = await this.canEnrich()
    if (!canProceed.allowed) {
      return { success: false, error: canProceed.reason }
    }

    const entityId = request.contact_id || request.lead_id
    const entityType = request.contact_id ? 'contact' : 'lead'

    if (!entityId) {
      return { success: false, error: 'Either contact_id or lead_id is required' }
    }

    // Check for existing non-stale enrichment
    if (!request.force_refresh) {
      const existing = await this.getContactEnrichment(entityType, entityId)
      if (existing && !this.isStale(existing.enriched_at)) {
        return { success: true, data: existing, cached: true }
      }
    }

    // Get provider
    const settings = await this.getSettings()
    const provider = request.provider || settings?.default_contact_provider || 'clearbit'
    const apiKey = await this.getApiKey(provider)

    if (!apiKey) {
      return {
        success: false,
        error: `Provider ${provider} is not configured`,
      }
    }

    // Create provider instance and enrich
    const providerInstance = createProvider(provider, apiKey)
    if (!providerInstance) {
      return { success: false, error: `Unknown provider: ${provider}` }
    }

    // Update status to in_progress
    await this.updateContactEnrichmentStatus(entityType, entityId, provider, 'in_progress')

    const result = await providerInstance.enrichContact(request)

    if (result.success && result.data) {
      // Save enrichment data
      await this.saveContactEnrichment(entityType, entityId, {
        ...result.data,
        triggered_by: trigger,
      })

      // Track usage
      await this.trackUsage(provider, 'contact', result.credits_used || 1, result.success)

      // Update the contact/lead with key fields
      if (entityType === 'contact') {
        await this.updateContactFromEnrichment(entityId, result.data)
      } else {
        await this.updateLeadFromEnrichment(entityId, result.data)
      }
    } else {
      // Update status to failed
      await this.updateContactEnrichmentStatus(
        entityType,
        entityId,
        provider,
        'failed',
        result.error
      )
    }

    return result
  }

  // Get existing company enrichment
  async getCompanyEnrichment(accountId: string): Promise<CompanyEnrichmentData | null> {
    try {
      const { data, error } = await supabase
        .from('company_enrichment')
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'completed')
        .order('enriched_at', { ascending: false })
        .limit(1)
        .single()

      if (error) return null
      return data as CompanyEnrichmentData
    } catch {
      return null
    }
  }

  // Get existing contact enrichment
  async getContactEnrichment(
    entityType: 'contact' | 'lead',
    entityId: string
  ): Promise<ContactEnrichmentData | null> {
    try {
      const column = entityType === 'contact' ? 'contact_id' : 'lead_id'
      const { data, error } = await supabase
        .from('contact_enrichment')
        .select('*')
        .eq(column, entityId)
        .eq('status', 'completed')
        .order('enriched_at', { ascending: false })
        .limit(1)
        .single()

      if (error) return null
      return data as ContactEnrichmentData
    } catch {
      return null
    }
  }

  // Save company enrichment data
  private async saveCompanyEnrichment(
    accountId: string,
    data: CompanyEnrichmentData
  ): Promise<void> {
    try {
      await supabase
        .from('company_enrichment')
        .upsert({
          tenant_id: this.tenantId,
          account_id: accountId,
          ...data,
          status: 'completed',
          enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'account_id,provider',
        })
    } catch (error) {
      console.error('Error saving company enrichment:', error)
    }
  }

  // Save contact enrichment data
  private async saveContactEnrichment(
    entityType: 'contact' | 'lead',
    entityId: string,
    data: ContactEnrichmentData
  ): Promise<void> {
    try {
      await supabase
        .from('contact_enrichment')
        .upsert({
          tenant_id: this.tenantId,
          contact_id: entityType === 'contact' ? entityId : null,
          lead_id: entityType === 'lead' ? entityId : null,
          ...data,
          status: 'completed',
          enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
    } catch (error) {
      console.error('Error saving contact enrichment:', error)
    }
  }

  // Update company enrichment status
  private async updateCompanyEnrichmentStatus(
    accountId: string,
    provider: EnrichmentProvider,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('company_enrichment')
        .upsert({
          tenant_id: this.tenantId,
          account_id: accountId,
          provider,
          status,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'account_id,provider',
        })
    } catch (error) {
      console.error('Error updating company enrichment status:', error)
    }
  }

  // Update contact enrichment status
  private async updateContactEnrichmentStatus(
    entityType: 'contact' | 'lead',
    entityId: string,
    provider: EnrichmentProvider,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('contact_enrichment')
        .upsert({
          tenant_id: this.tenantId,
          contact_id: entityType === 'contact' ? entityId : null,
          lead_id: entityType === 'lead' ? entityId : null,
          provider,
          status,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
    } catch (error) {
      console.error('Error updating contact enrichment status:', error)
    }
  }

  // Update account record with enriched data
  private async updateAccountFromEnrichment(
    accountId: string,
    data: CompanyEnrichmentData
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = {}

      // Only update fields that are empty or outdated
      if (data.industry) updates.industry = data.industry
      if (data.employee_range) updates.employee_count = data.employee_range
      if (data.revenue_range) updates.annual_revenue = data.revenue_range
      if (data.domain) updates.domain = data.domain
      if (data.phone) updates.phone = data.phone
      if (data.headquarters_city) updates.billing_city = data.headquarters_city
      if (data.headquarters_state) updates.billing_state = data.headquarters_state
      if (data.headquarters_country) updates.billing_country = data.headquarters_country
      if (data.headquarters_postal_code) updates.billing_postal_code = data.headquarters_postal_code
      if (data.headquarters_address) updates.billing_street = data.headquarters_address

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('accounts')
          .update(updates)
          .eq('id', accountId)
      }
    } catch (error) {
      console.error('Error updating account from enrichment:', error)
    }
  }

  // Update contact record with enriched data
  private async updateContactFromEnrichment(
    contactId: string,
    data: ContactEnrichmentData
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = {}

      if (data.email) updates.email = data.email
      if (data.phone || data.mobile_phone || data.work_phone) {
        updates.phone = data.phone || data.mobile_phone || data.work_phone
      }
      if (data.job_title) updates.title = data.job_title

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('contacts')
          .update(updates)
          .eq('id', contactId)
      }
    } catch (error) {
      console.error('Error updating contact from enrichment:', error)
    }
  }

  // Update lead record with enriched data
  private async updateLeadFromEnrichment(
    leadId: string,
    data: ContactEnrichmentData
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = {}

      if (data.email) updates.email = data.email
      if (data.phone || data.mobile_phone || data.work_phone) {
        updates.phone = data.phone || data.mobile_phone || data.work_phone
      }
      if (data.job_title) updates.title = data.job_title
      if (data.current_company) updates.company = data.current_company

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('leads')
          .update(updates)
          .eq('id', leadId)
      }
    } catch (error) {
      console.error('Error updating lead from enrichment:', error)
    }
  }

  // Track enrichment usage
  private async trackUsage(
    provider: EnrichmentProvider,
    type: 'company' | 'contact',
    credits: number,
    success: boolean
  ): Promise<void> {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      // Try to get existing usage record for today
      const { data: existing } = await supabase
        .from('enrichment_usage')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('provider', provider)
        .eq('period_start', startOfDay.toISOString().split('T')[0])
        .single()

      if (existing) {
        // Update existing
        const updates: Record<string, number> = {
          total_enrichments: (existing.total_enrichments || 0) + 1,
          credits_used: (existing.credits_used || 0) + credits,
        }

        if (type === 'company') {
          updates.company_enrichments = (existing.company_enrichments || 0) + 1
        } else {
          updates.contact_enrichments = (existing.contact_enrichments || 0) + 1
        }

        if (success) {
          updates.successful_enrichments = (existing.successful_enrichments || 0) + 1
        } else {
          updates.failed_enrichments = (existing.failed_enrichments || 0) + 1
        }

        await supabase
          .from('enrichment_usage')
          .update(updates)
          .eq('id', existing.id)
      } else {
        // Create new
        await supabase
          .from('enrichment_usage')
          .insert({
            tenant_id: this.tenantId,
            provider,
            period_start: startOfDay.toISOString().split('T')[0],
            period_end: endOfDay.toISOString().split('T')[0],
            company_enrichments: type === 'company' ? 1 : 0,
            contact_enrichments: type === 'contact' ? 1 : 0,
            total_enrichments: 1,
            successful_enrichments: success ? 1 : 0,
            failed_enrichments: success ? 0 : 1,
            credits_used: credits,
          })
      }
    } catch (error) {
      console.error('Error tracking enrichment usage:', error)
    }
  }

  // Check if enrichment data is stale
  private isStale(enrichedAt?: string): boolean {
    if (!enrichedAt) return true

    const enrichedDate = new Date(enrichedAt)
    const staleDays = DEFAULT_STALE_DAYS
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)

    return enrichedDate < staleDate
  }

  // Get usage statistics
  async getUsageStats(period: 'day' | 'month' = 'month'): Promise<EnrichmentUsage[]> {
    try {
      const today = new Date()
      let startDate: Date

      if (period === 'day') {
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      }

      const { data, error } = await supabase
        .from('enrichment_usage')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .gte('period_start', startDate.toISOString().split('T')[0])
        .order('period_start', { ascending: false })

      if (error) throw error
      return (data || []) as EnrichmentUsage[]
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return []
    }
  }

  // Create bulk enrichment job
  async createBulkEnrichmentJob(
    type: 'company' | 'contact',
    entityIds: string[],
    provider?: EnrichmentProvider
  ): Promise<{ jobId: string } | { error: string }> {
    try {
      const settings = await this.getSettings()
      const defaultProvider = type === 'company'
        ? settings?.default_company_provider || 'clearbit'
        : settings?.default_contact_provider || 'clearbit'

      const { data, error } = await supabase
        .from('enrichment_jobs')
        .insert({
          tenant_id: this.tenantId,
          job_type: type === 'company' ? 'bulk_company' : 'bulk_contact',
          provider: provider || defaultProvider,
          trigger_type: 'bulk',
          entity_ids: entityIds,
          total_count: entityIds.length,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) throw error
      return { jobId: data.id }
    } catch (error) {
      console.error('Error creating bulk enrichment job:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Get enrichment job status
  async getJobStatus(jobId: string): Promise<EnrichmentJob | null> {
    try {
      const { data, error } = await supabase
        .from('enrichment_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('tenant_id', this.tenantId)
        .single()

      if (error) throw error
      return data as EnrichmentJob
    } catch {
      return null
    }
  }

  // Log activity for enrichment
  async logEnrichmentActivity(
    entityType: 'contact' | 'lead' | 'account',
    entityId: string,
    description: string
  ): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id

      await supabase.from('activities').insert({
        tenant_id: this.tenantId,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: 'enrichment',
        subject: 'Data Enriched',
        description,
      })
    } catch (error) {
      console.error('Error logging enrichment activity:', error)
    }
  }
}

// Factory function to create service instance
export function createEnrichmentService(tenantId: string): EnrichmentService {
  return new EnrichmentService(tenantId)
}
