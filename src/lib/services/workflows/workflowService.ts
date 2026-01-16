// Workflow Service
// Manages workflow CRUD operations and retrieval

import { supabase } from '@/lib/supabase'
import type {
  Workflow,
  WorkflowInsert,
  WorkflowUpdate,
  WorkflowCondition,
  WorkflowConditionInsert,
  WorkflowAction,
  WorkflowActionInsert,
  WorkflowExecution,
  WorkflowActionLog,
  WorkflowWithDetails,
  WorkflowTriggerType,
  WorkflowEntityType,
} from '@/lib/supabase'

export class WorkflowService {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  // Get all workflows for the tenant
  async getWorkflows(): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Get active workflows for a specific trigger and entity type
  async getActiveWorkflows(
    triggerType: WorkflowTriggerType,
    entityType: WorkflowEntityType
  ): Promise<WorkflowWithDetails[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_conditions(*),
        workflow_actions(*)
      `)
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .eq('trigger_type', triggerType)
      .eq('entity_type', entityType)
      .order('position', { ascending: true })

    if (error) throw error

    return (data || []).map(w => ({
      ...w,
      conditions: w.workflow_conditions || [],
      actions: (w.workflow_actions || []).sort((a: WorkflowAction, b: WorkflowAction) => a.position - b.position),
    }))
  }

  // Get a single workflow with all details
  async getWorkflow(id: string): Promise<WorkflowWithDetails | null> {
    const { data, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_conditions(*),
        workflow_actions(*),
        users:created_by(full_name)
      `)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return {
      ...data,
      conditions: (data.workflow_conditions || []).sort((a: WorkflowCondition, b: WorkflowCondition) => a.position - b.position),
      actions: (data.workflow_actions || []).sort((a: WorkflowAction, b: WorkflowAction) => a.position - b.position),
      created_by_user: data.users,
    }
  }

  // Create a new workflow
  async createWorkflow(
    workflow: Omit<WorkflowInsert, 'tenant_id'>,
    conditions: Omit<WorkflowConditionInsert, 'workflow_id'>[] = [],
    actions: Omit<WorkflowActionInsert, 'workflow_id'>[] = []
  ): Promise<WorkflowWithDetails> {
    // Create the workflow first
    const { data: newWorkflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        ...workflow,
        tenant_id: this.tenantId,
      })
      .select()
      .single()

    if (workflowError) throw workflowError

    // Add conditions
    if (conditions.length > 0) {
      const { error: conditionsError } = await supabase
        .from('workflow_conditions')
        .insert(
          conditions.map((c, index) => ({
            ...c,
            workflow_id: newWorkflow.id,
            position: c.position ?? index,
          }))
        )

      if (conditionsError) {
        // Cleanup on error
        await supabase.from('workflows').delete().eq('id', newWorkflow.id)
        throw conditionsError
      }
    }

    // Add actions
    if (actions.length > 0) {
      const { error: actionsError } = await supabase
        .from('workflow_actions')
        .insert(
          actions.map((a, index) => ({
            ...a,
            workflow_id: newWorkflow.id,
            position: a.position ?? index,
          }))
        )

      if (actionsError) {
        // Cleanup on error
        await supabase.from('workflows').delete().eq('id', newWorkflow.id)
        throw actionsError
      }
    }

    // Return the full workflow
    const result = await this.getWorkflow(newWorkflow.id)
    if (!result) throw new Error('Failed to retrieve created workflow')
    return result
  }

  // Update a workflow
  async updateWorkflow(
    id: string,
    workflow: WorkflowUpdate,
    conditions?: Omit<WorkflowConditionInsert, 'workflow_id'>[],
    actions?: Omit<WorkflowActionInsert, 'workflow_id'>[]
  ): Promise<WorkflowWithDetails> {
    // Update the workflow
    const { error: workflowError } = await supabase
      .from('workflows')
      .update({
        ...workflow,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)

    if (workflowError) throw workflowError

    // Update conditions if provided
    if (conditions !== undefined) {
      // Delete existing conditions
      await supabase
        .from('workflow_conditions')
        .delete()
        .eq('workflow_id', id)

      // Insert new conditions
      if (conditions.length > 0) {
        const { error: conditionsError } = await supabase
          .from('workflow_conditions')
          .insert(
            conditions.map((c, index) => ({
              ...c,
              workflow_id: id,
              position: c.position ?? index,
            }))
          )

        if (conditionsError) throw conditionsError
      }
    }

    // Update actions if provided
    if (actions !== undefined) {
      // Delete existing actions
      await supabase
        .from('workflow_actions')
        .delete()
        .eq('workflow_id', id)

      // Insert new actions
      if (actions.length > 0) {
        const { error: actionsError } = await supabase
          .from('workflow_actions')
          .insert(
            actions.map((a, index) => ({
              ...a,
              workflow_id: id,
              position: a.position ?? index,
            }))
          )

        if (actionsError) throw actionsError
      }
    }

    // Return the updated workflow
    const result = await this.getWorkflow(id)
    if (!result) throw new Error('Failed to retrieve updated workflow')
    return result
  }

  // Delete a workflow
  async deleteWorkflow(id: string): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.tenantId)

    if (error) throw error
  }

  // Toggle workflow active status
  async toggleWorkflowActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', this.tenantId)

    if (error) throw error
  }

  // Get workflow executions
  async getExecutions(
    workflowId?: string,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    let query = supabase
      .from('workflow_executions')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (workflowId) {
      query = query.eq('workflow_id', workflowId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  // Get execution details with action logs
  async getExecutionDetails(executionId: string): Promise<{
    execution: WorkflowExecution
    actionLogs: WorkflowActionLog[]
  } | null> {
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .eq('tenant_id', this.tenantId)
      .single()

    if (execError) {
      if (execError.code === 'PGRST116') return null
      throw execError
    }

    const { data: actionLogs, error: logsError } = await supabase
      .from('workflow_action_logs')
      .select('*')
      .eq('execution_id', executionId)
      .order('created_at', { ascending: true })

    if (logsError) throw logsError

    return {
      execution,
      actionLogs: actionLogs || [],
    }
  }

  // Get execution statistics
  async getExecutionStats(workflowId?: string): Promise<{
    total: number
    completed: number
    failed: number
    running: number
  }> {
    let query = supabase
      .from('workflow_executions')
      .select('status')
      .eq('tenant_id', this.tenantId)

    if (workflowId) {
      query = query.eq('workflow_id', workflowId)
    }

    const { data, error } = await query

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      completed: 0,
      failed: 0,
      running: 0,
    }

    for (const row of data || []) {
      if (row.status === 'completed') stats.completed++
      else if (row.status === 'failed') stats.failed++
      else if (row.status === 'running') stats.running++
    }

    return stats
  }

  // Check if workflow has run for a record
  async hasRunForRecord(
    workflowId: string,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('workflow_record_runs')
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  }

  // Mark workflow as run for a record
  async markRunForRecord(
    workflowId: string,
    entityType: string,
    entityId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('workflow_record_runs')
      .upsert({
        workflow_id: workflowId,
        entity_type: entityType,
        entity_id: entityId,
      })

    if (error) throw error
  }

  // Duplicate a workflow
  async duplicateWorkflow(id: string, newName?: string): Promise<WorkflowWithDetails> {
    const original = await this.getWorkflow(id)
    if (!original) throw new Error('Workflow not found')

    // Create a copy without IDs
    const conditions = (original.conditions || []).map(c => ({
      condition_group: c.condition_group,
      field_name: c.field_name,
      operator: c.operator,
      field_value: c.field_value,
      field_values: c.field_values,
      logical_operator: c.logical_operator,
      position: c.position,
    }))

    const actions = (original.actions || []).map(a => ({
      action_type: a.action_type,
      action_config: a.action_config,
      position: a.position,
      delay_minutes: a.delay_minutes,
      stop_on_error: a.stop_on_error,
    }))

    return this.createWorkflow(
      {
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        trigger_type: original.trigger_type,
        trigger_config: original.trigger_config,
        entity_type: original.entity_type,
        is_active: false, // Start as inactive
        run_once_per_record: original.run_once_per_record,
        position: original.position,
      },
      conditions,
      actions
    )
  }
}

// Helper function to create a service instance
export function createWorkflowService(tenantId: string): WorkflowService {
  return new WorkflowService(tenantId)
}
