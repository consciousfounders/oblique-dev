// Webhook Services Index
// Re-exports all webhook-related services

export {
  WebhookEventService,
  createWebhookEventService,
  triggerEntityWebhook,
  triggerLeadConverted,
  triggerDealStageChanged,
  triggerDealWon,
  triggerDealLost,
  type EntityType,
  type OperationType,
  type WebhookTriggerContext,
  type WebhookPayload,
} from './webhookEventService'

export {
  WebhookQueueProcessor,
  getWebhookQueueProcessor,
  processWebhookQueue,
  type ProcessorResult,
} from './webhookQueueProcessor'

export {
  InboundWebhookService,
  createInboundWebhookService,
  type InboundWebhook,
  type InboundWebhookLog,
  type CreateInboundWebhookRequest,
  type ProcessWebhookResult,
  type InboundAuthType,
  type TargetEntity,
} from './inboundWebhookService'
