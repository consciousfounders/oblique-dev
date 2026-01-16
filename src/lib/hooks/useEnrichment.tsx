import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  createEnrichmentService,
  type CompanyEnrichmentData,
  type ContactEnrichmentData,
  type EnrichmentSettings,
  type EnrichmentUsage,
  type EnrichmentProvider,
  type EnrichCompanyRequest,
  type EnrichContactRequest,
} from '@/lib/services/enrichment'

// Hook for company enrichment
interface UseCompanyEnrichmentOptions {
  accountId: string
}

interface UseCompanyEnrichmentReturn {
  enrichment: CompanyEnrichmentData | null
  loading: boolean
  enriching: boolean
  error: string | null
  enrich: (options?: { provider?: EnrichmentProvider; forceRefresh?: boolean }) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useCompanyEnrichment(options: UseCompanyEnrichmentOptions): UseCompanyEnrichmentReturn {
  const { accountId } = options
  const { user } = useAuth()
  const [enrichment, setEnrichment] = useState<CompanyEnrichmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEnrichment = useCallback(async () => {
    if (!user?.tenantId || !accountId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const service = createEnrichmentService(user.tenantId)
      const data = await service.getCompanyEnrichment(accountId)
      setEnrichment(data)
    } catch (err) {
      console.error('Error fetching company enrichment:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch enrichment')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, accountId])

  const enrich = useCallback(async (enrichOptions?: {
    provider?: EnrichmentProvider
    forceRefresh?: boolean
  }): Promise<boolean> => {
    if (!user?.tenantId || !accountId) return false

    try {
      setEnriching(true)
      setError(null)

      // Get account domain for enrichment
      const { data: account } = await supabase
        .from('accounts')
        .select('domain, name, website')
        .eq('id', accountId)
        .single()

      if (!account) {
        setError('Account not found')
        return false
      }

      // Extract domain from website if not set
      let domain = account.domain
      if (!domain && account.website) {
        try {
          const url = new URL(account.website.startsWith('http') ? account.website : `https://${account.website}`)
          domain = url.hostname.replace('www.', '')
        } catch {
          // Ignore URL parse errors
        }
      }

      const service = createEnrichmentService(user.tenantId)
      const request: EnrichCompanyRequest = {
        account_id: accountId,
        domain,
        name: account.name,
        provider: enrichOptions?.provider,
        force_refresh: enrichOptions?.forceRefresh,
      }

      const result = await service.enrichCompany(request)

      if (result.success && result.data) {
        setEnrichment(result.data)

        // Log activity
        await service.logEnrichmentActivity(
          'account',
          accountId,
          `Company data enriched using ${result.data.provider}`
        )

        return true
      } else {
        setError(result.error || 'Enrichment failed')
        return false
      }
    } catch (err) {
      console.error('Error enriching company:', err)
      setError(err instanceof Error ? err.message : 'Failed to enrich company')
      return false
    } finally {
      setEnriching(false)
    }
  }, [user?.tenantId, accountId])

  useEffect(() => {
    fetchEnrichment()
  }, [fetchEnrichment])

  return {
    enrichment,
    loading,
    enriching,
    error,
    enrich,
    refresh: fetchEnrichment,
  }
}

// Hook for contact enrichment
interface UseContactEnrichmentOptions {
  entityType: 'contact' | 'lead'
  entityId: string
}

interface UseContactEnrichmentReturn {
  enrichment: ContactEnrichmentData | null
  loading: boolean
  enriching: boolean
  error: string | null
  enrich: (options?: { provider?: EnrichmentProvider; forceRefresh?: boolean }) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useContactEnrichment(options: UseContactEnrichmentOptions): UseContactEnrichmentReturn {
  const { entityType, entityId } = options
  const { user } = useAuth()
  const [enrichment, setEnrichment] = useState<ContactEnrichmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEnrichment = useCallback(async () => {
    if (!user?.tenantId || !entityId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const service = createEnrichmentService(user.tenantId)
      const data = await service.getContactEnrichment(entityType, entityId)
      setEnrichment(data)
    } catch (err) {
      console.error('Error fetching contact enrichment:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch enrichment')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, entityType, entityId])

  const enrich = useCallback(async (enrichOptions?: {
    provider?: EnrichmentProvider
    forceRefresh?: boolean
  }): Promise<boolean> => {
    if (!user?.tenantId || !entityId) return false

    try {
      setEnriching(true)
      setError(null)

      // Get entity data for enrichment
      const table = entityType === 'contact' ? 'contacts' : 'leads'
      const { data: entity } = await supabase
        .from(table)
        .select('first_name, last_name, email, company, title')
        .eq('id', entityId)
        .single()

      if (!entity) {
        setError(`${entityType} not found`)
        return false
      }

      const service = createEnrichmentService(user.tenantId)
      const request: EnrichContactRequest = {
        contact_id: entityType === 'contact' ? entityId : undefined,
        lead_id: entityType === 'lead' ? entityId : undefined,
        email: entity.email || undefined,
        first_name: entity.first_name,
        last_name: entity.last_name || undefined,
        company: entity.company || undefined,
        provider: enrichOptions?.provider,
        force_refresh: enrichOptions?.forceRefresh,
      }

      const result = await service.enrichContact(request)

      if (result.success && result.data) {
        setEnrichment(result.data)

        // Log activity
        await service.logEnrichmentActivity(
          entityType,
          entityId,
          `Contact data enriched using ${result.data.provider}`
        )

        return true
      } else {
        setError(result.error || 'Enrichment failed')
        return false
      }
    } catch (err) {
      console.error('Error enriching contact:', err)
      setError(err instanceof Error ? err.message : 'Failed to enrich contact')
      return false
    } finally {
      setEnriching(false)
    }
  }, [user?.tenantId, entityType, entityId])

  useEffect(() => {
    fetchEnrichment()
  }, [fetchEnrichment])

  return {
    enrichment,
    loading,
    enriching,
    error,
    enrich,
    refresh: fetchEnrichment,
  }
}

// Hook for enrichment settings
interface UseEnrichmentSettingsReturn {
  settings: EnrichmentSettings | null
  loading: boolean
  saving: boolean
  error: string | null
  saveSettings: (updates: Partial<EnrichmentSettings>) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useEnrichmentSettings(): UseEnrichmentSettingsReturn {
  const { user } = useAuth()
  const [settings, setSettings] = useState<EnrichmentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const service = createEnrichmentService(user.tenantId)
      const data = await service.getSettings()
      setSettings(data)
    } catch (err) {
      console.error('Error fetching enrichment settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  const saveSettings = useCallback(async (updates: Partial<EnrichmentSettings>): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      setSaving(true)
      setError(null)

      const service = createEnrichmentService(user.tenantId)
      const result = await service.saveSettings(updates)

      if (result.success) {
        // Refresh settings
        await fetchSettings()
        return true
      } else {
        setError(result.error || 'Failed to save settings')
        return false
      }
    } catch (err) {
      console.error('Error saving enrichment settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      return false
    } finally {
      setSaving(false)
    }
  }, [user?.tenantId, fetchSettings])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    saving,
    error,
    saveSettings,
    refresh: fetchSettings,
  }
}

// Hook for enrichment usage statistics
interface UseEnrichmentUsageOptions {
  period?: 'day' | 'month'
}

interface UseEnrichmentUsageReturn {
  usage: EnrichmentUsage[]
  loading: boolean
  error: string | null
  totalCreditsUsed: number
  totalEnrichments: number
  successRate: number
  refresh: () => Promise<void>
}

export function useEnrichmentUsage(options: UseEnrichmentUsageOptions = {}): UseEnrichmentUsageReturn {
  const { period = 'month' } = options
  const { user } = useAuth()
  const [usage, setUsage] = useState<EnrichmentUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const service = createEnrichmentService(user.tenantId)
      const data = await service.getUsageStats(period)
      setUsage(data)
    } catch (err) {
      console.error('Error fetching enrichment usage:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch usage')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, period])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  // Calculate totals
  const totalCreditsUsed = usage.reduce((sum, u) => sum + (u.credits_used || 0), 0)
  const totalEnrichments = usage.reduce((sum, u) => sum + (u.total_enrichments || 0), 0)
  const successfulEnrichments = usage.reduce((sum, u) => sum + (u.successful_enrichments || 0), 0)
  const successRate = totalEnrichments > 0 ? (successfulEnrichments / totalEnrichments) * 100 : 0

  return {
    usage,
    loading,
    error,
    totalCreditsUsed,
    totalEnrichments,
    successRate,
    refresh: fetchUsage,
  }
}

// Hook for checking if enrichment can be performed
interface UseCanEnrichReturn {
  canEnrich: boolean
  reason: string | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useCanEnrich(): UseCanEnrichReturn {
  const { user } = useAuth()
  const [canEnrich, setCanEnrich] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const checkCanEnrich = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      setCanEnrich(false)
      setReason('Not authenticated')
      return
    }

    try {
      setLoading(true)

      const service = createEnrichmentService(user.tenantId)
      const result = await service.canEnrich()

      setCanEnrich(result.allowed)
      setReason(result.reason || null)
    } catch (err) {
      console.error('Error checking enrichment status:', err)
      setCanEnrich(false)
      setReason('Error checking enrichment status')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  useEffect(() => {
    checkCanEnrich()
  }, [checkCanEnrich])

  return {
    canEnrich,
    reason,
    loading,
    refresh: checkCanEnrich,
  }
}
