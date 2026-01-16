// Webhook Queue Processor
// Handles async webhook delivery with retry logic

import { supabase } from '@/lib/supabase'

interface QueuedWebhook {
  id: string
  tenant_id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  attempt_count: number
  max_attempts: number
}

interface WebhookDetails {
  url: string
  secret: string
  headers: Record<string, string>
  timeout_seconds: number
  retry_delay_seconds: number
}

// Generate HMAC signature
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

export interface ProcessorResult {
  processed: number
  succeeded: number
  failed: number
  retried: number
}

export class WebhookQueueProcessor {
  private batchSize: number
  private isProcessing: boolean = false

  constructor(batchSize: number = 10) {
    this.batchSize = batchSize
  }

  // Process a batch of queued webhooks
  async processBatch(): Promise<ProcessorResult> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0, retried: 0 }
    }

    this.isProcessing = true
    const result: ProcessorResult = { processed: 0, succeeded: 0, failed: 0, retried: 0 }

    try {
      // Get pending webhooks using the database function
      const { data: queuedItems, error } = await supabase.rpc('get_pending_webhooks', {
        batch_size: this.batchSize,
      })

      if (error) {
        console.error('Error fetching queued webhooks:', error)
        return result
      }

      if (!queuedItems || queuedItems.length === 0) {
        return result
      }

      // Process each webhook
      for (const item of queuedItems as QueuedWebhook[]) {
        result.processed++
        const deliveryResult = await this.deliverWebhook(item)

        if (deliveryResult.success) {
          result.succeeded++
        } else if (deliveryResult.shouldRetry) {
          result.retried++
        } else {
          result.failed++
        }
      }
    } finally {
      this.isProcessing = false
    }

    return result
  }

  // Deliver a single webhook
  private async deliverWebhook(item: QueuedWebhook): Promise<{ success: boolean; shouldRetry: boolean }> {
    // Get webhook details
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('url, secret, headers, timeout_seconds, retry_delay_seconds')
      .eq('id', item.webhook_id)
      .single()

    if (webhookError || !webhook) {
      // Webhook was deleted, mark as dead letter
      await this.markDeadLetter(item.id, 'Webhook configuration not found')
      return { success: false, shouldRetry: false }
    }

    const webhookDetails = webhook as WebhookDetails
    const startTime = Date.now()
    const payloadString = JSON.stringify(item.payload)

    try {
      const signature = await generateSignature(payloadString, webhookDetails.secret)
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const deliveryId = (item.payload as { id?: string }).id || crypto.randomUUID()

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        (webhookDetails.timeout_seconds || 30) * 1000
      )

      try {
        const response = await fetch(webhookDetails.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Id': deliveryId,
            'X-Webhook-Event': item.event_type,
            'X-Webhook-Retry-Count': item.attempt_count.toString(),
            ...(webhookDetails.headers || {}),
          },
          body: payloadString,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const deliveryTime = Date.now() - startTime
        const responseBody = await response.text()

        // Record delivery attempt
        await this.recordDelivery(
          item.webhook_id,
          item.event_type,
          item.payload,
          response.ok,
          response.status,
          responseBody,
          deliveryTime,
          item.attempt_count + 1
        )

        if (response.ok) {
          // Success - mark as completed
          await this.markCompleted(item.id, response.status, responseBody)
          await this.updateWebhookSuccess(item.webhook_id)
          return { success: true, shouldRetry: false }
        } else {
          // HTTP error - retry if possible
          const shouldRetry = item.attempt_count + 1 < item.max_attempts
          if (shouldRetry) {
            await this.scheduleRetry(
              item.id,
              `HTTP ${response.status}: ${responseBody.substring(0, 500)}`,
              response.status,
              responseBody
            )
          } else {
            await this.markDeadLetter(
              item.id,
              `HTTP ${response.status}: ${responseBody.substring(0, 500)}`,
              response.status,
              responseBody
            )
            await this.updateWebhookFailure(item.webhook_id)
          }
          return { success: false, shouldRetry }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        throw fetchErr
      }
    } catch (err) {
      const deliveryTime = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Record failed delivery
      await this.recordDelivery(
        item.webhook_id,
        item.event_type,
        item.payload,
        false,
        null,
        errorMessage,
        deliveryTime,
        item.attempt_count + 1
      )

      // Retry if possible
      const shouldRetry = item.attempt_count + 1 < item.max_attempts
      if (shouldRetry) {
        await this.scheduleRetry(item.id, errorMessage)
      } else {
        await this.markDeadLetter(item.id, errorMessage)
        await this.updateWebhookFailure(item.webhook_id)
      }

      return { success: false, shouldRetry }
    }
  }

  // Mark webhook as completed
  private async markCompleted(queueId: string, status: number, responseBody: string): Promise<void> {
    await supabase.rpc('complete_webhook_delivery', {
      queue_id: queueId,
      response_status: status,
      response_body: responseBody?.substring(0, 10000),
    })
  }

  // Schedule a retry
  private async scheduleRetry(
    queueId: string,
    errorMessage: string,
    status?: number,
    responseBody?: string
  ): Promise<void> {
    await supabase.rpc('retry_webhook_delivery', {
      queue_id: queueId,
      error_message: errorMessage,
      response_status: status,
      response_body: responseBody?.substring(0, 10000),
    })
  }

  // Mark as dead letter (no more retries)
  private async markDeadLetter(
    queueId: string,
    errorMessage: string,
    status?: number,
    responseBody?: string
  ): Promise<void> {
    await supabase
      .from('webhook_queue')
      .update({
        status: 'dead_letter',
        last_error: errorMessage,
        last_response_status: status,
        last_response_body: responseBody?.substring(0, 10000),
      })
      .eq('id', queueId)
  }

  // Record delivery in the deliveries log
  private async recordDelivery(
    webhookId: string,
    eventType: string,
    payload: Record<string, unknown>,
    success: boolean,
    status: number | null,
    responseBody: string,
    deliveryTimeMs: number,
    retryCount: number
  ): Promise<void> {
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload,
      success,
      response_status: status,
      response_body: responseBody?.substring(0, 10000),
      delivery_time_ms: deliveryTimeMs,
      retry_count: retryCount,
    })
  }

  // Update webhook success stats
  private async updateWebhookSuccess(webhookId: string): Promise<void> {
    await supabase
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        failure_count: 0,
      })
      .eq('id', webhookId)
  }

  // Update webhook failure stats
  private async updateWebhookFailure(webhookId: string): Promise<void> {
    await supabase.rpc('increment_webhook_failure', { webhook_id: webhookId })
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    deadLetter: number
  }> {
    const { data, error } = await supabase
      .from('webhook_queue')
      .select('status')

    if (error) {
      console.error('Error fetching queue stats:', error)
      return { pending: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 }
    }

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0 }
    for (const item of data || []) {
      switch (item.status) {
        case 'pending':
          stats.pending++
          break
        case 'processing':
          stats.processing++
          break
        case 'completed':
          stats.completed++
          break
        case 'failed':
          stats.failed++
          break
        case 'dead_letter':
          stats.deadLetter++
          break
      }
    }

    return stats
  }

  // Retry a specific failed/dead-letter webhook
  async retryWebhook(queueId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('webhook_queue')
      .update({
        status: 'pending',
        next_attempt_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', queueId)
      .in('status', ['failed', 'dead_letter'])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // Cancel a queued webhook
  async cancelWebhook(queueId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('webhook_queue')
      .delete()
      .eq('id', queueId)
      .in('status', ['pending', 'failed'])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }
}

// Create a singleton processor for the app
let processor: WebhookQueueProcessor | null = null

export function getWebhookQueueProcessor(): WebhookQueueProcessor {
  if (!processor) {
    processor = new WebhookQueueProcessor()
  }
  return processor
}

// Start processing the queue (call this on app startup or via cron)
export async function processWebhookQueue(): Promise<ProcessorResult> {
  const p = getWebhookQueueProcessor()
  return p.processBatch()
}
