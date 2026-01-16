// Workflow Execution Engine
// Evaluates conditions and executes workflow actions

import { supabase } from '@/lib/supabase'
import type {
  Workflow,
  WorkflowWithDetails,
  WorkflowCondition,
  WorkflowAction,
  WorkflowExecution,
  WorkflowExecutionInsert,
  WorkflowActionLogInsert,
  WorkflowActionConfig,
  WorkflowConditionOperator,
} from '@/lib/supabase'
import { WorkflowService } from './workflowService'

export interface ExecutionContext {
  tenantId: string
  userId?: string
  record: Record<string, unknown>
  entityType: string
  entityId: string
  triggerEvent: string
  triggerData?: Record<string, unknown>
}

export interface ActionResult {
  success: boolean
  output?: Record<string, unknown>
  error?: string
}

export class WorkflowExecutionEngine {
  private workflowService: WorkflowService

  constructor(tenantId: string) {
    this.workflowService = new WorkflowService(tenantId)
  }

  // Main entry point: trigger workflows for an event
  async triggerWorkflows(context: ExecutionContext): Promise<void> {
    const workflows = await this.workflowService.getActiveWorkflows(
      context.triggerEvent as Workflow['trigger_type'],
      context.entityType as 'lead' | 'contact' | 'deal' | 'account'
    )

    for (const workflow of workflows) {
      try {
        await this.executeWorkflow(workflow, context)
      } catch (error) {
        console.error(`Error executing workflow ${workflow.id}:`, error)
        // Continue with other workflows even if one fails
      }
    }
  }

  // Execute a single workflow
  async executeWorkflow(
    workflow: WorkflowWithDetails,
    context: ExecutionContext
  ): Promise<WorkflowExecution | null> {
    // Check if workflow should only run once per record
    if (workflow.run_once_per_record) {
      const hasRun = await this.workflowService.hasRunForRecord(
        workflow.id,
        context.entityType,
        context.entityId
      )
      if (hasRun) {
        console.log(`Workflow ${workflow.id} already ran for ${context.entityType}:${context.entityId}`)
        return null
      }
    }

    // Evaluate conditions
    const conditionsMet = this.evaluateConditions(
      workflow.conditions || [],
      context.record
    )

    if (!conditionsMet) {
      console.log(`Conditions not met for workflow ${workflow.id}`)
      return null
    }

    // Create execution record
    const execution = await this.createExecution(workflow, context)

    try {
      // Mark as running
      await this.updateExecutionStatus(execution.id, 'running')

      // Execute actions sequentially
      const actions = workflow.actions || []
      let stopExecution = false

      for (const action of actions) {
        if (stopExecution) break

        // Handle delay
        if (action.delay_minutes > 0) {
          // For now, we'll skip delayed actions in synchronous execution
          // In production, these would be queued for later execution
          console.log(`Skipping delayed action ${action.id} (${action.delay_minutes} min delay)`)
          continue
        }

        const result = await this.executeAction(action, context, execution.id)

        if (!result.success && action.stop_on_error) {
          stopExecution = true
          await this.updateExecutionStatus(execution.id, 'failed', result.error)
        }
      }

      if (!stopExecution) {
        await this.updateExecutionStatus(execution.id, 'completed')
      }

      // Mark workflow as run for this record if configured
      if (workflow.run_once_per_record) {
        await this.workflowService.markRunForRecord(
          workflow.id,
          context.entityType,
          context.entityId
        )
      }

      return execution
    } catch (error) {
      await this.updateExecutionStatus(
        execution.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  }

  // Evaluate all conditions for a workflow
  evaluateConditions(
    conditions: WorkflowCondition[],
    record: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return true

    // Group conditions by condition_group
    const groups = new Map<number, WorkflowCondition[]>()
    for (const condition of conditions) {
      const group = condition.condition_group
      if (!groups.has(group)) {
        groups.set(group, [])
      }
      groups.get(group)!.push(condition)
    }

    // Evaluate each group (groups are OR'd together)
    for (const [, groupConditions] of groups) {
      // Within a group, conditions use the logical_operator
      const groupResult = this.evaluateConditionGroup(groupConditions, record)
      if (groupResult) return true // OR between groups
    }

    return false
  }

  // Evaluate a group of conditions (using AND/OR within group)
  private evaluateConditionGroup(
    conditions: WorkflowCondition[],
    record: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return true

    // Sort by position
    const sorted = [...conditions].sort((a, b) => a.position - b.position)

    let result = this.evaluateSingleCondition(sorted[0], record)

    for (let i = 1; i < sorted.length; i++) {
      const condition = sorted[i]
      const condResult = this.evaluateSingleCondition(condition, record)

      // Use the logical_operator from the current condition
      if (condition.logical_operator === 'OR') {
        result = result || condResult
      } else {
        result = result && condResult
      }
    }

    return result
  }

  // Evaluate a single condition
  private evaluateSingleCondition(
    condition: WorkflowCondition,
    record: Record<string, unknown>
  ): boolean {
    const fieldValue = record[condition.field_name]
    const operator = condition.operator as WorkflowConditionOperator
    const compareValue = condition.field_value
    const compareValues = condition.field_values

    switch (operator) {
      case 'equals':
        return String(fieldValue || '').toLowerCase() === String(compareValue || '').toLowerCase()

      case 'not_equals':
        return String(fieldValue || '').toLowerCase() !== String(compareValue || '').toLowerCase()

      case 'contains':
        if (!fieldValue || !compareValue) return false
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())

      case 'not_contains':
        if (!fieldValue) return true
        if (!compareValue) return false
        return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase())

      case 'greater_than':
        return Number(fieldValue) > Number(compareValue)

      case 'less_than':
        return Number(fieldValue) < Number(compareValue)

      case 'is_null':
        return fieldValue === null || fieldValue === undefined || fieldValue === ''

      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''

      case 'in':
        if (!compareValues || !fieldValue) return false
        return compareValues.map(v => v.toLowerCase()).includes(String(fieldValue).toLowerCase())

      case 'not_in':
        if (!compareValues) return true
        if (!fieldValue) return true
        return !compareValues.map(v => v.toLowerCase()).includes(String(fieldValue).toLowerCase())

      default:
        console.warn(`Unknown operator: ${operator}`)
        return false
    }
  }

  // Execute a single action
  private async executeAction(
    action: WorkflowAction,
    context: ExecutionContext,
    executionId: string
  ): Promise<ActionResult> {
    // Create action log
    const actionLog = await this.createActionLog(executionId, action)

    try {
      // Mark as running
      await this.updateActionLogStatus(actionLog.id, 'running')

      let result: ActionResult

      switch (action.action_type) {
        case 'create_task':
          result = await this.executeCreateTask(action.action_config, context)
          break

        case 'update_field':
          result = await this.executeUpdateField(action.action_config, context)
          break

        case 'assign_owner':
          result = await this.executeAssignOwner(action.action_config, context)
          break

        case 'send_notification':
          result = await this.executeSendNotification(action.action_config, context)
          break

        case 'webhook_call':
          result = await this.executeWebhookCall(action.action_config, context)
          break

        case 'send_email':
          // Email sending would require email service integration
          result = { success: true, output: { message: 'Email action placeholder' } }
          break

        case 'create_record':
          result = await this.executeCreateRecord(action.action_config, context)
          break

        default:
          result = { success: false, error: `Unknown action type: ${action.action_type}` }
      }

      // Update action log
      await this.updateActionLogStatus(
        actionLog.id,
        result.success ? 'completed' : 'failed',
        result.output,
        result.error
      )

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.updateActionLogStatus(actionLog.id, 'failed', undefined, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Action implementations
  private async executeCreateTask(
    config: WorkflowActionConfig,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const subject = this.replacePlaceholders(config.subject || '', context)
    const description = this.replacePlaceholders(config.description || '', context)

    const dueDate = new Date()
    if (config.due_days) {
      dueDate.setDate(dueDate.getDate() + config.due_days)
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        tenant_id: context.tenantId,
        entity_type: context.entityType,
        entity_id: context.entityId,
        subject,
        description,
        task_type: (config.task_type as 'call' | 'email' | 'meeting' | 'todo' | 'follow_up') || 'todo',
        priority: (config.priority as 'low' | 'medium' | 'high') || 'medium',
        status: 'not_started',
        due_date: dueDate.toISOString().split('T')[0],
        owner_id: config.assign_to || context.userId,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, output: { task_id: data.id } }
  }

  private async executeUpdateField(
    config: WorkflowActionConfig,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const fieldName = config.field_name
    const fieldValue = this.replacePlaceholders(config.field_value || '', context)

    if (!fieldName) {
      return { success: false, error: 'Field name is required' }
    }

    const tableName = this.getTableForEntity(context.entityType)
    if (!tableName) {
      return { success: false, error: `Unknown entity type: ${context.entityType}` }
    }

    const { error } = await supabase
      .from(tableName)
      .update({ [fieldName]: fieldValue })
      .eq('id', context.entityId)
      .eq('tenant_id', context.tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, output: { field: fieldName, value: fieldValue } }
  }

  private async executeAssignOwner(
    config: WorkflowActionConfig,
    context: ExecutionContext
  ): Promise<ActionResult> {
    let assignToUserId = config.user_id

    // If using assignment rule, get next assignee
    if (!assignToUserId && config.team_id) {
      // Get team members and apply round-robin or load-balanced
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', config.team_id)

      if (teamMembers && teamMembers.length > 0) {
        // Simple round-robin: pick a random member for now
        // In production, this would use the assignment_rule_members table
        const randomIndex = Math.floor(Math.random() * teamMembers.length)
        assignToUserId = teamMembers[randomIndex].user_id
      }
    }

    if (!assignToUserId) {
      return { success: false, error: 'No user to assign to' }
    }

    const tableName = this.getTableForEntity(context.entityType)
    if (!tableName) {
      return { success: false, error: `Unknown entity type: ${context.entityType}` }
    }

    const { error } = await supabase
      .from(tableName)
      .update({ owner_id: assignToUserId })
      .eq('id', context.entityId)
      .eq('tenant_id', context.tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, output: { assigned_to: assignToUserId } }
  }

  private async executeSendNotification(
    config: WorkflowActionConfig,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const title = this.replacePlaceholders(config.title || '', context)
    const message = this.replacePlaceholders(config.message || '', context)

    const targetUserIds: string[] = []

    if (config.notify_owner && context.record.owner_id) {
      targetUserIds.push(context.record.owner_id as string)
    }

    if (config.user_ids) {
      targetUserIds.push(...config.user_ids)
    }

    // Dedupe
    const uniqueUserIds = [...new Set(targetUserIds)]

    if (uniqueUserIds.length === 0) {
      return { success: false, error: 'No users to notify' }
    }

    const notifications = uniqueUserIds.map(userId => ({
      tenant_id: context.tenantId,
      user_id: userId,
      title,
      body: message,
      type: 'system' as const,
      entity_type: context.entityType,
      entity_id: context.entityId,
      read: false,
    }))

    const { error } = await supabase
      .from('notifications')
      .insert(notifications)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, output: { notified_users: uniqueUserIds.length } }
  }

  private async executeWebhookCall(
    config: WorkflowActionConfig,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const url = config.url
    const method = config.method || 'POST'
    const headers = config.headers || {}

    if (!url) {
      return { success: false, error: 'Webhook URL is required' }
    }

    const bodyTemplate = config.body_template || JSON.stringify(context.record)
    const body = this.replacePlaceholders(bodyTemplate, context)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: method !== 'GET' ? body : undefined,
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Webhook returned ${response.status}: ${response.statusText}`,
        }
      }

      return {
        success: true,
        output: { status: response.status, statusText: response.statusText },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook call failed',
      }
    }
  }

  private async executeCreateRecord(
    config: WorkflowActionConfig,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const entityType = config.record_entity_type
    const fieldMappings = config.field_mappings || {}

    if (!entityType) {
      return { success: false, error: 'Entity type is required' }
    }

    const tableName = this.getTableForEntity(entityType)
    if (!tableName) {
      return { success: false, error: `Unknown entity type: ${entityType}` }
    }

    // Build the new record from field mappings
    const newRecord: Record<string, unknown> = {
      tenant_id: context.tenantId,
    }

    for (const [targetField, sourceFieldOrValue] of Object.entries(fieldMappings)) {
      if (sourceFieldOrValue.startsWith('{{') && sourceFieldOrValue.endsWith('}}')) {
        // It's a placeholder - get value from context
        newRecord[targetField] = this.replacePlaceholders(sourceFieldOrValue, context)
      } else {
        // It's a literal value
        newRecord[targetField] = sourceFieldOrValue
      }
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(newRecord)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, output: { created_id: data.id, entity_type: entityType } }
  }

  // Helper methods
  private getTableForEntity(entityType: string): string | null {
    const tables: Record<string, string> = {
      lead: 'leads',
      contact: 'contacts',
      deal: 'deals',
      account: 'accounts',
    }
    return tables[entityType] || null
  }

  private replacePlaceholders(
    template: string,
    context: ExecutionContext
  ): string {
    let result = template

    // Replace record placeholders
    result = result.replace(/\{\{record\.(\w+)\}\}/g, (_match, field) => {
      return String(context.record[field] || '')
    })

    // Replace date placeholders
    result = result.replace(/\{\{today\}\}/g, new Date().toISOString().split('T')[0])
    result = result.replace(/\{\{now\}\}/g, new Date().toISOString())

    // Replace current user placeholders (if user info available)
    if (context.userId) {
      result = result.replace(/\{\{current_user\.id\}\}/g, context.userId)
    }

    return result
  }

  // Database operations for execution tracking
  private async createExecution(
    workflow: WorkflowWithDetails,
    context: ExecutionContext
  ): Promise<WorkflowExecution> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflow.id,
        tenant_id: context.tenantId,
        entity_type: context.entityType,
        entity_id: context.entityId,
        trigger_event: context.triggerEvent,
        trigger_data: context.triggerData,
        status: 'pending',
      } as WorkflowExecutionInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  private async updateExecutionStatus(
    executionId: string,
    status: WorkflowExecution['status'],
    errorMessage?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = { status }

    if (status === 'running') {
      updates.started_at = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString()
      if (errorMessage) {
        updates.error_message = errorMessage
      }
    }

    const { error } = await supabase
      .from('workflow_executions')
      .update(updates)
      .eq('id', executionId)

    if (error) throw error
  }

  private async createActionLog(
    executionId: string,
    action: WorkflowAction
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('workflow_action_logs')
      .insert({
        execution_id: executionId,
        action_id: action.id,
        action_type: action.action_type,
        status: 'pending',
        input_data: action.action_config,
      } as WorkflowActionLogInsert)
      .select('id')
      .single()

    if (error) throw error
    return data
  }

  private async updateActionLogStatus(
    actionLogId: string,
    status: WorkflowExecution['status'],
    output?: Record<string, unknown>,
    errorMessage?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = { status }

    if (status === 'running') {
      updates.started_at = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString()
      if (output) {
        updates.output_data = output
      }
      if (errorMessage) {
        updates.error_message = errorMessage
      }
    }

    const { error } = await supabase
      .from('workflow_action_logs')
      .update(updates)
      .eq('id', actionLogId)

    if (error) throw error
  }
}

// Helper function to create an execution engine instance
export function createWorkflowExecutionEngine(tenantId: string): WorkflowExecutionEngine {
  return new WorkflowExecutionEngine(tenantId)
}
