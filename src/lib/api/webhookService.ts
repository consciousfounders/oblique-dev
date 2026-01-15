// Webhook Management Service
// Handles creation, delivery, and management of webhook subscriptions

import { supabase } from '@/lib/supabase'
import type { WebhookEventType, CreateWebhookRequest, WebhookResponse } from './types'

// Generate a webhook secret for HMAC signature verification
function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const secretLength = 32
  const randomValues = new Uint8Array(secretLength)
  crypto.getRandomValues(randomValues)

  let secret = 'whsec_' // Prefix for webhook secrets
  for (let i = 0; i < secretLength; i++) {
    secret += chars[randomValues[i] % chars.length]
  }
  return secret
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

// Webhook payload structure
export interface WebhookPayload {
  id: string
  event: WebhookEventType
  created_at: string
  data: {
    entity_type: string
    entity_id: string
    entity: Record<string, unknown>
    previous_state?: Record<string, unknown>
  }
}

// Webhook delivery result
export interface WebhookDeliveryResult {
  webhookId: string
  success: boolean
  statusCode?: number
  responseBody?: string
  deliveryTimeMs?: number
  error?: string
}

// Webhook Service
export const webhookService = {
  // Create a new webhook subscription
  async createWebhook(
    request: CreateWebhookRequest,
    userId: string,
    tenantId: string
  ): Promise<{ data: WebhookResponse & { secret: string } | null; error: string | null }> {
    try {
      const secret = generateWebhookSecret()

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          name: request.name,
          url: request.url,
          events: request.events,
          secret: secret,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: {
          id: data.id,
          name: data.name,
          url: data.url,
          events: data.events,
          is_active: data.is_active,
          last_triggered_at: data.last_triggered_at,
          failure_count: data.failure_count,
          created_at: data.created_at,
          secret: secret, // Only returned on creation
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // List all webhooks for a tenant
  async listWebhooks(tenantId: string): Promise<{ data: WebhookResponse[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, name, url, events, is_active, last_triggered_at, failure_count, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Get a specific webhook
  async getWebhook(webhookId: string): Promise<{ data: WebhookResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, name, url, events, is_active, last_triggered_at, failure_count, created_at')
        .eq('id', webhookId)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Update a webhook
  async updateWebhook(
    webhookId: string,
    updates: {
      name?: string
      url?: string
      events?: WebhookEventType[]
      is_active?: boolean
    }
  ): Promise<{ data: WebhookResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .update(updates)
        .eq('id', webhookId)
        .select('id, name, url, events, is_active, last_triggered_at, failure_count, created_at')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Delete a webhook
  async deleteWebhook(webhookId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', webhookId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Toggle webhook active status
  async toggleWebhookActive(webhookId: string, isActive: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: isActive, failure_count: isActive ? 0 : undefined })
        .eq('id', webhookId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Get webhooks subscribed to a specific event
  async getWebhooksForEvent(
    tenantId: string,
    event: WebhookEventType
  ): Promise<{ data: { id: string; url: string; secret: string }[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, url, secret, events')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .contains('events', [event])

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: data.map(w => ({ id: w.id, url: w.url, secret: w.secret })),
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Deliver a webhook payload (client-side simulation for demo purposes)
  // In production, this would be handled by a server-side function or edge function
  async deliverWebhook(
    webhook: { id: string; url: string; secret: string },
    payload: WebhookPayload
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now()

    try {
      const payloadString = JSON.stringify(payload)
      const signature = await generateSignature(payloadString, webhook.secret)
      const timestamp = Math.floor(Date.now() / 1000).toString()

      // Note: In a real implementation, this would be done server-side
      // to avoid CORS issues and keep the webhook secret secure
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Id': payload.id,
        },
        body: payloadString,
      })

      const deliveryTimeMs = Date.now() - startTime
      const responseBody = await response.text()

      // Record delivery
      await this.recordDelivery(webhook.id, payload.event, payload, {
        success: response.ok,
        statusCode: response.status,
        responseBody,
        deliveryTimeMs,
      })

      // Update webhook last_triggered_at and failure_count
      if (response.ok) {
        await supabase
          .from('webhooks')
          .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
          .eq('id', webhook.id)
      } else {
        await supabase.rpc('increment_webhook_failure', { webhook_id: webhook.id })
      }

      return {
        webhookId: webhook.id,
        success: response.ok,
        statusCode: response.status,
        responseBody,
        deliveryTimeMs,
      }
    } catch (err) {
      const deliveryTimeMs = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Record failed delivery
      await this.recordDelivery(webhook.id, payload.event, payload, {
        success: false,
        error: errorMessage,
        deliveryTimeMs,
      })

      return {
        webhookId: webhook.id,
        success: false,
        deliveryTimeMs,
        error: errorMessage,
      }
    }
  },

  // Record a webhook delivery attempt
  async recordDelivery(
    webhookId: string,
    eventType: WebhookEventType,
    payload: WebhookPayload,
    result: {
      success: boolean
      statusCode?: number
      responseBody?: string
      deliveryTimeMs?: number
      error?: string
    }
  ): Promise<void> {
    try {
      await supabase.from('webhook_deliveries').insert({
        webhook_id: webhookId,
        event_type: eventType,
        payload: payload,
        response_status: result.statusCode,
        response_body: result.responseBody || result.error,
        delivery_time_ms: result.deliveryTimeMs,
        success: result.success,
      })
    } catch (err) {
      console.error('Failed to record webhook delivery:', err)
    }
  },

  // Get webhook delivery history
  async getDeliveryHistory(
    webhookId: string,
    limit: number = 50
  ): Promise<{
    data: {
      id: string
      event_type: string
      success: boolean
      response_status: number | null
      delivery_time_ms: number | null
      retry_count: number
      created_at: string
    }[] | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('id, event_type, success, response_status, delivery_time_ms, retry_count, created_at')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Regenerate webhook secret
  async regenerateSecret(webhookId: string): Promise<{ secret: string | null; error: string | null }> {
    try {
      const newSecret = generateWebhookSecret()

      const { error } = await supabase
        .from('webhooks')
        .update({ secret: newSecret })
        .eq('id', webhookId)

      if (error) {
        return { secret: null, error: error.message }
      }

      return { secret: newSecret, error: null }
    } catch (err) {
      return { secret: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Test a webhook endpoint
  async testWebhook(webhookId: string): Promise<WebhookDeliveryResult> {
    try {
      // Get webhook details
      const { data: webhook, error } = await supabase
        .from('webhooks')
        .select('id, url, secret')
        .eq('id', webhookId)
        .single()

      if (error || !webhook) {
        return {
          webhookId,
          success: false,
          error: 'Webhook not found',
        }
      }

      // Create test payload
      const testPayload: WebhookPayload = {
        id: crypto.randomUUID(),
        event: 'account.created' as WebhookEventType,
        created_at: new Date().toISOString(),
        data: {
          entity_type: 'account',
          entity_id: 'test-' + crypto.randomUUID().substring(0, 8),
          entity: {
            id: 'test-id',
            name: 'Test Account',
            domain: 'test.example.com',
            industry: 'Technology',
            _test: true,
          },
        },
      }

      return await this.deliverWebhook(webhook, testPayload)
    } catch (err) {
      return {
        webhookId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  },
}
