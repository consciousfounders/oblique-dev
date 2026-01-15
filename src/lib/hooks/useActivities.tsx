import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Database } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

export type Activity = Database['public']['Tables']['activities']['Row'] & {
  users?: { full_name: string | null } | null
}

export type ActivityType = 'email' | 'meeting' | 'call' | 'note' | 'deal_update' | 'task'

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'note', label: 'Note' },
  { value: 'deal_update', label: 'Deal Update' },
  { value: 'task', label: 'Task' },
]

interface UseActivitiesOptions {
  entityType?: string
  entityId?: string
  activityTypes?: ActivityType[]
  pageSize?: number
}

interface UseActivitiesReturn {
  activities: Activity[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  addActivity: (activity: Omit<Database['public']['Tables']['activities']['Insert'], 'tenant_id' | 'user_id'>) => Promise<Activity | null>
  refresh: () => Promise<void>
}

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const { entityType, entityId, activityTypes, pageSize = 20 } = options
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchActivities = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      let query = supabase
        .from('activities')
        .select('*, users(full_name)')
        .eq('tenant_id', user.tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId)
      }

      if (activityTypes && activityTypes.length > 0) {
        query = query.in('activity_type', activityTypes)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const newActivities = data || []
      setHasMore(newActivities.length === pageSize)

      if (append) {
        setActivities(prev => [...prev, ...newActivities])
      } else {
        setActivities(newActivities)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch activities')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, entityType, entityId, activityTypes, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchActivities(activities.length, true)
  }, [activities.length, loadingMore, hasMore, fetchActivities])

  const addActivity = useCallback(async (
    activityData: Omit<Database['public']['Tables']['activities']['Insert'], 'tenant_id' | 'user_id'>
  ): Promise<Activity | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: insertError } = await supabase
        .from('activities')
        .insert({
          ...activityData,
          tenant_id: user.tenantId,
          user_id: user.id,
        })
        .select('*, users(full_name)')
        .single()

      if (insertError) throw insertError
      return data
    } catch (err) {
      console.error('Error adding activity:', err)
      setError(err instanceof Error ? err.message : 'Failed to add activity')
      return null
    }
  }, [user?.tenantId, user?.id])

  const refresh = useCallback(async () => {
    await fetchActivities(0, false)
  }, [fetchActivities])

  // Initial fetch
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Real-time subscription
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
      .channel(`activities-${entityType || 'all'}-${entityId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter,
        },
        async (payload) => {
          // Fetch the full activity with user info
          const { data } = await supabase
            .from('activities')
            .select('*, users(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            // Check if activity type matches filter
            if (activityTypes && activityTypes.length > 0 && !activityTypes.includes(data.activity_type as ActivityType)) {
              return
            }
            setActivities(prev => [data, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'activities',
          filter,
        },
        (payload) => {
          setActivities(prev => prev.filter(a => a.id !== payload.old.id))
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
  }, [user?.tenantId, entityType, entityId, activityTypes])

  return {
    activities,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addActivity,
    refresh,
  }
}
