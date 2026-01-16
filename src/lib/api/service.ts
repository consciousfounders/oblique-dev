// API Service
// High-level service for interacting with the REST API from the frontend

import { apiRouter, createApiRequest, API_BASE_PATH } from './router'
import type { EntityType, QueryParams } from './client'
import type {
  ApiResponse,
  BulkOperationResult,
  EntityMetadata,
  ApiUsageStats
} from './types'
import { generateOpenAPISpec, getOpenAPISpecJSON, getOpenAPISpecYAML } from './openapi'
import { rateLimitService } from './rateLimit'

// API Service configuration
export interface ApiServiceConfig {
  apiKey?: string
  baseUrl?: string
}

// API request options
export interface ApiRequestOptions {
  headers?: Record<string, string>
}

// The API Service class for frontend use
export class ApiService {
  private config: ApiServiceConfig

  constructor(config: ApiServiceConfig = {}) {
    this.config = config
  }

  // Set API key for requests
  setApiKey(apiKey: string) {
    this.config.apiKey = apiKey
  }

  // Set base URL
  setBaseUrl(baseUrl: string) {
    this.config.baseUrl = baseUrl
  }

  // Make an API request through the router
  private async request<T>(
    method: string,
    path: string,
    options: {
      query?: Record<string, string | string[]>
      body?: unknown
    } = {}
  ): Promise<ApiResponse<T>> {
    const fullPath = path.startsWith('/api') ? path : `${API_BASE_PATH}${path}`

    const request = createApiRequest(method, fullPath, {
      query: options.query,
      body: options.body,
      headers: {
        Authorization: this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
      },
    })

    const result = await apiRouter.handleRequest(request)

    if (result.body.error) {
      throw new ApiError(result.status, result.body.error.code, result.body.error.message)
    }

    return {
      data: result.body.data as T,
      meta: result.body.meta,
    }
  }

  // List records
  async list<T>(entity: EntityType, params: QueryParams = {}): Promise<ApiResponse<T[]>> {
    const query: Record<string, string> = {}

    if (params.page) query.page = String(params.page)
    if (params.limit) query.limit = String(params.limit)
    if (params.sort_by) query.sort_by = params.sort_by
    if (params.sort_order) query.sort_order = params.sort_order
    if (params.fields) query.fields = params.fields.join(',')
    if (params.expand) query.expand = params.expand.join(',')

    // Add filters
    if (params.filters) {
      for (const filter of params.filters) {
        if (filter.operator === 'eq') {
          query[filter.field] = String(filter.value)
        } else {
          query[`filter[${filter.field}][${filter.operator}]`] = String(filter.value)
        }
      }
    }

    return this.request<T[]>('GET', `/${entity}`, { query })
  }

  // Get single record
  async get<T>(
    entity: EntityType,
    id: string,
    options: { fields?: string[]; expand?: string[] } = {}
  ): Promise<T> {
    const query: Record<string, string> = {}

    if (options.fields) query.fields = options.fields.join(',')
    if (options.expand) query.expand = options.expand.join(',')

    const response = await this.request<T>('GET', `/${entity}/${id}`, { query })
    return response.data
  }

  // Create record
  async create<T, R = T>(entity: EntityType, data: T): Promise<R> {
    const response = await this.request<R>('POST', `/${entity}`, { body: data })
    return response.data
  }

  // Update record
  async update<T, R = T>(entity: EntityType, id: string, data: Partial<T>): Promise<R> {
    const response = await this.request<R>('PATCH', `/${entity}/${id}`, { body: data })
    return response.data
  }

  // Delete record
  async delete(entity: EntityType, id: string): Promise<{ deleted: boolean }> {
    const response = await this.request<{ deleted: boolean }>('DELETE', `/${entity}/${id}`)
    return response.data
  }

  // Search records
  async search<T>(
    entity: EntityType,
    searchQuery: string,
    params: Omit<QueryParams, 'filters'> = {}
  ): Promise<ApiResponse<T[]>> {
    const query: Record<string, string> = { q: searchQuery }

    if (params.page) query.page = String(params.page)
    if (params.limit) query.limit = String(params.limit)
    if (params.fields) query.fields = params.fields.join(',')
    if (params.expand) query.expand = params.expand.join(',')

    return this.request<T[]>('GET', `/${entity}/search`, { query })
  }

  // Bulk create
  async bulkCreate<T>(entity: EntityType, records: T[]): Promise<BulkOperationResult> {
    const response = await this.request<BulkOperationResult>('POST', `/${entity}/bulk`, {
      body: { records },
    })
    return response.data
  }

  // Bulk update
  async bulkUpdate<T>(entity: EntityType, ids: string[], data: Partial<T>): Promise<BulkOperationResult> {
    const response = await this.request<BulkOperationResult>('PATCH', `/${entity}/bulk`, {
      body: { ids, data },
    })
    return response.data
  }

  // Bulk delete
  async bulkDelete(entity: EntityType, ids: string[]): Promise<BulkOperationResult> {
    const response = await this.request<BulkOperationResult>('DELETE', `/${entity}/bulk`, {
      body: { ids },
    })
    return response.data
  }

  // Get entity metadata
  async getMetadata(entity?: string): Promise<EntityMetadata | EntityMetadata[]> {
    if (entity) {
      const response = await this.request<EntityMetadata>('GET', `/metadata/${entity}`)
      return response.data
    }
    const response = await this.request<EntityMetadata[]>('GET', '/metadata')
    return response.data
  }

  // Get OpenAPI spec
  getOpenAPISpec(format: 'json' | 'yaml' = 'json'): string {
    const baseUrl = this.config.baseUrl || window.location.origin
    return format === 'yaml' ? getOpenAPISpecYAML(baseUrl) : getOpenAPISpecJSON(baseUrl)
  }

  // Get OpenAPI spec object
  getOpenAPISpecObject() {
    const baseUrl = this.config.baseUrl || window.location.origin
    return generateOpenAPISpec(baseUrl)
  }
}

// Custom API Error class
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// Export singleton instance
export const apiService = new ApiService()

// API Analytics Service
export class ApiAnalyticsService {
  // Get usage statistics for an API key
  async getUsageStats(apiKeyId: string, days: number = 30): Promise<ApiUsageStats | null> {
    const result = await rateLimitService.getUsageStats(apiKeyId, days)

    if (result.error || !result.data) {
      return null
    }

    return {
      total_requests: result.data.totalRequests,
      successful_requests: result.data.successfulRequests,
      failed_requests: result.data.failedRequests,
      avg_response_time_ms: result.data.avgResponseTimeMs,
      requests_by_endpoint: result.data.requestsByEndpoint,
      requests_by_day: result.data.requestsByDay.map(d => ({
        date: d.date,
        count: d.count,
      })),
    }
  }

  // Get top endpoints by request count
  async getTopEndpoints(apiKeyId: string, limit: number = 10): Promise<{ endpoint: string; count: number }[]> {
    const stats = await this.getUsageStats(apiKeyId)
    if (!stats) return []

    return Object.entries(stats.requests_by_endpoint)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  // Get error rate
  async getErrorRate(apiKeyId: string, days: number = 30): Promise<number> {
    const stats = await this.getUsageStats(apiKeyId, days)
    if (!stats || stats.total_requests === 0) return 0

    return (stats.failed_requests / stats.total_requests) * 100
  }
}

// Export singleton analytics instance
export const apiAnalyticsService = new ApiAnalyticsService()

// Utility function to format API endpoint for display
export function formatEndpoint(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`
}

// Utility function to get HTTP status text
export function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  }
  return statusTexts[status] || 'Unknown'
}

// Utility function to check if a status is successful
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}
