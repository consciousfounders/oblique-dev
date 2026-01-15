import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Database } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

export type Booking = Database['public']['Tables']['bookings']['Row'] & {
  contacts?: { first_name: string; last_name: string | null } | null
  leads?: { first_name: string; last_name: string | null } | null
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'

export type AvailabilityRule = Database['public']['Tables']['availability_rules']['Row']

export type BookingLink = Database['public']['Tables']['booking_links']['Row']

interface UseBookingsOptions {
  status?: BookingStatus[]
  upcoming?: boolean
  pageSize?: number
}

interface UseBookingsReturn {
  bookings: Booking[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  cancelBooking: (id: string, reason?: string) => Promise<boolean>
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useBookings(options: UseBookingsOptions = {}): UseBookingsReturn {
  const { status, upcoming = true, pageSize = 20 } = options
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchBookings = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      let query = supabase
        .from('bookings')
        .select('*, contacts(first_name, last_name), leads(first_name, last_name)')
        .eq('tenant_id', user.tenantId)
        .range(offset, offset + pageSize - 1)

      // Filter by status
      if (status && status.length > 0) {
        query = query.in('status', status)
      }

      // Filter upcoming bookings (start_time >= now)
      if (upcoming) {
        query = query.gte('start_time', new Date().toISOString())
        query = query.order('start_time', { ascending: true })
      } else {
        query = query.order('start_time', { ascending: false })
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const newBookings = data || []
      setHasMore(newBookings.length === pageSize)

      if (append) {
        setBookings(prev => [...prev, ...newBookings])
      } else {
        setBookings(newBookings)
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, status, upcoming, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchBookings(bookings.length, true)
  }, [bookings.length, loadingMore, hasMore, fetchBookings])

  const cancelBooking = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled' as const,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
        })
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      // Update local state
      setBookings(prev =>
        prev.map(b =>
          b.id === id
            ? { ...b, status: 'cancelled' as const, cancelled_at: new Date().toISOString(), cancellation_reason: reason || null }
            : b
        )
      )

      return true
    } catch (err) {
      console.error('Error cancelling booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel booking')
      return false
    }
  }, [user?.tenantId])

  const updateBookingStatus = useCallback(async (id: string, newStatus: BookingStatus): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      // Update local state
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, status: newStatus } : b))
      )

      return true
    } catch (err) {
      console.error('Error updating booking status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update booking status')
      return false
    }
  }, [user?.tenantId])

  const refresh = useCallback(async () => {
    await fetchBookings(0, false)
  }, [fetchBookings])

  // Initial fetch
  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Real-time subscription
  useEffect(() => {
    if (!user?.tenantId) return

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${user.tenantId}`,
        },
        () => {
          // Refresh the list on any change
          refresh()
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
  }, [user?.tenantId, refresh])

  return {
    bookings,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    cancelBooking,
    updateBookingStatus,
    refresh,
  }
}

// Hook for availability rules
interface UseAvailabilityReturn {
  rules: AvailabilityRule[]
  loading: boolean
  error: string | null
  addRule: (rule: Omit<Database['public']['Tables']['availability_rules']['Insert'], 'tenant_id' | 'user_id'>) => Promise<AvailabilityRule | null>
  updateRule: (id: string, updates: Partial<AvailabilityRule>) => Promise<boolean>
  deleteRule: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useAvailability(): UseAvailabilityReturn {
  const { user } = useAuth()
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true, nullsFirst: true })
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      setRules(data || [])
    } catch (err) {
      console.error('Error fetching availability rules:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch availability rules')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, user?.id])

  const addRule = useCallback(async (
    ruleData: Omit<Database['public']['Tables']['availability_rules']['Insert'], 'tenant_id' | 'user_id'>
  ): Promise<AvailabilityRule | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: insertError } = await supabase
        .from('availability_rules')
        .insert({
          ...ruleData,
          tenant_id: user.tenantId,
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setRules(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error adding availability rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to add availability rule')
      return null
    }
  }, [user?.tenantId, user?.id])

  const updateRule = useCallback(async (id: string, updates: Partial<AvailabilityRule>): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: updateError } = await supabase
        .from('availability_rules')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      setRules(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)))
      return true
    } catch (err) {
      console.error('Error updating availability rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to update availability rule')
      return false
    }
  }, [user?.tenantId])

  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setRules(prev => prev.filter(r => r.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting availability rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete availability rule')
      return false
    }
  }, [user?.tenantId])

  const refresh = useCallback(async () => {
    await fetchRules()
  }, [fetchRules])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  return {
    rules,
    loading,
    error,
    addRule,
    updateRule,
    deleteRule,
    refresh,
  }
}

// Hook for booking links
interface UseBookingLinksReturn {
  links: BookingLink[]
  loading: boolean
  error: string | null
  addLink: (link: Omit<Database['public']['Tables']['booking_links']['Insert'], 'tenant_id' | 'user_id'>) => Promise<BookingLink | null>
  updateLink: (id: string, updates: Partial<BookingLink>) => Promise<boolean>
  deleteLink: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useBookingLinks(): UseBookingLinksReturn {
  const { user } = useAuth()
  const [links, setLinks] = useState<BookingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('booking_links')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setLinks(data || [])
    } catch (err) {
      console.error('Error fetching booking links:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch booking links')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, user?.id])

  const addLink = useCallback(async (
    linkData: Omit<Database['public']['Tables']['booking_links']['Insert'], 'tenant_id' | 'user_id'>
  ): Promise<BookingLink | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: insertError } = await supabase
        .from('booking_links')
        .insert({
          ...linkData,
          tenant_id: user.tenantId,
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setLinks(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('Error adding booking link:', err)
      setError(err instanceof Error ? err.message : 'Failed to add booking link')
      return null
    }
  }, [user?.tenantId, user?.id])

  const updateLink = useCallback(async (id: string, updates: Partial<BookingLink>): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: updateError } = await supabase
        .from('booking_links')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      setLinks(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)))
      return true
    } catch (err) {
      console.error('Error updating booking link:', err)
      setError(err instanceof Error ? err.message : 'Failed to update booking link')
      return false
    }
  }, [user?.tenantId])

  const deleteLink = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('booking_links')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setLinks(prev => prev.filter(l => l.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting booking link:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete booking link')
      return false
    }
  }, [user?.tenantId])

  const refresh = useCallback(async () => {
    await fetchLinks()
  }, [fetchLinks])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  return {
    links,
    loading,
    error,
    addLink,
    updateLink,
    deleteLink,
    refresh,
  }
}
