import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type AuditLog, type AuditOperation, type AuditEntityType, type AuditSettings } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface UseAuditLogOptions {
  entityType?: AuditEntityType
  entityId?: string
  userId?: string
  operations?: AuditOperation[]
  startDate?: Date
  endDate?: Date
  pageSize?: number
}

interface UseAuditLogReturn {
  logs: AuditLog[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  totalCount: number
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

export function useAuditLog(options: UseAuditLogOptions = {}): UseAuditLogReturn {
  const {
    entityType,
    entityId,
    userId,
    operations,
    startDate,
    endDate,
    pageSize = 20
  } = options

  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchLogs = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      let query = supabase
        .from('audit_logs')
        .select('*, users(full_name)', { count: 'exact' })
        .eq('tenant_id', user.tenantId)
        .order('changed_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (entityType) {
        query = query.eq('entity_type', entityType)
      }

      if (entityId) {
        query = query.eq('entity_id', entityId)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (operations && operations.length > 0) {
        query = query.in('operation', operations)
      }

      if (startDate) {
        query = query.gte('changed_at', startDate.toISOString())
      }

      if (endDate) {
        query = query.lte('changed_at', endDate.toISOString())
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      const newLogs = (data || []) as AuditLog[]
      setHasMore(newLogs.length === pageSize)

      if (count !== null) {
        setTotalCount(count)
      }

      if (append) {
        setLogs(prev => [...prev, ...newLogs])
      } else {
        setLogs(newLogs)
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, entityType, entityId, userId, operations, startDate, endDate, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchLogs(logs.length, true)
  }, [logs.length, loadingMore, hasMore, fetchLogs])

  const refresh = useCallback(async () => {
    await fetchLogs(0, false)
  }, [fetchLogs])

  // Initial fetch
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Real-time subscription for new audit logs
  useEffect(() => {
    if (!user?.tenantId) return

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    // Build filter for the subscription
    let filter = `tenant_id=eq.${user.tenantId}`
    if (entityType && entityId) {
      filter += `,entity_type=eq.${entityType},entity_id=eq.${entityId}`
    }

    const channel = supabase
      .channel(`audit-logs-${entityType || 'all'}-${entityId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter,
        },
        async (payload) => {
          // Fetch the full log with user info
          const { data } = await supabase
            .from('audit_logs')
            .select('*, users(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            // Check if log matches filters
            if (operations && operations.length > 0 && !operations.includes(data.operation as AuditOperation)) {
              return
            }
            if (userId && data.user_id !== userId) {
              return
            }
            setLogs(prev => [data as AuditLog, ...prev])
            setTotalCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [user?.tenantId, entityType, entityId, operations, userId])

  return {
    logs,
    loading,
    loadingMore,
    hasMore,
    error,
    totalCount,
    loadMore,
    refresh,
  }
}

// Hook for audit settings management
interface UseAuditSettingsReturn {
  settings: AuditSettings | null
  loading: boolean
  error: string | null
  updateSettings: (updates: Partial<AuditSettings>) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useAuditSettings(): UseAuditSettingsReturn {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AuditSettings | null>(null)
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
        .from('audit_settings')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No settings found, create default settings
          const { data: newSettings, error: insertError } = await supabase
            .from('audit_settings')
            .insert({ tenant_id: user.tenantId })
            .select()
            .single()

          if (insertError) throw insertError
          setSettings(newSettings)
        } else {
          throw fetchError
        }
      } else {
        setSettings(data)
      }
    } catch (err) {
      console.error('Error fetching audit settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch audit settings')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  const updateSettings = useCallback(async (updates: Partial<AuditSettings>): Promise<boolean> => {
    if (!user?.tenantId || !settings) return false

    try {
      const { data, error: updateError } = await supabase
        .from('audit_settings')
        .update(updates)
        .eq('tenant_id', user.tenantId)
        .select()
        .single()

      if (updateError) throw updateError
      setSettings(data)
      return true
    } catch (err) {
      console.error('Error updating audit settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to update audit settings')
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
    refresh,
  }
}

// Hook to export audit data for GDPR compliance
interface UseAuditExportReturn {
  exportUserData: (userId: string) => Promise<Record<string, unknown> | null>
  exportEntityHistory: (entityType: AuditEntityType, entityId: string) => Promise<AuditLog[]>
  exporting: boolean
  error: string | null
}

export function useAuditExport(): UseAuditExportReturn {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportUserData = useCallback(async (userId: string): Promise<Record<string, unknown> | null> => {
    if (!user?.tenantId) return null

    try {
      setExporting(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('export_user_audit_data', {
        p_user_id: userId,
        p_tenant_id: user.tenantId,
      })

      if (rpcError) throw rpcError
      return data as Record<string, unknown>
    } catch (err) {
      console.error('Error exporting user audit data:', err)
      setError(err instanceof Error ? err.message : 'Failed to export user data')
      return null
    } finally {
      setExporting(false)
    }
  }, [user?.tenantId])

  const exportEntityHistory = useCallback(async (
    entityType: AuditEntityType,
    entityId: string
  ): Promise<AuditLog[]> => {
    if (!user?.tenantId) return []

    try {
      setExporting(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*, users(full_name)')
        .eq('tenant_id', user.tenantId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('changed_at', { ascending: false })

      if (fetchError) throw fetchError
      return (data || []) as AuditLog[]
    } catch (err) {
      console.error('Error exporting entity history:', err)
      setError(err instanceof Error ? err.message : 'Failed to export entity history')
      return []
    } finally {
      setExporting(false)
    }
  }, [user?.tenantId])

  return {
    exportUserData,
    exportEntityHistory,
    exporting,
    error,
  }
}
