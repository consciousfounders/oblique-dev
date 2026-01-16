// Workflow Service Types and Constants

import type {
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowEntityType,
  WorkflowTriggerConfig,
  WorkflowActionConfig,
} from '@/lib/supabase'

// Entity field definitions for condition/action building
export interface EntityField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'email' | 'phone' | 'boolean'
  options?: { value: string; label: string }[]
}

// Fields available for each entity type
export const ENTITY_FIELDS: Record<WorkflowEntityType, EntityField[]> = {
  lead: [
    { name: 'first_name', label: 'First Name', type: 'text' },
    { name: 'last_name', label: 'Last Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'phone' },
    { name: 'company', label: 'Company', type: 'text' },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'source', label: 'Source', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: [
      { value: 'new', label: 'New' },
      { value: 'contacted', label: 'Contacted' },
      { value: 'qualified', label: 'Qualified' },
      { value: 'unqualified', label: 'Unqualified' },
      { value: 'converted', label: 'Converted' },
    ]},
    { name: 'industry', label: 'Industry', type: 'text' },
    { name: 'company_size', label: 'Company Size', type: 'text' },
    { name: 'annual_revenue', label: 'Annual Revenue', type: 'text' },
    { name: 'score', label: 'Score', type: 'number' },
    { name: 'owner_id', label: 'Owner', type: 'text' },
  ],
  contact: [
    { name: 'first_name', label: 'First Name', type: 'text' },
    { name: 'last_name', label: 'Last Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'phone' },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'account_id', label: 'Account', type: 'text' },
    { name: 'owner_id', label: 'Owner', type: 'text' },
  ],
  deal: [
    { name: 'name', label: 'Deal Name', type: 'text' },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'stage_id', label: 'Stage', type: 'text' },
    { name: 'pipeline_id', label: 'Pipeline', type: 'text' },
    { name: 'probability', label: 'Probability', type: 'number' },
    { name: 'close_date', label: 'Close Date', type: 'date' },
    { name: 'deal_type', label: 'Deal Type', type: 'select', options: [
      { value: 'new_business', label: 'New Business' },
      { value: 'renewal', label: 'Renewal' },
      { value: 'upsell', label: 'Upsell' },
      { value: 'cross_sell', label: 'Cross Sell' },
    ]},
    { name: 'owner_id', label: 'Owner', type: 'text' },
    { name: 'account_id', label: 'Account', type: 'text' },
    { name: 'contact_id', label: 'Contact', type: 'text' },
  ],
  account: [
    { name: 'name', label: 'Account Name', type: 'text' },
    { name: 'domain', label: 'Domain', type: 'text' },
    { name: 'website', label: 'Website', type: 'text' },
    { name: 'industry', label: 'Industry', type: 'text' },
    { name: 'employee_count', label: 'Employee Count', type: 'text' },
    { name: 'annual_revenue', label: 'Annual Revenue', type: 'text' },
    { name: 'account_type', label: 'Account Type', type: 'select', options: [
      { value: 'prospect', label: 'Prospect' },
      { value: 'customer', label: 'Customer' },
      { value: 'partner', label: 'Partner' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'owner_id', label: 'Owner', type: 'text' },
    { name: 'billing_city', label: 'Billing City', type: 'text' },
    { name: 'billing_state', label: 'Billing State', type: 'text' },
    { name: 'billing_country', label: 'Billing Country', type: 'text' },
  ],
}

// Date fields for each entity type (for date-based triggers)
export const ENTITY_DATE_FIELDS: Record<WorkflowEntityType, EntityField[]> = {
  lead: [
    { name: 'created_at', label: 'Created Date', type: 'date' },
    { name: 'updated_at', label: 'Last Modified Date', type: 'date' },
    { name: 'last_activity_at', label: 'Last Activity Date', type: 'date' },
  ],
  contact: [
    { name: 'created_at', label: 'Created Date', type: 'date' },
    { name: 'updated_at', label: 'Last Modified Date', type: 'date' },
  ],
  deal: [
    { name: 'created_at', label: 'Created Date', type: 'date' },
    { name: 'updated_at', label: 'Last Modified Date', type: 'date' },
    { name: 'close_date', label: 'Close Date', type: 'date' },
  ],
  account: [
    { name: 'created_at', label: 'Created Date', type: 'date' },
    { name: 'updated_at', label: 'Last Modified Date', type: 'date' },
  ],
}

// Action config defaults
export const DEFAULT_ACTION_CONFIGS: Record<WorkflowActionType, Partial<WorkflowActionConfig>> = {
  create_task: {
    subject: '',
    description: '',
    task_type: 'todo',
    priority: 'medium',
    due_days: 1,
  },
  send_email: {
    email_subject: '',
    body: '',
    to_field: 'email',
  },
  update_field: {
    field_name: '',
    field_value: '',
  },
  assign_owner: {
    assignment_rule: 'round_robin',
  },
  send_notification: {
    title: '',
    message: '',
    notify_owner: true,
  },
  webhook_call: {
    url: '',
    method: 'POST',
    headers: {},
    body_template: '{}',
  },
  create_record: {
    record_entity_type: 'contact',
    field_mappings: {},
  },
}

// Trigger config defaults
export const DEFAULT_TRIGGER_CONFIGS: Record<WorkflowTriggerType, Partial<WorkflowTriggerConfig>> = {
  record_created: {},
  record_updated: {},
  field_changed: {
    field_name: '',
  },
  stage_changed: {},
  date_based: {
    date_field: 'created_at',
    offset_days: 0,
    offset_direction: 'after',
  },
  manual: {},
  webhook: {
    secret_key: '',
  },
}

// Placeholder tokens available in action configs
export const PLACEHOLDER_TOKENS = [
  { token: '{{record.id}}', label: 'Record ID', description: 'The ID of the triggering record' },
  { token: '{{record.name}}', label: 'Record Name', description: 'The name/title of the record' },
  { token: '{{record.email}}', label: 'Email', description: 'Email address if available' },
  { token: '{{record.owner_name}}', label: 'Owner Name', description: 'Name of the record owner' },
  { token: '{{record.owner_email}}', label: 'Owner Email', description: 'Email of the record owner' },
  { token: '{{current_user.name}}', label: 'Current User Name', description: 'Name of the user who triggered' },
  { token: '{{current_user.email}}', label: 'Current User Email', description: 'Email of the user who triggered' },
  { token: '{{today}}', label: 'Today', description: 'Current date' },
  { token: '{{now}}', label: 'Now', description: 'Current date and time' },
]
