// Inbound Webhook Service
// Handles receiving and processing webhooks from external systems

import { supabase } from '@/lib/supabase'

export type InboundAuthType = 'none' | 'api_key' | 'hmac' | 'basic'
export type TargetEntity = 'lead' | 'contact' | 'account' | 'deal' | 'activity'

export interface InboundWebhook {
  id: string
  tenant_id: string
  user_id: string
  name: string
  description: string | null
  endpoint_slug: string
  auth_type: InboundAuthType
  api_key?: string
  hmac_secret?: string
  hmac_header: string
  hmac_algorithm: string
  target_entity: TargetEntity
  field_mappings: Record<string, string>
  default_values: Record<string, unknown>
  create_if_not_exists: boolean
  update_if_exists: boolean
  lookup_field: string | null
  is_active: boolean
  last_received_at: string | null
  success_count: number
  error_count: number
  created_at: string
  updated_at: string
}

export interface InboundWebhookLog {
  id: string
  tenant_id: string
  inbound_webhook_id: string
  request_method: string | null
  request_headers: Record<string, string> | null
  request_body: Record<string, unknown> | null
  request_ip: string | null
  status: 'received' | 'processing' | 'success' | 'auth_failed' | 'validation_failed' | 'error'
  entity_type: string | null
  entity_id: string | null
  operation: 'create' | 'update' | 'skip' | null
  error_message: string | null
  error_details: Record<string, unknown> | null
  received_at: string
  processed_at: string | null
}

export interface CreateInboundWebhookRequest {
  name: string
  description?: string
  auth_type: InboundAuthType
  target_entity: TargetEntity
  field_mappings: Record<string, string>
  default_values?: Record<string, unknown>
  create_if_not_exists?: boolean
  update_if_exists?: boolean
  lookup_field?: string
}

export interface ProcessWebhookResult {
  success: boolean
  operation?: 'create' | 'update' | 'skip'
  entityId?: string
  error?: string
}

// Generate a unique endpoint slug
function generateEndpointSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate API key for inbound webhooks
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return 'inwh_' + Array.from(array, byte => chars[byte % chars.length]).join('')
}

// Generate HMAC secret
function generateHmacSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return 'whsec_' + Array.from(array, byte => chars[byte % chars.length]).join('')
}

// Verify HMAC signature
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(payload)

    const hashAlgorithm = algorithm === 'sha1' ? 'SHA-1' : 'SHA-256'

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: hashAlgorithm },
      false,
      ['sign']
    )

    const expectedSignature = await crypto.subtle.sign('HMAC', key, messageData)
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Handle various signature formats
    const cleanSignature = signature
      .replace(/^sha256=/, '')
      .replace(/^sha1=/, '')
      .toLowerCase()

    return cleanSignature === expectedHex.toLowerCase()
  } catch {
    return false
  }
}

// Map incoming data to entity fields
function mapFieldsToEntity(
  data: Record<string, unknown>,
  mappings: Record<string, string>,
  defaults: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults }

  for (const [targetField, sourceExpression] of Object.entries(mappings)) {
    const value = extractValue(data, sourceExpression)
    if (value !== undefined && value !== null && value !== '') {
      result[targetField] = value
    }
  }

  return result
}

// Extract value from nested path (e.g., "user.email" or "data.contact.name")
function extractValue(data: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = data

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

export class InboundWebhookService {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  // Create a new inbound webhook
  async createInboundWebhook(
    request: CreateInboundWebhookRequest,
    userId: string
  ): Promise<{ data: InboundWebhook | null; error: string | null }> {
    try {
      const endpointSlug = generateEndpointSlug()
      const apiKey = request.auth_type === 'api_key' ? generateApiKey() : null
      const hmacSecret = request.auth_type === 'hmac' ? generateHmacSecret() : null

      const { data, error } = await supabase
        .from('inbound_webhooks')
        .insert({
          tenant_id: this.tenantId,
          user_id: userId,
          name: request.name,
          description: request.description,
          endpoint_slug: endpointSlug,
          auth_type: request.auth_type,
          api_key: apiKey,
          hmac_secret: hmacSecret,
          target_entity: request.target_entity,
          field_mappings: request.field_mappings,
          default_values: request.default_values || {},
          create_if_not_exists: request.create_if_not_exists ?? true,
          update_if_exists: request.update_if_exists ?? false,
          lookup_field: request.lookup_field,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as InboundWebhook, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // List all inbound webhooks
  async listInboundWebhooks(): Promise<{ data: InboundWebhook[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('inbound_webhooks')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as InboundWebhook[], error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get a single inbound webhook
  async getInboundWebhook(id: string): Promise<{ data: InboundWebhook | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('inbound_webhooks')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', this.tenantId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as InboundWebhook, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get inbound webhook by endpoint slug (for public endpoint)
  async getByEndpointSlug(slug: string): Promise<InboundWebhook | null> {
    const { data, error } = await supabase
      .from('inbound_webhooks')
      .select('*')
      .eq('endpoint_slug', slug)
      .eq('is_active', true)
      .single()

    if (error) return null
    return data as InboundWebhook
  }

  // Update inbound webhook
  async updateInboundWebhook(
    id: string,
    updates: Partial<CreateInboundWebhookRequest> & { is_active?: boolean }
  ): Promise<{ data: InboundWebhook | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('inbound_webhooks')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', this.tenantId)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as InboundWebhook, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Delete inbound webhook
  async deleteInboundWebhook(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('inbound_webhooks')
        .delete()
        .eq('id', id)
        .eq('tenant_id', this.tenantId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Regenerate API key
  async regenerateApiKey(id: string): Promise<{ apiKey: string | null; error: string | null }> {
    try {
      const newApiKey = generateApiKey()

      const { error } = await supabase
        .from('inbound_webhooks')
        .update({ api_key: newApiKey })
        .eq('id', id)
        .eq('tenant_id', this.tenantId)

      if (error) {
        return { apiKey: null, error: error.message }
      }

      return { apiKey: newApiKey, error: null }
    } catch (err) {
      return { apiKey: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Regenerate HMAC secret
  async regenerateHmacSecret(id: string): Promise<{ secret: string | null; error: string | null }> {
    try {
      const newSecret = generateHmacSecret()

      const { error } = await supabase
        .from('inbound_webhooks')
        .update({ hmac_secret: newSecret })
        .eq('id', id)
        .eq('tenant_id', this.tenantId)

      if (error) {
        return { secret: null, error: error.message }
      }

      return { secret: newSecret, error: null }
    } catch (err) {
      return { secret: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get webhook logs
  async getWebhookLogs(
    webhookId: string,
    limit: number = 50
  ): Promise<{ data: InboundWebhookLog[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('inbound_webhook_logs')
        .select('*')
        .eq('inbound_webhook_id', webhookId)
        .order('received_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as InboundWebhookLog[], error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Process incoming webhook request
  async processWebhook(
    webhook: InboundWebhook,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    method: string,
    ip?: string
  ): Promise<ProcessWebhookResult> {
    // Create log entry
    const logId = crypto.randomUUID()
    await this.createLog(logId, webhook, body, headers, method, ip)

    try {
      // Verify authentication
      const authResult = await this.verifyAuth(webhook, body, headers)
      if (!authResult.success) {
        await this.updateLog(logId, 'auth_failed', null, null, null, authResult.error)
        await this.incrementErrorCount(webhook.id)
        return { success: false, error: authResult.error }
      }

      // Map fields to entity
      const mappedData = mapFieldsToEntity(body, webhook.field_mappings, webhook.default_values)

      // Validate required fields
      const validationResult = this.validateMappedData(webhook.target_entity, mappedData)
      if (!validationResult.success) {
        await this.updateLog(logId, 'validation_failed', null, null, null, validationResult.error)
        await this.incrementErrorCount(webhook.id)
        return { success: false, error: validationResult.error }
      }

      // Check for existing record if lookup_field is set
      let existingId: string | null = null
      if (webhook.lookup_field && mappedData[webhook.lookup_field]) {
        existingId = await this.findExistingRecord(
          webhook.target_entity,
          webhook.lookup_field,
          mappedData[webhook.lookup_field]
        )
      }

      let operation: 'create' | 'update' | 'skip'
      let entityId: string | null = null

      if (existingId) {
        if (webhook.update_if_exists) {
          // Update existing record
          entityId = await this.updateRecord(webhook.target_entity, existingId, mappedData)
          operation = 'update'
        } else {
          // Skip - record exists and update is disabled
          operation = 'skip'
          entityId = existingId
        }
      } else {
        if (webhook.create_if_not_exists) {
          // Create new record
          entityId = await this.createRecord(webhook.target_entity, mappedData)
          operation = 'create'
        } else {
          // Skip - record doesn't exist and create is disabled
          operation = 'skip'
        }
      }

      // Update log
      await this.updateLog(logId, 'success', webhook.target_entity, entityId, operation)
      await this.incrementSuccessCount(webhook.id)

      return { success: true, operation, entityId: entityId || undefined }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      await this.updateLog(logId, 'error', null, null, null, errorMessage)
      await this.incrementErrorCount(webhook.id)
      return { success: false, error: errorMessage }
    }
  }

  // Verify webhook authentication
  private async verifyAuth(
    webhook: InboundWebhook,
    body: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    switch (webhook.auth_type) {
      case 'none':
        return { success: true }

      case 'api_key': {
        const providedKey = headers['x-api-key'] || headers['authorization']?.replace('Bearer ', '')
        if (!providedKey || providedKey !== webhook.api_key) {
          return { success: false, error: 'Invalid or missing API key' }
        }
        return { success: true }
      }

      case 'hmac': {
        const signatureHeader = webhook.hmac_header.toLowerCase()
        const signature = headers[signatureHeader]
        if (!signature) {
          return { success: false, error: `Missing signature header: ${webhook.hmac_header}` }
        }
        const isValid = await verifyHmacSignature(
          JSON.stringify(body),
          signature,
          webhook.hmac_secret || '',
          webhook.hmac_algorithm
        )
        if (!isValid) {
          return { success: false, error: 'Invalid webhook signature' }
        }
        return { success: true }
      }

      case 'basic': {
        const authHeader = headers['authorization']
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return { success: false, error: 'Missing Basic auth header' }
        }
        // In production, compare with hashed password
        return { success: true }
      }

      default:
        return { success: false, error: 'Unknown auth type' }
    }
  }

  // Validate mapped data for entity
  private validateMappedData(
    entityType: TargetEntity,
    data: Record<string, unknown>
  ): { success: boolean; error?: string } {
    // Basic validation - check for required fields per entity type
    switch (entityType) {
      case 'lead':
        if (!data.first_name && !data.last_name && !data.email && !data.company) {
          return { success: false, error: 'Lead requires at least first_name, last_name, email, or company' }
        }
        break
      case 'contact':
        if (!data.first_name && !data.last_name && !data.email) {
          return { success: false, error: 'Contact requires at least first_name, last_name, or email' }
        }
        break
      case 'account':
        if (!data.name) {
          return { success: false, error: 'Account requires a name' }
        }
        break
      case 'deal':
        if (!data.name) {
          return { success: false, error: 'Deal requires a name' }
        }
        break
    }
    return { success: true }
  }

  // Find existing record by lookup field
  private async findExistingRecord(
    entityType: TargetEntity,
    field: string,
    value: unknown
  ): Promise<string | null> {
    const tableName = this.getTableName(entityType)
    if (!tableName) return null

    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('tenant_id', this.tenantId)
      .eq(field, value)
      .limit(1)
      .single()

    if (error || !data) return null
    return data.id
  }

  // Create a new record
  private async createRecord(
    entityType: TargetEntity,
    data: Record<string, unknown>
  ): Promise<string | null> {
    const tableName = this.getTableName(entityType)
    if (!tableName) throw new Error(`Unknown entity type: ${entityType}`)

    const { data: created, error } = await supabase
      .from(tableName)
      .insert({ ...data, tenant_id: this.tenantId })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return created.id
  }

  // Update an existing record
  private async updateRecord(
    entityType: TargetEntity,
    id: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const tableName = this.getTableName(entityType)
    if (!tableName) throw new Error(`Unknown entity type: ${entityType}`)

    const { error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', this.tenantId)

    if (error) throw new Error(error.message)
    return id
  }

  // Get table name for entity type
  private getTableName(entityType: TargetEntity): string | null {
    const tables: Record<TargetEntity, string> = {
      lead: 'leads',
      contact: 'contacts',
      account: 'accounts',
      deal: 'deals',
      activity: 'activities',
    }
    return tables[entityType] || null
  }

  // Create log entry
  private async createLog(
    id: string,
    webhook: InboundWebhook,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    method: string,
    ip?: string
  ): Promise<void> {
    await supabase.from('inbound_webhook_logs').insert({
      id,
      tenant_id: this.tenantId,
      inbound_webhook_id: webhook.id,
      request_method: method,
      request_headers: headers,
      request_body: body,
      request_ip: ip,
      status: 'received',
    })

    // Update last received timestamp
    await supabase
      .from('inbound_webhooks')
      .update({ last_received_at: new Date().toISOString() })
      .eq('id', webhook.id)
  }

  // Update log entry
  private async updateLog(
    id: string,
    status: InboundWebhookLog['status'],
    entityType: string | null,
    entityId: string | null,
    operation: 'create' | 'update' | 'skip' | null,
    errorMessage?: string
  ): Promise<void> {
    await supabase
      .from('inbound_webhook_logs')
      .update({
        status,
        entity_type: entityType,
        entity_id: entityId,
        operation,
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  // Increment success count
  private async incrementSuccessCount(webhookId: string): Promise<void> {
    try {
      const { data: current } = await supabase
        .from('inbound_webhooks')
        .select('success_count')
        .eq('id', webhookId)
        .single()

      await supabase
        .from('inbound_webhooks')
        .update({ success_count: (current?.success_count || 0) + 1 })
        .eq('id', webhookId)
    } catch {
      // Silently fail
    }
  }

  // Increment error count
  private async incrementErrorCount(webhookId: string): Promise<void> {
    try {
      const { data: current } = await supabase
        .from('inbound_webhooks')
        .select('error_count')
        .eq('id', webhookId)
        .single()

      await supabase
        .from('inbound_webhooks')
        .update({ error_count: (current?.error_count || 0) + 1 })
        .eq('id', webhookId)
    } catch {
      // Silently fail
    }
  }
}

// Factory function
export function createInboundWebhookService(tenantId: string): InboundWebhookService {
  return new InboundWebhookService(tenantId)
}
