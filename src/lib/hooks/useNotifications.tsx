import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Database, type Notification, type NotificationCategory, type NotificationType } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface UseNotificationsOptions {
  pageSize?: number
  unreadOnly?: boolean
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  refresh: () => Promise<void>
}

export const NOTIFICATION_CATEGORIES: { value: NotificationCategory; label: string; description: string }[] = [
  { value: 'task_due', label: 'Task Due', description: 'When a task is approaching its due date' },
  { value: 'task_overdue', label: 'Task Overdue', description: 'When a task is past its due date' },
  { value: 'deal_stage_change', label: 'Deal Stage Changes', description: 'When a deal moves to a new stage' },
  { value: 'lead_assigned', label: 'Lead Assignments', description: 'When a new lead is assigned to you' },
  { value: 'mention_in_note', label: 'Mentions', description: 'When someone mentions you in a note' },
  { value: 'email_reply', label: 'Email Replies', description: 'When you receive an email reply' },
  { value: 'meeting_reminder', label: 'Meeting Reminders', description: 'Reminders for upcoming meetings' },
  { value: 'quota_alert', label: 'Quota Alerts', description: 'Alerts about sales quota progress' },
  { value: 'system', label: 'System Notifications', description: 'Important system updates and announcements' },
]

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { pageSize = 20, unreadOnly = false } = options
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.tenantId || !user?.id) return

    try {
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId)
        .eq('user_id', user.id)
        .is('read_at', null)

      if (countError) throw countError
      setUnreadCount(count || 0)
    } catch (err) {
      console.error('Error fetching unread count:', err)
    }
  }, [user?.tenantId, user?.id])

  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId || !user?.id) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (unreadOnly) {
        query = query.is('read_at', null)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const newNotifications = data || []
      setHasMore(newNotifications.length === pageSize)

      if (append) {
        setNotifications(prev => [...prev, ...newNotifications])
      } else {
        setNotifications(newNotifications)
      }

      // Also fetch unread count
      await fetchUnreadCount()
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, user?.id, pageSize, unreadOnly, fetchUnreadCount])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchNotifications(notifications.length, true)
  }, [notifications.length, loadingMore, hasMore, fetchNotifications])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.tenantId) return

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
    }
  }, [user?.tenantId])

  const markAllAsRead = useCallback(async () => {
    if (!user?.tenantId || !user?.id) return

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('tenant_id', user.tenantId)
        .eq('user_id', user.id)
        .is('read_at', null)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
    }
  }, [user?.tenantId, user?.id])

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.tenantId) return

    try {
      const notification = notifications.find(n => n.id === notificationId)

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error deleting notification:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }, [user?.tenantId, notifications])

  const refresh = useCallback(async () => {
    await fetchNotifications(0, false)
  }, [fetchNotifications])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time subscription
  useEffect(() => {
    if (!user?.tenantId || !user?.id) return

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const filter = `tenant_id=eq.${user.tenantId},user_id=eq.${user.id}`

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter,
        },
        async (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          if (!newNotification.read_at) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter,
        },
        async (payload) => {
          const updatedNotification = payload.new as Notification
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          )
          // Refresh unread count on update
          await fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setNotifications(prev => prev.filter(n => n.id !== deletedId))
          // Refresh unread count on delete
          fetchUnreadCount()
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
  }, [user?.tenantId, user?.id, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  }
}

// Hook for notification preferences
interface UseNotificationPreferencesReturn {
  preferences: Database['public']['Tables']['notification_preferences']['Row'] | null
  loading: boolean
  error: string | null
  updatePreferences: (updates: Database['public']['Tables']['notification_preferences']['Update']) => Promise<void>
  refresh: () => Promise<void>
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<Database['public']['Tables']['notification_preferences']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    if (!user?.tenantId || !user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('user_id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences if they don't exist
        const defaultPreferences = {
          tenant_id: user.tenantId,
          user_id: user.id,
          email_enabled: true,
          in_app_enabled: true,
          browser_push_enabled: false,
          quiet_hours_enabled: false,
          quiet_hours_start: null,
          quiet_hours_end: null,
          digest_mode: 'immediate' as const,
          category_preferences: NOTIFICATION_CATEGORIES.reduce((acc, cat) => {
            acc[cat.value] = true
            return acc
          }, {} as Record<string, boolean>),
        }

        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert(defaultPreferences)
          .select()
          .single()

        if (insertError) throw insertError
        setPreferences(newPrefs)
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notification preferences')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, user?.id])

  const updatePreferences = useCallback(async (updates: Database['public']['Tables']['notification_preferences']['Update']) => {
    if (!user?.tenantId || !user?.id || !preferences) return

    try {
      setError(null)

      const { data, error: updateError } = await supabase
        .from('notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', preferences.id)
        .eq('tenant_id', user.tenantId)
        .select()
        .single()

      if (updateError) throw updateError
      setPreferences(data)
    } catch (err) {
      console.error('Error updating notification preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to update notification preferences')
      throw err
    }
  }, [user?.tenantId, user?.id, preferences])

  const refresh = useCallback(async () => {
    await fetchPreferences()
  }, [fetchPreferences])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refresh,
  }
}

// Service for creating notifications
export const notificationService = {
  async createNotification(
    tenantId: string,
    userId: string,
    data: {
      title: string
      message: string
      notification_type: NotificationType
      category: NotificationCategory
      entity_type?: string
      entity_id?: string
      action_url?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<Notification | null> {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          ...data,
        })
        .select()
        .single()

      if (error) throw error
      return notification
    } catch (err) {
      console.error('Error creating notification:', err)
      return null
    }
  },

  async createNotificationForMention(
    tenantId: string,
    mentionedUserId: string,
    mentionerName: string,
    entityType: string,
    entityId: string,
    entityName: string
  ): Promise<Notification | null> {
    return this.createNotification(tenantId, mentionedUserId, {
      title: 'You were mentioned',
      message: `${mentionerName} mentioned you in a note on ${entityType} "${entityName}"`,
      notification_type: 'mention',
      category: 'mention_in_note',
      entity_type: entityType,
      entity_id: entityId,
      action_url: `/${entityType}s/${entityId}`,
    })
  },

  async createNotificationForDealStageChange(
    tenantId: string,
    userId: string,
    dealName: string,
    dealId: string,
    oldStage: string,
    newStage: string
  ): Promise<Notification | null> {
    return this.createNotification(tenantId, userId, {
      title: 'Deal stage changed',
      message: `"${dealName}" moved from ${oldStage} to ${newStage}`,
      notification_type: 'activity',
      category: 'deal_stage_change',
      entity_type: 'deal',
      entity_id: dealId,
      action_url: `/deals/${dealId}`,
      metadata: { old_stage: oldStage, new_stage: newStage },
    })
  },

  async createNotificationForLeadAssignment(
    tenantId: string,
    userId: string,
    leadName: string,
    leadId: string,
    assignerName: string
  ): Promise<Notification | null> {
    return this.createNotification(tenantId, userId, {
      title: 'New lead assigned',
      message: `${assignerName} assigned you the lead "${leadName}"`,
      notification_type: 'activity',
      category: 'lead_assigned',
      entity_type: 'lead',
      entity_id: leadId,
      action_url: `/leads/${leadId}`,
    })
  },

  async createNotificationForMeetingReminder(
    tenantId: string,
    userId: string,
    meetingTitle: string,
    meetingId: string,
    startTime: string
  ): Promise<Notification | null> {
    const formattedTime = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return this.createNotification(tenantId, userId, {
      title: 'Meeting reminder',
      message: `"${meetingTitle}" starts at ${formattedTime}`,
      notification_type: 'reminder',
      category: 'meeting_reminder',
      entity_type: 'booking',
      entity_id: meetingId,
      action_url: `/calendar`,
    })
  },
}
