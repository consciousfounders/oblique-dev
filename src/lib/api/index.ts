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

// API Router
export {
  ApiRouter,
  apiRouter,
  parseApiPath,
  createApiRequest,
  API_BASE_PATH,
  type ApiRequestContext,
  type ApiResponseBody,
  type RouteResult,
  type ParsedRequest,
} from './router'

// API Service
export {
  ApiService,
  apiService,
  ApiError,
  ApiAnalyticsService,
  apiAnalyticsService,
  formatEndpoint,
  getStatusText,
  isSuccessStatus,
  type ApiServiceConfig,
  type ApiRequestOptions,
} from './service'

// API Versioning
export {
  API_VERSIONS,
  CURRENT_API_VERSION,
  DEPRECATED_VERSIONS,
  SUNSET_VERSIONS,
  VERSION_INFO,
  parseVersion,
  isValidVersion,
  isDeprecatedVersion,
  isSunsetVersion,
  getVersionInfo,
  getAllVersionInfo,
  getVersionHeaders,
  checkVersionCompatibility,
  getVersionsResponse,
  buildVersionedPath,
  extractPathWithoutVersion,
  type ApiVersion,
  type VersionInfo,
  type VersionCompatibility,
  type VersionsResponse,
} from './versioning'

// SDK Generators
export {
  generateSDKCode,
  createClient as createSDKClient,
} from './sdk/javascript'
export {
  generatePythonSDK,
  generatePythonWebhookHandler,
} from './sdk/python'
export {
  downloadSDK,
  getSDKSnippets,
} from './sdk'
