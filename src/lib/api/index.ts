// Oblique CRM REST API Module
// Export all API-related services and utilities

// Types
export * from './types'

// API Client
export { CrmApiClient, apiClient, API_VERSION, type QueryParams, type EntityType } from './client'

// API Key Management
export { apiKeyService } from './apiKeyService'

// Webhook Management
export { webhookService, type WebhookPayload, type WebhookDeliveryResult } from './webhookService'

// Entity Metadata
export {
  getEntityMetadata,
  getAllEntityMetadata,
  getEntityNames,
  getFieldMetadata,
  getWritableFields,
  getRequiredFields,
  validateEntityData,
  getExpandableRelationships,
  getSearchableFields,
  getSortableFields,
  getFilterableFields,
  entityRegistry,
} from './metadata'

// OpenAPI Spec Generation
export { generateOpenAPISpec, getOpenAPISpecJSON, getOpenAPISpecYAML } from './openapi'
