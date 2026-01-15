import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Note, type NoteInsert, type NoteUpdate, type EntityType } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface UseNotesOptions {
  entityType: EntityType
  entityId: string
  pageSize?: number
}

interface UseNotesReturn {
  notes: Note[]
  pinnedNotes: Note[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  addNote: (content: string, contentPlain?: string) => Promise<Note | null>
  updateNote: (noteId: string, updates: NoteUpdate) => Promise<Note | null>
  deleteNote: (noteId: string) => Promise<boolean>
  togglePin: (noteId: string, isPinned: boolean) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useNotes(options: UseNotesOptions): UseNotesReturn {
  const { entityType, entityId, pageSize = 20 } = options
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchNotes = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId || !entityId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*, users(full_name)')
        .eq('tenant_id', user.tenantId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (fetchError) throw fetchError

      const newNotes = data || []
      setHasMore(newNotes.length === pageSize)

      if (append) {
        setNotes(prev => [...prev, ...newNotes])
      } else {
        setNotes(newNotes)
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, entityType, entityId, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchNotes(notes.length, true)
  }, [notes.length, loadingMore, hasMore, fetchNotes])

  const addNote = useCallback(async (content: string, contentPlain?: string): Promise<Note | null> => {
    if (!user?.tenantId) return null

    try {
      const noteData: NoteInsert = {
        tenant_id: user.tenantId,
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        content,
        content_plain: contentPlain || stripHtml(content),
      }

      const { data, error: insertError } = await supabase
        .from('notes')
        .insert(noteData)
        .select('*, users(full_name)')
        .single()

      if (insertError) throw insertError
      return data
    } catch (err) {
      console.error('Error adding note:', err)
      setError(err instanceof Error ? err.message : 'Failed to add note')
      return null
    }
  }, [user?.tenantId, user?.id, entityType, entityId])

  const updateNote = useCallback(async (noteId: string, updates: NoteUpdate): Promise<Note | null> => {
    if (!user?.tenantId) return null

    try {
      // If content is being updated, also update content_plain
      if (updates.content && !updates.content_plain) {
        updates.content_plain = stripHtml(updates.content)
      }

      const { data, error: updateError } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .eq('tenant_id', user.tenantId)
        .select('*, users(full_name)')
        .single()

      if (updateError) throw updateError

      setNotes(prev => prev.map(n => n.id === noteId ? data : n))
      return data
    } catch (err) {
      console.error('Error updating note:', err)
      setError(err instanceof Error ? err.message : 'Failed to update note')
      return null
    }
  }, [user?.tenantId])

  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setNotes(prev => prev.filter(n => n.id !== noteId))
      return true
    } catch (err) {
      console.error('Error deleting note:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete note')
      return false
    }
  }, [user?.tenantId])

  const togglePin = useCallback(async (noteId: string, isPinned: boolean): Promise<boolean> => {
    const result = await updateNote(noteId, { is_pinned: isPinned })
    if (result) {
      // Re-sort notes to reflect pin change
      setNotes(prev => [...prev].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }))
    }
    return result !== null
  }, [updateNote])

  const refresh = useCallback(async () => {
    await fetchNotes(0, false)
  }, [fetchNotes])

  // Derived state: pinned notes
  const pinnedNotes = notes.filter(n => n.is_pinned)

  // Initial fetch
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Real-time subscription
  useEffect(() => {
    if (!user?.tenantId || !entityId) return

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const filter = `tenant_id=eq.${user.tenantId},entity_type=eq.${entityType},entity_id=eq.${entityId}`

    const channel = supabase
      .channel(`notes-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes',
          filter,
        },
        async (payload) => {
          // Fetch the full note with user info
          const { data } = await supabase
            .from('notes')
            .select('*, users(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setNotes(prev => {
              // Add note and re-sort
              const newNotes = [data, ...prev.filter(n => n.id !== data.id)]
              return newNotes.sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter,
        },
        async (payload) => {
          const { data } = await supabase
            .from('notes')
            .select('*, users(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setNotes(prev => {
              const newNotes = prev.map(n => n.id === data.id ? data : n)
              return newNotes.sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notes',
          filter,
        },
        (payload) => {
          setNotes(prev => prev.filter(n => n.id !== payload.old.id))
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
  }, [user?.tenantId, entityType, entityId])

  return {
    notes,
    pinnedNotes,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    refresh,
  }
}

// Search notes across all entities
interface UseNoteSearchOptions {
  query: string
  entityType?: EntityType
  limit?: number
}

interface NoteSearchResult extends Note {
  entity_name?: string
}

export function useNoteSearch(options: UseNoteSearchOptions) {
  const { query, entityType, limit = 20 } = options
  const { user } = useAuth()
  const [results, setResults] = useState<NoteSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.tenantId || !query || query.length < 2) {
      setResults([])
      return
    }

    const searchNotes = async () => {
      setLoading(true)
      setError(null)

      try {
        let queryBuilder = supabase
          .from('notes')
          .select('*, users(full_name)')
          .eq('tenant_id', user.tenantId)
          .textSearch('content_plain', query, { type: 'websearch' })
          .order('created_at', { ascending: false })
          .limit(limit)

        if (entityType) {
          queryBuilder = queryBuilder.eq('entity_type', entityType)
        }

        const { data, error: searchError } = await queryBuilder

        if (searchError) throw searchError
        setResults(data || [])
      } catch (err) {
        console.error('Error searching notes:', err)
        setError(err instanceof Error ? err.message : 'Failed to search notes')
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(searchNotes, 300)
    return () => clearTimeout(timeoutId)
  }, [user?.tenantId, query, entityType, limit])

  return { results, loading, error }
}

// Helper to strip HTML tags for plain text indexing
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
