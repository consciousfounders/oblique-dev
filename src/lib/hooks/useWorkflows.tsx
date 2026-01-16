// useWorkflows Hook
// Manages workflow state and operations

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { WorkflowService } from '@/lib/services/workflows'
import type {
  Workflow,
  WorkflowWithDetails,
  WorkflowInsert,
  WorkflowUpdate,
  WorkflowConditionInsert,
  WorkflowActionInsert,
  WorkflowExecution,
} from '@/lib/supabase'

interface UseWorkflowsOptions {
  autoLoad?: boolean
}

interface UseWorkflowsReturn {
  workflows: Workflow[]
  loading: boolean
  error: string | null
  selectedWorkflow: WorkflowWithDetails | null
  executions: WorkflowExecution[]
  executionStats: {
    total: number
    completed: number
    failed: number
    running: number
  }
  // CRUD operations
  loadWorkflows: () => Promise<void>
  loadWorkflow: (id: string) => Promise<WorkflowWithDetails | null>
  createWorkflow: (
    workflow: Omit<WorkflowInsert, 'tenant_id'>,
    conditions?: Omit<WorkflowConditionInsert, 'workflow_id'>[],
    actions?: Omit<WorkflowActionInsert, 'workflow_id'>[]
  ) => Promise<WorkflowWithDetails | null>
  updateWorkflow: (
    id: string,
    workflow: WorkflowUpdate,
    conditions?: Omit<WorkflowConditionInsert, 'workflow_id'>[],
    actions?: Omit<WorkflowActionInsert, 'workflow_id'>[]
  ) => Promise<WorkflowWithDetails | null>
  deleteWorkflow: (id: string) => Promise<boolean>
  toggleWorkflow: (id: string, isActive: boolean) => Promise<boolean>
  duplicateWorkflow: (id: string, newName?: string) => Promise<WorkflowWithDetails | null>
  // Execution operations
  loadExecutions: (workflowId?: string) => Promise<void>
  loadExecutionStats: (workflowId?: string) => Promise<void>
  // Utility
  refresh: () => Promise<void>
}

export function useWorkflows(options: UseWorkflowsOptions = {}): UseWorkflowsReturn {
  const { autoLoad = true } = options
  const { user } = useAuth()

  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithDetails | null>(null)
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [executionStats, setExecutionStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    running: 0,
  })

  const getService = useCallback(() => {
    if (!user?.tenantId) return null
    return new WorkflowService(user.tenantId)
  }, [user?.tenantId])

  const loadWorkflows = useCallback(async () => {
    const service = getService()
    if (!service) return

    setLoading(true)
    setError(null)

    try {
      const data = await service.getWorkflows()
      setWorkflows(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workflows'
      setError(message)
      console.error('Error loading workflows:', err)
    } finally {
      setLoading(false)
    }
  }, [getService])

  const loadWorkflow = useCallback(async (id: string): Promise<WorkflowWithDetails | null> => {
    const service = getService()
    if (!service) return null

    try {
      const data = await service.getWorkflow(id)
      setSelectedWorkflow(data)
      return data
    } catch (err) {
      console.error('Error loading workflow:', err)
      toast.error('Failed to load workflow')
      return null
    }
  }, [getService])

  const createWorkflow = useCallback(async (
    workflow: Omit<WorkflowInsert, 'tenant_id'>,
    conditions: Omit<WorkflowConditionInsert, 'workflow_id'>[] = [],
    actions: Omit<WorkflowActionInsert, 'workflow_id'>[] = []
  ): Promise<WorkflowWithDetails | null> => {
    const service = getService()
    if (!service) return null

    try {
      const newWorkflow = await service.createWorkflow(workflow, conditions, actions)
      setWorkflows(prev => [newWorkflow, ...prev])
      toast.success('Workflow created successfully')
      return newWorkflow
    } catch (err) {
      console.error('Error creating workflow:', err)
      toast.error('Failed to create workflow')
      return null
    }
  }, [getService])

  const updateWorkflow = useCallback(async (
    id: string,
    workflow: WorkflowUpdate,
    conditions?: Omit<WorkflowConditionInsert, 'workflow_id'>[],
    actions?: Omit<WorkflowActionInsert, 'workflow_id'>[]
  ): Promise<WorkflowWithDetails | null> => {
    const service = getService()
    if (!service) return null

    try {
      const updated = await service.updateWorkflow(id, workflow, conditions, actions)
      setWorkflows(prev => prev.map(w => w.id === id ? updated : w))
      setSelectedWorkflow(updated)
      toast.success('Workflow updated successfully')
      return updated
    } catch (err) {
      console.error('Error updating workflow:', err)
      toast.error('Failed to update workflow')
      return null
    }
  }, [getService])

  const deleteWorkflow = useCallback(async (id: string): Promise<boolean> => {
    const service = getService()
    if (!service) return false

    try {
      await service.deleteWorkflow(id)
      setWorkflows(prev => prev.filter(w => w.id !== id))
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null)
      }
      toast.success('Workflow deleted successfully')
      return true
    } catch (err) {
      console.error('Error deleting workflow:', err)
      toast.error('Failed to delete workflow')
      return false
    }
  }, [getService, selectedWorkflow?.id])

  const toggleWorkflow = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    const service = getService()
    if (!service) return false

    try {
      await service.toggleWorkflowActive(id, isActive)
      setWorkflows(prev => prev.map(w =>
        w.id === id ? { ...w, is_active: isActive } : w
      ))
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(prev => prev ? { ...prev, is_active: isActive } : null)
      }
      toast.success(`Workflow ${isActive ? 'activated' : 'deactivated'}`)
      return true
    } catch (err) {
      console.error('Error toggling workflow:', err)
      toast.error('Failed to toggle workflow')
      return false
    }
  }, [getService, selectedWorkflow?.id])

  const duplicateWorkflow = useCallback(async (
    id: string,
    newName?: string
  ): Promise<WorkflowWithDetails | null> => {
    const service = getService()
    if (!service) return null

    try {
      const duplicated = await service.duplicateWorkflow(id, newName)
      setWorkflows(prev => [duplicated, ...prev])
      toast.success('Workflow duplicated successfully')
      return duplicated
    } catch (err) {
      console.error('Error duplicating workflow:', err)
      toast.error('Failed to duplicate workflow')
      return null
    }
  }, [getService])

  const loadExecutions = useCallback(async (workflowId?: string) => {
    const service = getService()
    if (!service) return

    try {
      const data = await service.getExecutions(workflowId)
      setExecutions(data)
    } catch (err) {
      console.error('Error loading executions:', err)
    }
  }, [getService])

  const loadExecutionStats = useCallback(async (workflowId?: string) => {
    const service = getService()
    if (!service) return

    try {
      const stats = await service.getExecutionStats(workflowId)
      setExecutionStats(stats)
    } catch (err) {
      console.error('Error loading execution stats:', err)
    }
  }, [getService])

  const refresh = useCallback(async () => {
    await loadWorkflows()
  }, [loadWorkflows])

  // Initial load
  useEffect(() => {
    if (user?.tenantId && autoLoad) {
      loadWorkflows()
    }
  }, [user?.tenantId, autoLoad, loadWorkflows])

  return {
    workflows,
    loading,
    error,
    selectedWorkflow,
    executions,
    executionStats,
    loadWorkflows,
    loadWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    duplicateWorkflow,
    loadExecutions,
    loadExecutionStats,
    refresh,
  }
}
