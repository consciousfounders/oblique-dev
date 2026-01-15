// Oblique CRM REST API Module
// Export all API-related services and utilities

// Types
export * from './types'

// API Client
export { CrmApiClient, apiClient, API_VERSION, type QueryParams, type EntityType } from './client'

// API Key Management
export { apiKeyService, ApiKeyService, type ApiKeyWithStats } from './keys'

// Webhook Management
export { webhookService, WebhookService, type WebhookWithSecret, type WebhookDelivery } from './webhooks'

// OAuth 2.0 Service
export {
  oauthService,
  OAuthService,
  type OAuthApplication,
  type OAuthApplicationWithSecret,
  type CreateOAuthApplicationRequest,
  type AuthorizeRequest,
  type TokenRequest,
  type TokenResponse,
} from './oauth'

// Rate Limiting Service
export {
  rateLimitService,
  RateLimitService,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitUsage,
} from './rateLimit'

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
