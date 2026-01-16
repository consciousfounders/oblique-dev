// Webhook Event Service
// Triggers webhooks when CRM events occur (create, update, delete operations)

import { supabase } from '@/lib/supabase'
import type { WebhookEventType } from '@/lib/api/types'

export type EntityType = 'account' | 'contact' | 'lead' | 'deal' | 'campaign' | 'booking'
export type OperationType = 'create' | 'update' | 'delete'

export interface WebhookTriggerContext {
  tenantId: string
  userId?: string
  entityType: EntityType
  entityId: string
  operation: OperationType
  entity: Record<string, unknown>
  previousState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface WebhookConfig {
  id: string
  url: string
  secret: string
  events: string[]
  payload_template: Record<string, unknown> | null
  headers: Record<string, string>
  max_retries: number
  timeout_seconds: number
}

export interface WebhookPayload {
  id: string
  event: WebhookEventType
  created_at: string
  data: {
    entity_type: string
    entity_id: string
    entity: Record<string, unknown>
    previous_state?: Record<string, unknown>
    changes?: Record<string, { old: unknown; new: unknown }>
  }
  metadata?: Record<string, unknown>
}

// Map entity type and operation to webhook event type
function getEventType(entityType: EntityType, operation: OperationType, metadata?: Record<string, unknown>): WebhookEventType | null {
  // Handle special cases first
  if (metadata?.specialEvent) {
    return metadata.specialEvent as WebhookEventType
  }

  const eventMap: Record<string, WebhookEventType> = {
    // Accounts
    'account.create': 'account.created',
    'account.update': 'account.updated',
    'account.delete': 'account.deleted',

    // Contacts
    'contact.create': 'contact.created',
    'contact.update': 'contact.updated',
    'contact.delete': 'contact.deleted',

    // Leads
    'lead.create': 'lead.created',
    'lead.update': 'lead.updated',
    'lead.delete': 'lead.deleted',

    // Deals
    'deal.create': 'deal.created',
    'deal.update': 'deal.updated',
    'deal.delete': 'deal.deleted',

    // Campaigns
    'campaign.create': 'campaign.created',
    'campaign.update': 'campaign.updated',
    'campaign.delete': 'campaign.deleted',

    // Bookings
    'booking.create': 'booking.created',
    'booking.update': 'booking.confirmed', // Default, can be overridden
    'booking.delete': 'booking.cancelled',
  }

  const key = `${entityType}.${operation}`
  return eventMap[key] || null
}

// Calculate changes between old and new state
function calculateChanges(
  previousState: Record<string, unknown> | undefined,
  currentState: Record<string, unknown>
): Record<string, { old: unknown; new: unknown }> | undefined {
  if (!previousState) return undefined

  const changes: Record<string, { old: unknown; new: unknown }> = {}

  for (const key of Object.keys(currentState)) {
    const oldVal = previousState[key]
    const newVal = currentState[key]

    // Skip if values are equal
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue

    // Skip internal fields
    if (key.startsWith('_') || key === 'updated_at') continue

    changes[key] = { old: oldVal, new: newVal }
  }

  return Object.keys(changes).length > 0 ? changes : undefined
}

// Generate HMAC signature for webhook payload
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Apply custom payload template
function applyPayloadTemplate(
  template: Record<string, unknown> | null,
  payload: WebhookPayload
): Record<string, unknown> {
  if (!template) return payload as unknown as Record<string, unknown>

  // Simple template variable replacement
  const replaceVariables = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      // Replace {{variable}} patterns
      return obj.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
        const keys = path.trim().split('.')
        let value: unknown = payload
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key]
          } else {
            return ''
          }
        }
        return String(value ?? '')
      })
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceVariables)
    }
    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(obj)) {
        result[key] = replaceVariables(val)
      }
      return result
    }
    return obj
  }

  return replaceVariables(template) as Record<string, unknown>
}

export class WebhookEventService {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  // Main entry point: trigger webhooks for an entity event
  async triggerWebhooks(context: WebhookTriggerContext): Promise<void> {
    const eventType = getEventType(context.entityType, context.operation, context.metadata)
    if (!eventType) {
      console.warn(`No event type mapping for ${context.entityType}.${context.operation}`)
      return
    }

    // Get all active webhooks subscribed to this event
    const webhooks = await this.getWebhooksForEvent(eventType)
    if (webhooks.length === 0) return

    // Build the payload
    const payload = this.buildPayload(eventType, context)

    // Queue webhooks for delivery
    for (const webhook of webhooks) {
      await this.queueWebhookDelivery(webhook, eventType, payload)
    }
  }

  // Trigger a specific event type directly
  async triggerSpecificEvent(
    eventType: WebhookEventType,
    entityType: EntityType,
    entityId: string,
    entity: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const webhooks = await this.getWebhooksForEvent(eventType)
    if (webhooks.length === 0) return

    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: eventType,
      created_at: new Date().toISOString(),
      data: {
        entity_type: entityType,
        entity_id: entityId,
        entity,
      },
      metadata,
    }

    for (const webhook of webhooks) {
      await this.queueWebhookDelivery(webhook, eventType, payload)
    }
  }

  // Get webhooks subscribed to a specific event
  private async getWebhooksForEvent(eventType: WebhookEventType): Promise<WebhookConfig[]> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('id, url, secret, events, payload_template, headers, max_retries, timeout_seconds')
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .contains('events', [eventType])

    if (error) {
      console.error('Error fetching webhooks:', error)
      return []
    }

    return (data || []).map(w => ({
      ...w,
      headers: (w.headers as Record<string, string>) || {},
      payload_template: w.payload_template as Record<string, unknown> | null,
    }))
  }

  // Build webhook payload
  private buildPayload(eventType: WebhookEventType, context: WebhookTriggerContext): WebhookPayload {
    const changes = context.operation === 'update'
      ? calculateChanges(context.previousState, context.entity)
      : undefined

    return {
      id: crypto.randomUUID(),
      event: eventType,
      created_at: new Date().toISOString(),
      data: {
        entity_type: context.entityType,
        entity_id: context.entityId,
        entity: context.entity,
        previous_state: context.previousState,
        changes,
      },
      metadata: context.metadata,
    }
  }

  // Queue webhook for async delivery
  private async queueWebhookDelivery(
    webhook: WebhookConfig,
    eventType: WebhookEventType,
    payload: WebhookPayload
  ): Promise<void> {
    // Apply custom payload template if defined
    const finalPayload = applyPayloadTemplate(webhook.payload_template, payload)

    const { error } = await supabase
      .from('webhook_queue')
      .insert({
        tenant_id: this.tenantId,
        webhook_id: webhook.id,
        event_type: eventType,
        payload: finalPayload,
        status: 'pending',
        attempt_count: 0,
        max_attempts: webhook.max_retries + 1,
        next_attempt_at: new Date().toISOString(),
        priority: 5,
      })

    if (error) {
      console.error('Error queuing webhook:', error)
      // Fallback to immediate delivery
      await this.deliverWebhookImmediately(webhook, eventType, finalPayload)
    }
  }

  // Immediate delivery (fallback when queue fails)
  private async deliverWebhookImmediately(
    webhook: WebhookConfig,
    eventType: WebhookEventType,
    payload: Record<string, unknown>
  ): Promise<void> {
    const startTime = Date.now()
    const payloadString = JSON.stringify(payload)

    try {
      const signature = await generateSignature(payloadString, webhook.secret)
      const timestamp = Math.floor(Date.now() / 1000).toString()

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_seconds * 1000)

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Id': (payload as { id?: string }).id || crypto.randomUUID(),
            'X-Webhook-Event': eventType,
            ...webhook.headers,
          },
          body: payloadString,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const deliveryTime = Date.now() - startTime
        const responseBody = await response.text()

        // Record delivery
        await this.recordDelivery(
          webhook.id,
          eventType,
          payload,
          response.ok,
          response.status,
          responseBody,
          deliveryTime
        )

        // Update webhook status
        if (response.ok) {
          await this.updateWebhookSuccess(webhook.id)
        } else {
          await this.updateWebhookFailure(webhook.id)
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        throw fetchErr
      }
    } catch (err) {
      const deliveryTime = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      await this.recordDelivery(
        webhook.id,
        eventType,
        payload,
        false,
        null,
        errorMessage,
        deliveryTime
      )
      await this.updateWebhookFailure(webhook.id)
    }
  }

  // Record a delivery attempt
  private async recordDelivery(
    webhookId: string,
    eventType: string,
    payload: Record<string, unknown>,
    success: boolean,
    status: number | null,
    responseBody: string,
    deliveryTimeMs: number
  ): Promise<void> {
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload,
      success,
      response_status: status,
      response_body: responseBody?.substring(0, 10000),
      delivery_time_ms: deliveryTimeMs,
    })
  }

  // Update webhook on successful delivery
  private async updateWebhookSuccess(webhookId: string): Promise<void> {
    await supabase
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        failure_count: 0,
      })
      .eq('id', webhookId)
  }

  // Update webhook on failed delivery
  private async updateWebhookFailure(webhookId: string): Promise<void> {
    await supabase.rpc('increment_webhook_failure', { webhook_id: webhookId })
  }
}

// Factory function
export function createWebhookEventService(tenantId: string): WebhookEventService {
  return new WebhookEventService(tenantId)
}

// Convenience functions for triggering webhooks
export async function triggerEntityWebhook(
  tenantId: string,
  entityType: EntityType,
  entityId: string,
  operation: OperationType,
  entity: Record<string, unknown>,
  previousState?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<void> {
  const service = createWebhookEventService(tenantId)
  await service.triggerWebhooks({
    tenantId,
    entityType,
    entityId,
    operation,
    entity,
    previousState,
    metadata,
  })
}

// Specific event triggers for special cases
export async function triggerLeadConverted(
  tenantId: string,
  leadId: string,
  lead: Record<string, unknown>,
  convertedTo: { contactId?: string; accountId?: string; dealId?: string }
): Promise<void> {
  const service = createWebhookEventService(tenantId)
  await service.triggerSpecificEvent(
    'lead.converted',
    'lead',
    leadId,
    lead,
    { convertedTo }
  )
}

export async function triggerDealStageChanged(
  tenantId: string,
  dealId: string,
  deal: Record<string, unknown>,
  previousStage: string,
  newStage: string
): Promise<void> {
  const service = createWebhookEventService(tenantId)
  await service.triggerSpecificEvent(
    'deal.stage_changed',
    'deal',
    dealId,
    deal,
    { previousStage, newStage }
  )
}

export async function triggerDealWon(
  tenantId: string,
  dealId: string,
  deal: Record<string, unknown>
): Promise<void> {
  const service = createWebhookEventService(tenantId)
  await service.triggerSpecificEvent('deal.won', 'deal', dealId, deal)
}

export async function triggerDealLost(
  tenantId: string,
  dealId: string,
  deal: Record<string, unknown>
): Promise<void> {
  const service = createWebhookEventService(tenantId)
  await service.triggerSpecificEvent('deal.lost', 'deal', dealId, deal)
}
