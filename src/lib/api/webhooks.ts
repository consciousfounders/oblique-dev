// Webhook Management Service
// Handles creation, management, and testing of webhook subscriptions

import { supabase } from '@/lib/supabase'
import type { WebhookResponse, CreateWebhookRequest } from './types'

// Generate a secure webhook secret
function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return 'whsec_' + Array.from(array, byte => chars[byte % chars.length]).join('')
}

export interface WebhookWithSecret extends WebhookResponse {
  secret?: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  delivery_time_ms: number | null
  success: boolean
  retry_count: number
  created_at: string
}

export class WebhookService {
  // Create a new webhook subscription
  async createWebhook(
    request: CreateWebhookRequest,
    tenantId: string,
    userId: string
  ): Promise<{ data: WebhookWithSecret | null; error: string | null }> {
    try {
      const secret = generateWebhookSecret()

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          name: request.name,
          url: request.url,
          secret: secret,
          events: request.events,
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
          secret: secret, // Only returned on creation
          events: data.events,
          is_active: data.is_active,
          last_triggered_at: data.last_triggered_at,
          failure_count: data.failure_count,
          created_at: data.created_at,
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // List all webhooks for the current tenant
  async listWebhooks(): Promise<{ data: WebhookResponse[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: data.map(webhook => ({
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          is_active: webhook.is_active,
          last_triggered_at: webhook.last_triggered_at,
          failure_count: webhook.failure_count,
          created_at: webhook.created_at,
        })),
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get a single webhook by ID
  async getWebhook(id: string): Promise<{ data: WebhookResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', id)
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
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Update a webhook
  async updateWebhook(
    id: string,
    updates: Partial<Pick<CreateWebhookRequest, 'name' | 'url' | 'events'> & { is_active: boolean }>
  ): Promise<{ data: WebhookResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .update(updates)
        .eq('id', id)
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
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Toggle webhook active status
  async toggleWebhook(id: string, isActive: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: isActive, failure_count: isActive ? 0 : undefined })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Delete a webhook
  async deleteWebhook(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Regenerate webhook secret
  async regenerateSecret(id: string): Promise<{ data: { secret: string } | null; error: string | null }> {
    try {
      const newSecret = generateWebhookSecret()

      const { error } = await supabase
        .from('webhooks')
        .update({ secret: newSecret })
        .eq('id', id)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: { secret: newSecret }, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get webhook deliveries (recent delivery log)
  async getDeliveries(
    webhookId: string,
    limit: number = 50
  ): Promise<{ data: WebhookDelivery[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as WebhookDelivery[], error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Test a webhook by sending a test event
  async testWebhook(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: webhook, error: fetchError } = await supabase
        .from('webhooks')
        .select('url, secret')
        .eq('id', id)
        .single()

      if (fetchError || !webhook) {
        return { success: false, error: 'Webhook not found' }
      }

      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook delivery from Oblique CRM',
        },
      }

      // Create HMAC signature
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhook.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(JSON.stringify(testPayload))
      )
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const startTime = Date.now()

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signatureHex}`,
            'X-Webhook-Event': 'test',
          },
          body: JSON.stringify(testPayload),
        })

        const deliveryTime = Date.now() - startTime
        const responseBody = await response.text()

        // Log the delivery
        await supabase.from('webhook_deliveries').insert({
          webhook_id: id,
          event_type: 'test',
          payload: testPayload,
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          delivery_time_ms: deliveryTime,
          success: response.ok,
        })

        if (!response.ok) {
          return { success: false, error: `HTTP ${response.status}: ${responseBody.substring(0, 200)}` }
        }

        return { success: true, error: null }
      } catch (fetchErr) {
        // Log the failed delivery
        await supabase.from('webhook_deliveries').insert({
          webhook_id: id,
          event_type: 'test',
          payload: testPayload,
          response_status: null,
          response_body: fetchErr instanceof Error ? fetchErr.message : 'Unknown error',
          delivery_time_ms: Date.now() - startTime,
          success: false,
        })

        return {
          success: false,
          error: fetchErr instanceof Error ? fetchErr.message : 'Failed to deliver webhook',
        }
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService()
