import { useState, useEffect, useCallback, useRef } from 'react'
import {
  supabase,
  type Task,
  type TaskInsert,
  type TaskUpdate,
  type TaskType,
  type TaskStatus,
  type TaskPriority,
  type Database,
} from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface UseTasksOptions {
  entityType?: string
  entityId?: string
  taskTypes?: TaskType[]
  statuses?: TaskStatus[]
  priorities?: TaskPriority[]
  assignedTo?: string
  ownerId?: string
  dueDateFrom?: string
  dueDateTo?: string
  includeCompleted?: boolean
  pageSize?: number
  includeEntityNames?: boolean
}

interface UseTasksReturn {
  tasks: Task[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  addTask: (task: Omit<TaskInsert, 'tenant_id' | 'owner_id'>) => Promise<Task | null>
  updateTask: (taskId: string, updates: TaskUpdate) => Promise<Task | null>
  deleteTask: (taskId: string) => Promise<boolean>
  completeTask: (taskId: string) => Promise<Task | null>
  refresh: () => Promise<void>
}

// Helper to fetch entity names for tasks
async function enrichTasksWithEntityNames(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks

  // Group tasks by entity type
  const leadIds = tasks.filter(t => t.entity_type === 'lead' && t.entity_id).map(t => t.entity_id!)
  const contactIds = tasks.filter(t => t.entity_type === 'contact' && t.entity_id).map(t => t.entity_id!)
  const accountIds = tasks.filter(t => t.entity_type === 'account' && t.entity_id).map(t => t.entity_id!)
  const dealIds = tasks.filter(t => t.entity_type === 'deal' && t.entity_id).map(t => t.entity_id!)

  // Fetch entity names in parallel
  const [leads, contacts, accounts, deals] = await Promise.all([
    leadIds.length > 0
      ? supabase.from('leads').select('id, first_name, last_name').in('id', leadIds)
      : { data: [] },
    contactIds.length > 0
      ? supabase.from('contacts').select('id, first_name, last_name').in('id', contactIds)
      : { data: [] },
    accountIds.length > 0
      ? supabase.from('accounts').select('id, name').in('id', accountIds)
      : { data: [] },
    dealIds.length > 0
      ? supabase.from('deals').select('id, name').in('id', dealIds)
      : { data: [] },
  ])

  // Create lookup maps
  const entityNames: Record<string, string> = {}

  leads.data?.forEach((l: { id: string; first_name: string; last_name: string | null }) => {
    entityNames[l.id] = `${l.first_name}${l.last_name ? ' ' + l.last_name : ''}`
  })
  contacts.data?.forEach((c: { id: string; first_name: string; last_name: string | null }) => {
    entityNames[c.id] = `${c.first_name}${c.last_name ? ' ' + c.last_name : ''}`
  })
  accounts.data?.forEach((a: { id: string; name: string }) => {
    entityNames[a.id] = a.name
  })
  deals.data?.forEach((d: { id: string; name: string }) => {
    entityNames[d.id] = d.name
  })

  // Enrich tasks with entity names
  return tasks.map(task => ({
    ...task,
    entity_name: task.entity_id ? entityNames[task.entity_id] || null : null,
  }))
}

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const {
    entityType,
    entityId,
    taskTypes,
    statuses,
    priorities,
    assignedTo,
    ownerId,
    dueDateFrom,
    dueDateTo,
    includeCompleted = false,
    pageSize = 20,
    includeEntityNames = false,
  } = options

  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchTasks = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      let query = supabase
        .from('tasks')
        .select('*, users:owner_id(full_name), assigned_user:assigned_to(full_name)')
        .eq('tenant_id', user.tenantId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      // Filter by entity
      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId)
      }

      // Filter by task types
      if (taskTypes && taskTypes.length > 0) {
        query = query.in('task_type', taskTypes)
      }

      // Filter by statuses
      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses)
      } else if (!includeCompleted) {
        query = query.neq('status', 'completed')
      }

      // Filter by priorities
      if (priorities && priorities.length > 0) {
        query = query.in('priority', priorities)
      }

      // Filter by assigned user
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo)
      }

      // Filter by owner
      if (ownerId) {
        query = query.eq('owner_id', ownerId)
      }

      // Filter by due date range
      if (dueDateFrom) {
        query = query.gte('due_date', dueDateFrom)
      }
      if (dueDateTo) {
        query = query.lte('due_date', dueDateTo)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      let newTasks = (data || []) as Task[]
      setHasMore(newTasks.length === pageSize)

      // Enrich with entity names if requested
      if (includeEntityNames && newTasks.length > 0) {
        newTasks = await enrichTasksWithEntityNames(newTasks)
      }

      if (append) {
        setTasks(prev => [...prev, ...newTasks])
      } else {
        setTasks(newTasks)
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [
    user?.tenantId,
    entityType,
    entityId,
    taskTypes,
    statuses,
    priorities,
    assignedTo,
    ownerId,
    dueDateFrom,
    dueDateTo,
    includeCompleted,
    pageSize,
    includeEntityNames,
  ])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchTasks(tasks.length, true)
  }, [tasks.length, loadingMore, hasMore, fetchTasks])

  const addTask = useCallback(async (
    taskData: Omit<TaskInsert, 'tenant_id' | 'owner_id'>
  ): Promise<Task | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          tenant_id: user.tenantId,
          owner_id: user.id,
        } as Database['public']['Tables']['tasks']['Insert'])
        .select('*, users:owner_id(full_name), assigned_user:assigned_to(full_name)')
        .single()

      if (insertError) throw insertError
      return data as Task
    } catch (err) {
      console.error('Error adding task:', err)
      setError(err instanceof Error ? err.message : 'Failed to add task')
      return null
    }
  }, [user?.tenantId, user?.id])

  const updateTask = useCallback(async (
    taskId: string,
    updates: TaskUpdate
  ): Promise<Task | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updates as Database['public']['Tables']['tasks']['Update'])
        .eq('id', taskId)
        .eq('tenant_id', user.tenantId)
        .select('*, users:owner_id(full_name), assigned_user:assigned_to(full_name)')
        .single()

      if (updateError) throw updateError

      // Update local state
      setTasks(prev => prev.map(t => t.id === taskId ? (data as Task) : t))
      return data as Task
    } catch (err) {
      console.error('Error updating task:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task')
      return null
    }
  }, [user?.tenantId])

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      // Update local state
      setTasks(prev => prev.filter(t => t.id !== taskId))
      return true
    } catch (err) {
      console.error('Error deleting task:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      return false
    }
  }, [user?.tenantId])

  const completeTask = useCallback(async (taskId: string): Promise<Task | null> => {
    return updateTask(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
  }, [updateTask])

  const refresh = useCallback(async () => {
    await fetchTasks(0, false)
  }, [fetchTasks])

  // Initial fetch
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

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
      .channel(`tasks-${entityType || 'all'}-${entityId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter,
        },
        async (payload) => {
          // Fetch the full task with user info
          const { data } = await supabase
            .from('tasks')
            .select('*, users:owner_id(full_name), assigned_user:assigned_to(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            let enrichedData = data as Task
            // Check if task matches current filters
            if (taskTypes && taskTypes.length > 0 && !taskTypes.includes(data.task_type as TaskType)) {
              return
            }
            if (!includeCompleted && data.status === 'completed') {
              return
            }
            // Enrich with entity name if needed
            if (includeEntityNames) {
              const enriched = await enrichTasksWithEntityNames([data as Task])
              enrichedData = enriched[0]
            }
            setTasks(prev => [enrichedData, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter,
        },
        async (payload) => {
          // Fetch the full task with user info
          const { data } = await supabase
            .from('tasks')
            .select('*, users:owner_id(full_name), assigned_user:assigned_to(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            let enrichedData = data as Task
            // Enrich with entity name if needed
            if (includeEntityNames) {
              const enriched = await enrichTasksWithEntityNames([data as Task])
              enrichedData = enriched[0]
            }
            // Remove from list if completed and we're not including completed
            if (!includeCompleted && data.status === 'completed') {
              setTasks(prev => prev.filter(t => t.id !== payload.new.id))
            } else {
              setTasks(prev => prev.map(t => t.id === payload.new.id ? enrichedData : t))
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter,
        },
        (payload) => {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id))
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
  }, [user?.tenantId, entityType, entityId, taskTypes, includeCompleted, includeEntityNames])

  return {
    tasks,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    refresh,
  }
}

// Hook for fetching today's tasks
export function useTodaysTasks(): UseTasksReturn {
  const today = new Date().toISOString().split('T')[0]
  return useTasks({
    dueDateFrom: today,
    dueDateTo: today,
    includeCompleted: false,
    includeEntityNames: true,
  })
}

// Hook for fetching overdue tasks
export function useOverdueTasks(): UseTasksReturn {
  const today = new Date().toISOString().split('T')[0]
  return useTasks({
    dueDateTo: today,
    includeCompleted: false,
    includeEntityNames: true,
  })
}

// Hook for fetching my tasks (assigned to current user)
export function useMyTasks(): UseTasksReturn {
  const { user } = useAuth()
  return useTasks({
    assignedTo: user?.id,
    includeCompleted: false,
    includeEntityNames: true,
  })
}
