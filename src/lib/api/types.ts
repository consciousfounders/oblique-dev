// API Types and Interfaces for the Oblique CRM REST API

// API Scopes define what operations an API key can perform
export type ApiScope =
  | 'accounts:read'
  | 'accounts:write'
  | 'contacts:read'
  | 'contacts:write'
  | 'leads:read'
  | 'leads:write'
  | 'deals:read'
  | 'deals:write'
  | 'campaigns:read'
  | 'campaigns:write'
  | 'activities:read'
  | 'activities:write'
  | 'users:read'
  | 'webhooks:manage'
  | 'api_keys:manage'

export const API_SCOPES: { scope: ApiScope; label: string; description: string }[] = [
  { scope: 'accounts:read', label: 'Read Accounts', description: 'View account records' },
  { scope: 'accounts:write', label: 'Write Accounts', description: 'Create, update, and delete accounts' },
  { scope: 'contacts:read', label: 'Read Contacts', description: 'View contact records' },
  { scope: 'contacts:write', label: 'Write Contacts', description: 'Create, update, and delete contacts' },
  { scope: 'leads:read', label: 'Read Leads', description: 'View lead records' },
  { scope: 'leads:write', label: 'Write Leads', description: 'Create, update, and delete leads' },
  { scope: 'deals:read', label: 'Read Deals', description: 'View deal records and stages' },
  { scope: 'deals:write', label: 'Write Deals', description: 'Create, update, and delete deals' },
  { scope: 'campaigns:read', label: 'Read Campaigns', description: 'View campaign records and members' },
  { scope: 'campaigns:write', label: 'Write Campaigns', description: 'Create, update, and delete campaigns' },
  { scope: 'activities:read', label: 'Read Activities', description: 'View activity logs' },
  { scope: 'activities:write', label: 'Write Activities', description: 'Create activity entries' },
  { scope: 'users:read', label: 'Read Users', description: 'View user information' },
  { scope: 'webhooks:manage', label: 'Manage Webhooks', description: 'Create and manage webhook subscriptions' },
  { scope: 'api_keys:manage', label: 'Manage API Keys', description: 'Create and revoke API keys' },
]

// Pagination parameters
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// Sorting parameters
export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// Filter operators for query building
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is'

export interface FilterParam {
  field: string
  operator: FilterOperator
  value: string | number | boolean | null | string[]
}

// Field selection (sparse fieldsets)
export interface FieldSelection {
  fields?: string[]
  expand?: string[] // Relationship expansion
}

// API Response wrapper
export interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    has_more?: boolean
  }
}

// API Error response
export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// Bulk operation request
export interface BulkCreateRequest<T> {
  records: T[]
}

export interface BulkUpdateRequest {
  ids: string[]
  data: Record<string, unknown>
}

export interface BulkDeleteRequest {
  ids: string[]
}

export interface BulkOperationResult {
  success_count: number
  failure_count: number
  errors?: { id: string; error: string }[]
}

// Entity metadata for describe endpoints
export interface EntityMetadata {
  name: string
  label: string
  plural_label: string
  description: string
  fields: FieldMetadata[]
  relationships: RelationshipMetadata[]
}

export interface FieldMetadata {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'uuid' | 'enum'
  required: boolean
  read_only: boolean
  nullable: boolean
  description?: string
  enum_values?: string[]
  max_length?: number
}

export interface RelationshipMetadata {
  name: string
  label: string
  target_entity: string
  type: 'belongs_to' | 'has_many' | 'has_one'
  foreign_key: string
}

// Webhook event types
export type WebhookEventType =
  | 'account.created'
  | 'account.updated'
  | 'account.deleted'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'lead.converted'
  | 'deal.created'
  | 'deal.updated'
  | 'deal.deleted'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'deal.lost'
  | 'campaign.created'
  | 'campaign.updated'
  | 'campaign.deleted'
  | 'campaign.activated'
  | 'campaign.completed'
  | 'campaign_member.added'
  | 'campaign_member.status_changed'
  | 'campaign_member.converted'

export const WEBHOOK_EVENTS: { event: WebhookEventType; label: string; description: string }[] = [
  { event: 'account.created', label: 'Account Created', description: 'Triggered when a new account is created' },
  { event: 'account.updated', label: 'Account Updated', description: 'Triggered when an account is updated' },
  { event: 'account.deleted', label: 'Account Deleted', description: 'Triggered when an account is deleted' },
  { event: 'contact.created', label: 'Contact Created', description: 'Triggered when a new contact is created' },
  { event: 'contact.updated', label: 'Contact Updated', description: 'Triggered when a contact is updated' },
  { event: 'contact.deleted', label: 'Contact Deleted', description: 'Triggered when a contact is deleted' },
  { event: 'lead.created', label: 'Lead Created', description: 'Triggered when a new lead is created' },
  { event: 'lead.updated', label: 'Lead Updated', description: 'Triggered when a lead is updated' },
  { event: 'lead.deleted', label: 'Lead Deleted', description: 'Triggered when a lead is deleted' },
  { event: 'lead.converted', label: 'Lead Converted', description: 'Triggered when a lead is converted to a contact' },
  { event: 'deal.created', label: 'Deal Created', description: 'Triggered when a new deal is created' },
  { event: 'deal.updated', label: 'Deal Updated', description: 'Triggered when a deal is updated' },
  { event: 'deal.deleted', label: 'Deal Deleted', description: 'Triggered when a deal is deleted' },
  { event: 'deal.stage_changed', label: 'Deal Stage Changed', description: 'Triggered when a deal moves to a new stage' },
  { event: 'deal.won', label: 'Deal Won', description: 'Triggered when a deal is marked as won' },
  { event: 'deal.lost', label: 'Deal Lost', description: 'Triggered when a deal is marked as lost' },
  { event: 'campaign.created', label: 'Campaign Created', description: 'Triggered when a new campaign is created' },
  { event: 'campaign.updated', label: 'Campaign Updated', description: 'Triggered when a campaign is updated' },
  { event: 'campaign.deleted', label: 'Campaign Deleted', description: 'Triggered when a campaign is deleted' },
  { event: 'campaign.activated', label: 'Campaign Activated', description: 'Triggered when a campaign is activated' },
  { event: 'campaign.completed', label: 'Campaign Completed', description: 'Triggered when a campaign is marked as completed' },
  { event: 'campaign_member.added', label: 'Campaign Member Added', description: 'Triggered when a lead/contact is added to a campaign' },
  { event: 'campaign_member.status_changed', label: 'Campaign Member Status Changed', description: 'Triggered when a campaign member status changes' },
  { event: 'campaign_member.converted', label: 'Campaign Member Converted', description: 'Triggered when a campaign member converts' },
]

// Rate limit info returned in headers
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number // Unix timestamp
}

// API Key creation request
export interface CreateApiKeyRequest {
  name: string
  scopes: ApiScope[]
  rate_limit_per_minute?: number
  rate_limit_per_day?: number
  expires_at?: string
}

// API Key response (excludes the actual key after creation)
export interface ApiKeyResponse {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  rate_limit_per_minute: number
  rate_limit_per_day: number
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

// Full API key response (only returned on creation)
export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string // The actual API key, only shown once
}

// Webhook creation request
export interface CreateWebhookRequest {
  name: string
  url: string
  events: WebhookEventType[]
}

// Webhook response
export interface WebhookResponse {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  last_triggered_at: string | null
  failure_count: number
  created_at: string
}

// API Usage statistics
export interface ApiUsageStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  avg_response_time_ms: number
  requests_by_endpoint: Record<string, number>
  requests_by_day: { date: string; count: number }[]
}
