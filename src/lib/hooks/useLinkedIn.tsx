import { useState, useEffect, useCallback } from 'react'
import {
  supabase,
  type LinkedInProfile,
  type LinkedInActivity,
  type LinkedInInMailTemplate,
  type LinkedInSavedLead,
  type LinkedInIntegrationSettings,
  type LinkedInActivityType,
  type EntityType,
} from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { linkedinService, type ProfileSearchParams, type ProfileLookupResult } from '@/lib/services/linkedinService'

// Hook for managing LinkedIn profile for a contact/lead
interface UseLinkedInProfileOptions {
  entityType: EntityType
  entityId: string
}

interface UseLinkedInProfileReturn {
  profile: LinkedInProfile | null
  loading: boolean
  error: string | null
  lookupProfile: (params: ProfileSearchParams) => Promise<ProfileLookupResult | null>
  saveProfile: (profileData: ProfileLookupResult) => Promise<boolean>
  updateProfile: (updates: Partial<LinkedInProfile>) => Promise<boolean>
  unlinkProfile: () => Promise<boolean>
  refresh: () => Promise<void>
}

export function useLinkedInProfile(options: UseLinkedInProfileOptions): UseLinkedInProfileReturn {
  const { entityType, entityId } = options
  const { user } = useAuth()
  const [profile, setProfile] = useState<LinkedInProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!user?.tenantId || !entityId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const column = entityType === 'contact' ? 'contact_id' : 'lead_id'
      const { data, error: fetchError } = await supabase
        .from('linkedin_profiles')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq(column, entityId)
        .maybeSingle()

      if (fetchError) throw fetchError
      setProfile(data)
    } catch (err) {
      console.error('Error fetching LinkedIn profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, entityType, entityId])

  const lookupProfile = useCallback(async (params: ProfileSearchParams): Promise<ProfileLookupResult | null> => {
    if (!user?.tenantId) return null

    try {
      // Get integration settings for API key
      const { data: settings } = await supabase
        .from('linkedin_integration_settings')
        .select('rocketreach_api_key_encrypted')
        .eq('tenant_id', user.tenantId)
        .maybeSingle()

      const result = await linkedinService.lookupProfile(
        params,
        settings?.rocketreach_api_key_encrypted || undefined
      )

      return result
    } catch (err) {
      console.error('Error looking up profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to lookup profile')
      return null
    }
  }, [user?.tenantId])

  const saveProfile = useCallback(async (profileData: ProfileLookupResult): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const result = await linkedinService.saveProfile(
        user.tenantId,
        entityType === 'contact' || entityType === 'lead' ? entityType : 'contact',
        entityId,
        profileData
      )

      if (result) {
        await fetchProfile()
        return true
      }
      return false
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      return false
    }
  }, [user?.tenantId, entityType, entityId, fetchProfile])

  const updateProfile = useCallback(async (updates: Partial<LinkedInProfile>): Promise<boolean> => {
    if (!user?.tenantId || !profile) return false

    try {
      const { error: updateError } = await supabase
        .from('linkedin_profiles')
        .update(updates)
        .eq('id', profile.id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, ...updates } : null)
      return true
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      return false
    }
  }, [user?.tenantId, profile])

  const unlinkProfile = useCallback(async (): Promise<boolean> => {
    if (!user?.tenantId || !profile) return false

    try {
      const { error: deleteError } = await supabase
        .from('linkedin_profiles')
        .delete()
        .eq('id', profile.id)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setProfile(null)
      return true
    } catch (err) {
      console.error('Error unlinking profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to unlink profile')
      return false
    }
  }, [user?.tenantId, profile])

  const refresh = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    loading,
    error,
    lookupProfile,
    saveProfile,
    updateProfile,
    unlinkProfile,
    refresh,
  }
}

// Hook for LinkedIn activities
interface UseLinkedInActivitiesOptions {
  linkedinProfileId?: string
  pageSize?: number
}

interface UseLinkedInActivitiesReturn {
  activities: LinkedInActivity[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  logActivity: (activityType: LinkedInActivityType, data?: {
    subject?: string
    description?: string
    inmailSubject?: string
    inmailBody?: string
  }) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useLinkedInActivities(options: UseLinkedInActivitiesOptions = {}): UseLinkedInActivitiesReturn {
  const { linkedinProfileId, pageSize = 20 } = options
  const { user } = useAuth()
  const [activities, setActivities] = useState<LinkedInActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId || !linkedinProfileId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('linkedin_activities')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('linkedin_profile_id', linkedinProfileId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (fetchError) throw fetchError

      const newActivities = data || []
      setHasMore(newActivities.length === pageSize)

      if (append) {
        setActivities(prev => [...prev, ...newActivities])
      } else {
        setActivities(newActivities)
      }
    } catch (err) {
      console.error('Error fetching LinkedIn activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch activities')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, linkedinProfileId, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchActivities(activities.length, true)
  }, [activities.length, loadingMore, hasMore, fetchActivities])

  const logActivity = useCallback(async (
    activityType: LinkedInActivityType,
    data?: {
      subject?: string
      description?: string
      inmailSubject?: string
      inmailBody?: string
    }
  ): Promise<boolean> => {
    if (!user?.tenantId || !linkedinProfileId) return false

    try {
      const result = await linkedinService.logActivity(user.tenantId, user.id, linkedinProfileId, {
        activity_type: activityType,
        subject: data?.subject,
        description: data?.description,
        inmail_subject: data?.inmailSubject,
        inmail_body: data?.inmailBody,
      })

      if (result) {
        await fetchActivities()
        return true
      }
      return false
    } catch (err) {
      console.error('Error logging activity:', err)
      setError(err instanceof Error ? err.message : 'Failed to log activity')
      return false
    }
  }, [user?.tenantId, user?.id, linkedinProfileId, fetchActivities])

  const refresh = useCallback(async () => {
    await fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    if (linkedinProfileId) {
      fetchActivities()
    } else {
      setLoading(false)
      setActivities([])
    }
  }, [linkedinProfileId, fetchActivities])

  return {
    activities,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    logActivity,
    refresh,
  }
}

// Hook for InMail templates
interface UseInMailTemplatesReturn {
  templates: LinkedInInMailTemplate[]
  loading: boolean
  error: string | null
  addTemplate: (template: { name: string; subject: string; body: string }) => Promise<LinkedInInMailTemplate | null>
  updateTemplate: (id: string, updates: Partial<LinkedInInMailTemplate>) => Promise<boolean>
  deleteTemplate: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useInMailTemplates(): UseInMailTemplatesReturn {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<LinkedInInMailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('linkedin_inmail_templates')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('user_id', user.id)
        .order('use_count', { ascending: false })

      if (fetchError) throw fetchError
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching InMail templates:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, user?.id])

  const addTemplate = useCallback(async (
    template: { name: string; subject: string; body: string }
  ): Promise<LinkedInInMailTemplate | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: insertError } = await supabase
        .from('linkedin_inmail_templates')
        .insert({
          tenant_id: user.tenantId,
          user_id: user.id,
          name: template.name,
          subject: template.subject,
          body: template.body,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setTemplates(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error adding template:', err)
      setError(err instanceof Error ? err.message : 'Failed to add template')
      return null
    }
  }, [user?.tenantId, user?.id])

  const updateTemplate = useCallback(async (id: string, updates: Partial<LinkedInInMailTemplate>): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: updateError } = await supabase
        .from('linkedin_inmail_templates')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
      return true
    } catch (err) {
      console.error('Error updating template:', err)
      setError(err instanceof Error ? err.message : 'Failed to update template')
      return false
    }
  }, [user?.tenantId])

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('linkedin_inmail_templates')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setTemplates(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting template:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete template')
      return false
    }
  }, [user?.tenantId])

  const refresh = useCallback(async () => {
    await fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    refresh,
  }
}

// Hook for LinkedIn saved leads (recommendations)
interface UseSavedLeadsOptions {
  pageSize?: number
  showImported?: boolean
}

interface UseSavedLeadsReturn {
  savedLeads: LinkedInSavedLead[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  addSavedLead: (lead: Omit<LinkedInSavedLead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<LinkedInSavedLead | null>
  importToCRM: (savedLeadId: string) => Promise<{ leadId: string } | null>
  deleteSavedLead: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useSavedLeads(options: UseSavedLeadsOptions = {}): UseSavedLeadsReturn {
  const { pageSize = 20, showImported = false } = options
  const { user } = useAuth()
  const [savedLeads, setSavedLeads] = useState<LinkedInSavedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSavedLeads = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      let query = supabase
        .from('linkedin_saved_leads')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (!showImported) {
        query = query.is('imported_at', null)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const newLeads = data || []
      setHasMore(newLeads.length === pageSize)

      if (append) {
        setSavedLeads(prev => [...prev, ...newLeads])
      } else {
        setSavedLeads(newLeads)
      }
    } catch (err) {
      console.error('Error fetching saved leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch saved leads')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, pageSize, showImported])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchSavedLeads(savedLeads.length, true)
  }, [savedLeads.length, loadingMore, hasMore, fetchSavedLeads])

  const addSavedLead = useCallback(async (
    lead: Omit<LinkedInSavedLead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ): Promise<LinkedInSavedLead | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: insertError } = await supabase
        .from('linkedin_saved_leads')
        .insert({
          ...lead,
          tenant_id: user.tenantId,
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setSavedLeads(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error adding saved lead:', err)
      setError(err instanceof Error ? err.message : 'Failed to add saved lead')
      return null
    }
  }, [user?.tenantId, user?.id])

  const importToCRM = useCallback(async (savedLeadId: string): Promise<{ leadId: string } | null> => {
    if (!user?.tenantId) return null

    try {
      const result = await linkedinService.importSavedLeadToCRM(
        user.tenantId,
        user.id,
        savedLeadId
      )

      if (result) {
        // Update local state to mark as imported
        setSavedLeads(prev =>
          prev.map(lead =>
            lead.id === savedLeadId
              ? { ...lead, imported_to_lead_id: result.leadId, imported_at: new Date().toISOString() }
              : lead
          )
        )
      }

      return result
    } catch (err) {
      console.error('Error importing saved lead:', err)
      setError(err instanceof Error ? err.message : 'Failed to import saved lead')
      return null
    }
  }, [user?.tenantId, user?.id])

  const deleteSavedLead = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('linkedin_saved_leads')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setSavedLeads(prev => prev.filter(l => l.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting saved lead:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete saved lead')
      return false
    }
  }, [user?.tenantId])

  const refresh = useCallback(async () => {
    await fetchSavedLeads()
  }, [fetchSavedLeads])

  useEffect(() => {
    fetchSavedLeads()
  }, [fetchSavedLeads])

  return {
    savedLeads,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addSavedLead,
    importToCRM,
    deleteSavedLead,
    refresh,
  }
}

// Hook for LinkedIn integration settings
interface UseLinkedInSettingsReturn {
  settings: LinkedInIntegrationSettings | null
  loading: boolean
  error: string | null
  updateSettings: (updates: Partial<LinkedInIntegrationSettings>) => Promise<boolean>
  initializeSettings: () => Promise<boolean>
  refresh: () => Promise<void>
}

export function useLinkedInSettings(): UseLinkedInSettingsReturn {
  const { user } = useAuth()
  const [settings, setSettings] = useState<LinkedInIntegrationSettings | null>(null)
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

      const { data, error: fetchError } = await supabase
        .from('linkedin_integration_settings')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .maybeSingle()

      if (fetchError) throw fetchError
      setSettings(data)
    } catch (err) {
      console.error('Error fetching LinkedIn settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  const initializeSettings = useCallback(async (): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { data, error: insertError } = await supabase
        .from('linkedin_integration_settings')
        .insert({
          tenant_id: user.tenantId,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setSettings(data)
      return true
    } catch (err) {
      console.error('Error initializing settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize settings')
      return false
    }
  }, [user?.tenantId])

  const updateSettings = useCallback(async (updates: Partial<LinkedInIntegrationSettings>): Promise<boolean> => {
    if (!user?.tenantId || !settings) return false

    try {
      const { error: updateError } = await supabase
        .from('linkedin_integration_settings')
        .update(updates)
        .eq('id', settings.id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      setSettings(prev => prev ? { ...prev, ...updates } : null)
      return true
    } catch (err) {
      console.error('Error updating settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      return false
    }
  }, [user?.tenantId, settings])

  const refresh = useCallback(async () => {
    await fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    updateSettings,
    initializeSettings,
    refresh,
  }
}
