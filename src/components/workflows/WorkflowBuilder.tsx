// WorkflowBuilder Component
// Visual builder for creating and editing workflows

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Zap,
  Filter,
  Play,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type {
  WorkflowWithDetails,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowConditionOperator,
  WorkflowEntityType,
  WorkflowConditionInsert,
  WorkflowActionInsert,
  WorkflowTriggerConfig,
  WorkflowActionConfig,
} from '@/lib/supabase'
import {
  WORKFLOW_TRIGGER_TYPES,
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_CONDITION_OPERATORS,
  WORKFLOW_ENTITY_TYPES,
} from '@/lib/supabase'
import {
  ENTITY_FIELDS,
  ENTITY_DATE_FIELDS,
  DEFAULT_ACTION_CONFIGS,
  DEFAULT_TRIGGER_CONFIGS,
} from '@/lib/services/workflows'

interface WorkflowBuilderProps {
  workflow?: WorkflowWithDetails | null
  onSave: (
    workflow: {
      name: string
      description: string | null
      trigger_type: WorkflowTriggerType
      trigger_config: WorkflowTriggerConfig
      entity_type: string
      is_active: boolean
      run_once_per_record: boolean
    },
    conditions: Omit<WorkflowConditionInsert, 'workflow_id'>[],
    actions: Omit<WorkflowActionInsert, 'workflow_id'>[]
  ) => Promise<void>
  saving?: boolean
}

interface ConditionState {
  id: string
  condition_group: number
  field_name: string
  operator: WorkflowConditionOperator
  field_value: string
  field_values: string[]
  logical_operator: 'AND' | 'OR'
  position: number
}

interface ActionState {
  id: string
  action_type: WorkflowActionType
  action_config: WorkflowActionConfig
  position: number
  delay_minutes: number
  stop_on_error: boolean
}

let conditionIdCounter = 0
let actionIdCounter = 0

function generateConditionId(): string {
  return `condition-${++conditionIdCounter}`
}

function generateActionId(): string {
  return `action-${++actionIdCounter}`
}

export function WorkflowBuilder({
  workflow,
  onSave,
  saving = false,
}: WorkflowBuilderProps) {
  const navigate = useNavigate()
  const isEditing = !!workflow

  // Basic info
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [entityType, setEntityType] = useState<WorkflowEntityType>(
    (workflow?.entity_type as WorkflowEntityType) || 'lead'
  )
  const [isActive, setIsActive] = useState(workflow?.is_active ?? false)
  const [runOncePerRecord, setRunOncePerRecord] = useState(workflow?.run_once_per_record ?? false)

  // Trigger
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>(
    workflow?.trigger_type || 'record_created'
  )
  const [triggerConfig, setTriggerConfig] = useState<WorkflowTriggerConfig>(
    workflow?.trigger_config || DEFAULT_TRIGGER_CONFIGS.record_created || {}
  )

  // Conditions
  const [conditions, setConditions] = useState<ConditionState[]>([])

  // Actions
  const [actions, setActions] = useState<ActionState[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState('trigger')
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())

  // Initialize from workflow prop
  useEffect(() => {
    if (workflow) {
      setConditions(
        (workflow.conditions || []).map(c => ({
          id: generateConditionId(),
          condition_group: c.condition_group,
          field_name: c.field_name,
          operator: c.operator,
          field_value: c.field_value || '',
          field_values: c.field_values || [],
          logical_operator: c.logical_operator,
          position: c.position,
        }))
      )
      setActions(
        (workflow.actions || []).map(a => ({
          id: generateActionId(),
          action_type: a.action_type,
          action_config: a.action_config,
          position: a.position,
          delay_minutes: a.delay_minutes,
          stop_on_error: a.stop_on_error,
        }))
      )
      // Expand all actions
      setExpandedActions(new Set(workflow.actions?.map((_, i) => `action-${i + 1}`) || []))
    }
  }, [workflow])

  // Get fields for current entity type
  const entityFields = ENTITY_FIELDS[entityType] || []
  const dateFields = ENTITY_DATE_FIELDS[entityType] || []

  // Handle trigger type change
  const handleTriggerTypeChange = (type: WorkflowTriggerType) => {
    setTriggerType(type)
    setTriggerConfig(DEFAULT_TRIGGER_CONFIGS[type] || {})
  }

  // Condition handlers
  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: generateConditionId(),
        condition_group: 0,
        field_name: entityFields[0]?.name || '',
        operator: 'equals',
        field_value: '',
        field_values: [],
        logical_operator: 'AND',
        position: conditions.length,
      },
    ])
  }

  const updateCondition = (id: string, updates: Partial<ConditionState>) => {
    setConditions(conditions.map(c => (c.id === id ? { ...c, ...updates } : c)))
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
  }

  // Action handlers
  const addAction = (type: WorkflowActionType) => {
    const newId = generateActionId()
    setActions([
      ...actions,
      {
        id: newId,
        action_type: type,
        action_config: { ...DEFAULT_ACTION_CONFIGS[type] },
        position: actions.length,
        delay_minutes: 0,
        stop_on_error: false,
      },
    ])
    setExpandedActions(new Set([...expandedActions, newId]))
  }

  const updateAction = (id: string, updates: Partial<ActionState>) => {
    setActions(actions.map(a => (a.id === id ? { ...a, ...updates } : a)))
  }

  const updateActionConfig = (id: string, configUpdates: Partial<WorkflowActionConfig>) => {
    setActions(
      actions.map(a =>
        a.id === id
          ? { ...a, action_config: { ...a.action_config, ...configUpdates } }
          : a
      )
    )
  }

  const removeAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id))
    const newExpanded = new Set(expandedActions)
    newExpanded.delete(id)
    setExpandedActions(newExpanded)
  }

  const toggleActionExpanded = (id: string) => {
    const newExpanded = new Set(expandedActions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedActions(newExpanded)
  }

  // Save handler
  const handleSave = async () => {
    const workflowData = {
      name,
      description: description || null,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      entity_type: entityType,
      is_active: isActive,
      run_once_per_record: runOncePerRecord,
    }

    const conditionsData: Omit<WorkflowConditionInsert, 'workflow_id'>[] = conditions.map(
      (c, index) => ({
        condition_group: c.condition_group,
        field_name: c.field_name,
        operator: c.operator,
        field_value: c.field_value || null,
        field_values: c.field_values.length > 0 ? c.field_values : null,
        logical_operator: c.logical_operator,
        position: index,
      })
    )

    const actionsData: Omit<WorkflowActionInsert, 'workflow_id'>[] = actions.map(
      (a, index) => ({
        action_type: a.action_type,
        action_config: a.action_config,
        position: index,
        delay_minutes: a.delay_minutes,
        stop_on_error: a.stop_on_error,
      })
    )

    await onSave(workflowData, conditionsData, actionsData)
  }

  // Render trigger config based on type
  const renderTriggerConfig = () => {
    switch (triggerType) {
      case 'field_changed':
        return (
          <div className="space-y-4">
            <div>
              <Label>Field to Monitor</Label>
              <Select
                value={triggerConfig.field_name || ''}
                onValueChange={(value) =>
                  setTriggerConfig({ ...triggerConfig, field_name: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {entityFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Value (optional)</Label>
                <Input
                  value={triggerConfig.from_value || ''}
                  onChange={(e) =>
                    setTriggerConfig({ ...triggerConfig, from_value: e.target.value })
                  }
                  placeholder="Any value"
                />
              </div>
              <div>
                <Label>To Value (optional)</Label>
                <Input
                  value={triggerConfig.to_value || ''}
                  onChange={(e) =>
                    setTriggerConfig({ ...triggerConfig, to_value: e.target.value })
                  }
                  placeholder="Any value"
                />
              </div>
            </div>
          </div>
        )

      case 'date_based':
        return (
          <div className="space-y-4">
            <div>
              <Label>Date Field</Label>
              <Select
                value={triggerConfig.date_field || ''}
                onValueChange={(value) =>
                  setTriggerConfig({ ...triggerConfig, date_field: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date field" />
                </SelectTrigger>
                <SelectContent>
                  {dateFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Days Offset</Label>
                <Input
                  type="number"
                  value={triggerConfig.offset_days || 0}
                  onChange={(e) =>
                    setTriggerConfig({
                      ...triggerConfig,
                      offset_days: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Direction</Label>
                <Select
                  value={triggerConfig.offset_direction || 'after'}
                  onValueChange={(value: 'before' | 'after') =>
                    setTriggerConfig({ ...triggerConfig, offset_direction: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="after">After</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 'webhook':
        return (
          <div>
            <Label>Secret Key</Label>
            <Input
              type="password"
              value={triggerConfig.secret_key || ''}
              onChange={(e) =>
                setTriggerConfig({ ...triggerConfig, secret_key: e.target.value })
              }
              placeholder="Enter webhook secret for verification"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used to verify incoming webhook requests
            </p>
          </div>
        )

      default:
        return (
          <p className="text-sm text-muted-foreground">
            No additional configuration needed for this trigger type.
          </p>
        )
    }
  }

  // Render action config based on type
  const renderActionConfig = (action: ActionState) => {
    const config = action.action_config

    switch (action.action_type) {
      case 'create_task':
        return (
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input
                value={config.subject || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { subject: e.target.value })
                }
                placeholder="Task subject"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={config.description || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { description: e.target.value })
                }
                placeholder="Task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Task Type</Label>
                <Select
                  value={config.task_type || 'todo'}
                  onValueChange={(value) =>
                    updateActionConfig(action.id, { task_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="todo">To-Do</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={config.priority || 'medium'}
                  onValueChange={(value) =>
                    updateActionConfig(action.id, { priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due in (days)</Label>
                <Input
                  type="number"
                  value={config.due_days || 1}
                  onChange={(e) =>
                    updateActionConfig(action.id, { due_days: parseInt(e.target.value) || 1 })
                  }
                  min={0}
                />
              </div>
            </div>
          </div>
        )

      case 'update_field':
        return (
          <div className="space-y-4">
            <div>
              <Label>Field to Update</Label>
              <Select
                value={config.field_name || ''}
                onValueChange={(value) =>
                  updateActionConfig(action.id, { field_name: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {entityFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>New Value</Label>
              <Input
                value={config.field_value || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { field_value: e.target.value })
                }
                placeholder="Enter new value or use {{record.field}} placeholders"
              />
            </div>
          </div>
        )

      case 'send_notification':
        return (
          <div className="space-y-4">
            <div>
              <Label>Notification Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { title: e.target.value })
                }
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={config.message || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { message: e.target.value })
                }
                placeholder="Notification message"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.notify_owner ?? true}
                onCheckedChange={(checked) =>
                  updateActionConfig(action.id, { notify_owner: checked })
                }
              />
              <Label className="cursor-pointer">Notify record owner</Label>
            </div>
          </div>
        )

      case 'webhook_call':
        return (
          <div className="space-y-4">
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { url: e.target.value })
                }
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={config.method || 'POST'}
                onValueChange={(value: 'GET' | 'POST' | 'PUT') =>
                  updateActionConfig(action.id, { method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Body Template (JSON)</Label>
              <Textarea
                value={config.body_template || '{}'}
                onChange={(e) =>
                  updateActionConfig(action.id, { body_template: e.target.value })
                }
                placeholder='{"field": "{{record.name}}"}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
        )

      case 'send_email':
        return (
          <div className="space-y-4">
            <div>
              <Label>To Field</Label>
              <Select
                value={config.to_field || 'email'}
                onValueChange={(value) =>
                  updateActionConfig(action.id, { to_field: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Record Email</SelectItem>
                  <SelectItem value="owner_email">Owner Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={config.email_subject || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { email_subject: e.target.value })
                }
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                value={config.body || ''}
                onChange={(e) =>
                  updateActionConfig(action.id, { body: e.target.value })
                }
                placeholder="Email body - use {{record.field}} for placeholders"
                rows={5}
              />
            </div>
          </div>
        )

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Configuration for this action type is not yet available.
          </p>
        )
    }
  }

  const getActionLabel = (type: WorkflowActionType) => {
    return WORKFLOW_ACTION_TYPES.find(a => a.value === type)?.label || type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Edit Workflow' : 'Create Workflow'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? 'Modify your workflow configuration'
                : 'Build an automated workflow'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="workflow-active"
            />
            <Label htmlFor="workflow-active" className="cursor-pointer">
              {isActive ? 'Active' : 'Inactive'}
            </Label>
          </div>
          <Button variant="outline" onClick={() => navigate('/workflows')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name || actions.length === 0}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workflow name"
              />
            </div>
            <div>
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as WorkflowEntityType)}>
                <SelectTrigger id="entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={runOncePerRecord}
              onCheckedChange={setRunOncePerRecord}
              id="run-once"
            />
            <Label htmlFor="run-once" className="cursor-pointer">
              Only run once per record
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Builder Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="trigger" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Trigger
          </TabsTrigger>
          <TabsTrigger value="conditions" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Conditions
            {conditions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {conditions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Actions
            {actions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {actions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Trigger Tab */}
        <TabsContent value="trigger" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trigger</CardTitle>
              <CardDescription>
                Define when this workflow should run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Trigger Type</Label>
                <Select value={triggerType} onValueChange={(v) => handleTriggerTypeChange(v as WorkflowTriggerType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_TRIGGER_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              {renderTriggerConfig()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>
                Add conditions to control when the workflow runs (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {conditions.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No conditions defined. The workflow will run for all records.
                  </p>
                  <Button variant="outline" onClick={addCondition}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
              ) : (
                <>
                  {conditions.map((condition, index) => (
                    <div key={condition.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      {index > 0 && (
                        <Select
                          value={condition.logical_operator}
                          onValueChange={(v: 'AND' | 'OR') =>
                            updateCondition(condition.id, { logical_operator: v })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <Select
                          value={condition.field_name}
                          onValueChange={(v) =>
                            updateCondition(condition.id, { field_name: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {entityFields.map(field => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={condition.operator}
                          onValueChange={(v: WorkflowConditionOperator) =>
                            updateCondition(condition.id, { operator: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORKFLOW_CONDITION_OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!['is_null', 'is_not_null'].includes(condition.operator) && (
                          <Input
                            value={condition.field_value}
                            onChange={(e) =>
                              updateCondition(condition.id, { field_value: e.target.value })
                            }
                            placeholder="Value"
                          />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(condition.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addCondition}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Define what happens when the workflow runs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.length === 0 ? (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Add at least one action for this workflow to do something.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {actions.map((action, index) => (
                    <Collapsible
                      key={action.id}
                      open={expandedActions.has(action.id)}
                      onOpenChange={() => toggleActionExpanded(action.id)}
                    >
                      <div className="border rounded-lg">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center gap-4">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{index + 1}</Badge>
                              <span className="font-medium">
                                {getActionLabel(action.action_type)}
                              </span>
                              {action.delay_minutes > 0 && (
                                <Badge variant="secondary">
                                  Delay: {action.delay_minutes}min
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeAction(action.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              {expandedActions.has(action.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 pt-0 border-t space-y-4">
                            {renderActionConfig(action)}
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Delay (minutes)</Label>
                                <Input
                                  type="number"
                                  value={action.delay_minutes}
                                  onChange={(e) =>
                                    updateAction(action.id, {
                                      delay_minutes: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  min={0}
                                />
                              </div>
                              <div className="flex items-end">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={action.stop_on_error}
                                    onCheckedChange={(checked) =>
                                      updateAction(action.id, { stop_on_error: checked })
                                    }
                                  />
                                  <Label className="cursor-pointer">
                                    Stop workflow on error
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}

              <Separator />

              <div>
                <Label className="mb-2 block">Add Action</Label>
                <div className="grid grid-cols-4 gap-2">
                  {WORKFLOW_ACTION_TYPES.map(type => (
                    <Button
                      key={type.value}
                      variant="outline"
                      className="justify-start"
                      onClick={() => addAction(type.value)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
