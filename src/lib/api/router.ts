// REST API Router
// Handles routing and request/response processing for the Oblique CRM API

import type { EntityType } from './client'
import type { ApiScope, FilterOperator, FilterParam } from './types'
import { getEntityMetadata, getAllEntityMetadata, validateEntityData, getSearchableFields } from './metadata'
import { apiKeyService } from './keys'
import { rateLimitService } from './rateLimit'
import { supabase } from '@/lib/supabase'

// API version
export const API_VERSION = 'v1'
export const API_BASE_PATH = `/api/${API_VERSION}`

// Request context after authentication
export interface ApiRequestContext {
  apiKeyId: string
  tenantId: string
  scopes: ApiScope[]
  userId?: string
}

// Standard API response format
export interface ApiResponseBody<T = unknown> {
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    total?: number
    page?: number
    limit?: number
    has_more?: boolean
  }
}

// Route handler result
export interface RouteResult<T = unknown> {
  status: number
  body: ApiResponseBody<T>
  headers?: Record<string, string>
}

// Parsed request params
export interface ParsedRequest {
  method: string
  path: string
  entity?: EntityType
  id?: string
  action?: 'bulk' | 'search' | 'metadata'
  query: Record<string, string | string[]>
  body?: unknown
  headers: Record<string, string>
}

// Parse query parameters (exported for potential use elsewhere)
export function parseQueryParams(searchParams: URLSearchParams): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      // Handle array values (e.g., filter[status]=active&filter[status]=pending)
      const existing = params[key]
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        params[key] = [existing, value]
      }
    } else {
      params[key] = value
    }
  }

  return params
}

// Parse filter parameters from query
function parseFilters(query: Record<string, string | string[]>): FilterParam[] {
  const filters: FilterParam[] = []

  for (const [key, value] of Object.entries(query)) {
    // Support filter[field][operator]=value format
    const filterMatch = key.match(/^filter\[(\w+)\](?:\[(\w+)\])?$/)
    if (filterMatch) {
      const field = filterMatch[1]
      const operator = (filterMatch[2] || 'eq') as FilterOperator

      // Handle array values for 'in' operator
      if (Array.isArray(value)) {
        filters.push({ field, operator: 'in', value })
      } else if (value === 'null') {
        filters.push({ field, operator: 'is', value: null })
      } else {
        filters.push({ field, operator, value })
      }
    }
    // Also support simple field=value format
    else if (!['page', 'limit', 'sort_by', 'sort_order', 'fields', 'expand', 'q'].includes(key)) {
      if (Array.isArray(value)) {
        filters.push({ field: key, operator: 'in', value })
      } else if (value === 'null') {
        filters.push({ field: key, operator: 'is', value: null })
      } else {
        filters.push({ field: key, operator: 'eq', value })
      }
    }
  }

  return filters
}

// Parse request path
export function parseApiPath(
  pathname: string
): { entity?: EntityType; id?: string; action?: 'bulk' | 'search' | 'metadata' } | null {
  // Remove leading /api/v1
  const path = pathname.replace(/^\/api\/v\d+\/?/, '')

  if (!path) return {}

  const segments = path.split('/').filter(Boolean)

  // Handle metadata endpoint
  if (segments[0] === 'metadata') {
    return { action: 'metadata', entity: segments[1] as EntityType | undefined }
  }

  // Entity endpoints
  const validEntities: EntityType[] = ['accounts', 'contacts', 'leads', 'deals', 'deal_stages', 'activities', 'users']
  const entity = segments[0] as EntityType

  if (!validEntities.includes(entity)) {
    return null
  }

  // /entity/bulk
  if (segments[1] === 'bulk') {
    return { entity, action: 'bulk' }
  }

  // /entity/search
  if (segments[1] === 'search') {
    return { entity, action: 'search' }
  }

  // /entity/:id
  if (segments[1]) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(segments[1])) {
      return null
    }
    return { entity, id: segments[1] }
  }

  return { entity }
}

// Check if scope is allowed for an operation
function hasScope(scopes: ApiScope[], entity: EntityType, operation: 'read' | 'write'): boolean {
  // Map entity to scope prefix
  const entityScopeMap: Record<EntityType, string> = {
    accounts: 'accounts',
    contacts: 'contacts',
    leads: 'leads',
    deals: 'deals',
    deal_stages: 'deals', // Deal stages use deals scope
    activities: 'activities',
    users: 'users',
  }

  const scopePrefix = entityScopeMap[entity]
  const requiredScope = `${scopePrefix}:${operation}` as ApiScope

  return scopes.includes(requiredScope)
}

// Build select string from fields and expand parameters
function buildSelectString(fields?: string, expand?: string): string {
  const baseFields = fields ? fields.split(',').map(f => f.trim()).join(',') : '*'

  if (!expand) return baseFields

  const expansions = expand.split(',').map(rel => `${rel.trim()}(*)`).join(',')
  return `${baseFields},${expansions}`
}

// REST API Router class
export class ApiRouter {
  // Authenticate request and extract context
  async authenticate(authHeader?: string): Promise<{
    success: boolean
    context?: ApiRequestContext
    error?: { code: string; message: string }
  }> {
    if (!authHeader) {
      return {
        success: false,
        error: { code: 'unauthorized', message: 'Missing Authorization header' },
      }
    }

    // Support both "Bearer <key>" and direct key
    const key = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader.trim()

    if (!key || !key.startsWith('obl_')) {
      return {
        success: false,
        error: { code: 'unauthorized', message: 'Invalid API key format' },
      }
    }

    const validation = await apiKeyService.validateKey(key)

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'unauthorized', message: validation.error || 'Invalid API key' },
      }
    }

    return {
      success: true,
      context: {
        apiKeyId: validation.keyId!,
        tenantId: validation.tenantId!,
        scopes: validation.scopes!,
      },
    }
  }

  // Check rate limit
  async checkRateLimit(
    context: ApiRequestContext,
    endpoint: string,
    method: string
  ): Promise<{ allowed: boolean; headers: Record<string, string>; retryAfter?: number }> {
    // Get API key rate limits
    const { data: keyData } = await apiKeyService.getKey(context.apiKeyId)

    const config = {
      limitPerMinute: keyData?.rate_limit_per_minute || 60,
      limitPerDay: keyData?.rate_limit_per_day || 10000,
    }

    const result = await rateLimitService.checkAndRecord(
      context.apiKeyId,
      context.tenantId,
      config,
      { endpoint, method }
    )

    return {
      allowed: result.allowed,
      headers: rateLimitService.getRateLimitHeaders(result),
      retryAfter: result.retryAfter,
    }
  }

  // Handle list operation
  async handleList(
    entity: EntityType,
    context: ApiRequestContext,
    query: Record<string, string | string[]>
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'read')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:read` } },
      }
    }

    const page = parseInt(query.page as string) || 1
    const limit = Math.min(parseInt(query.limit as string) || 50, 100)
    const sortBy = query.sort_by as string
    const sortOrder = (query.sort_order as string) === 'desc' ? 'desc' : 'asc'
    const fields = query.fields as string
    const expand = query.expand as string
    const filters = parseFilters(query)

    const offset = (page - 1) * limit

    try {
      let queryBuilder = supabase
        .from(entity)
        .select(buildSelectString(fields, expand), { count: 'exact' })
        .eq('tenant_id', context.tenantId)

      // Apply filters
      for (const filter of filters) {
        if (filter.operator === 'in' && Array.isArray(filter.value)) {
          queryBuilder = queryBuilder.in(filter.field, filter.value)
        } else if (filter.operator === 'is') {
          queryBuilder = queryBuilder.is(filter.field, filter.value as null)
        } else if (filter.operator === 'like') {
          queryBuilder = queryBuilder.like(filter.field, filter.value as string)
        } else if (filter.operator === 'ilike') {
          queryBuilder = queryBuilder.ilike(filter.field, filter.value as string)
        } else {
          queryBuilder = queryBuilder.filter(filter.field, filter.operator, filter.value)
        }
      }

      // Apply sorting
      if (sortBy) {
        queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' })
      } else {
        queryBuilder = queryBuilder.order('created_at', { ascending: false })
      }

      // Apply pagination
      queryBuilder = queryBuilder.range(offset, offset + limit - 1)

      const { data, error, count } = await queryBuilder

      if (error) {
        return {
          status: 400,
          body: { error: { code: 'query_error', message: error.message } },
        }
      }

      return {
        status: 200,
        body: {
          data,
          meta: {
            total: count || 0,
            page,
            limit,
            has_more: count ? offset + limit < count : false,
          },
        },
      }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle get single record
  async handleGet(
    entity: EntityType,
    id: string,
    context: ApiRequestContext,
    query: Record<string, string | string[]>
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'read')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:read` } },
      }
    }

    const fields = query.fields as string
    const expand = query.expand as string

    try {
      const { data, error } = await supabase
        .from(entity)
        .select(buildSelectString(fields, expand))
        .eq('id', id)
        .eq('tenant_id', context.tenantId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            status: 404,
            body: { error: { code: 'not_found', message: `${entity} with id ${id} not found` } },
          }
        }
        return {
          status: 400,
          body: { error: { code: 'query_error', message: error.message } },
        }
      }

      return { status: 200, body: { data } }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle create operation
  async handleCreate(
    entity: EntityType,
    context: ApiRequestContext,
    body: unknown
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'write')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:write` } },
      }
    }

    if (!body || typeof body !== 'object') {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Request body is required' } },
      }
    }

    // Validate against schema
    const validation = validateEntityData(entity, body as Record<string, unknown>, false)
    if (!validation.valid) {
      return {
        status: 400,
        body: {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: { errors: validation.errors },
          },
        },
      }
    }

    try {
      const insertData = {
        ...(body as object),
        tenant_id: context.tenantId,
      }

      const { data, error } = await supabase
        .from(entity)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        return {
          status: 400,
          body: { error: { code: 'create_error', message: error.message } },
        }
      }

      return { status: 201, body: { data } }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle update operation
  async handleUpdate(
    entity: EntityType,
    id: string,
    context: ApiRequestContext,
    body: unknown
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'write')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:write` } },
      }
    }

    if (!body || typeof body !== 'object') {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Request body is required' } },
      }
    }

    // Validate against schema
    const validation = validateEntityData(entity, body as Record<string, unknown>, true)
    if (!validation.valid) {
      return {
        status: 400,
        body: {
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: { errors: validation.errors },
          },
        },
      }
    }

    try {
      const { data, error } = await supabase
        .from(entity)
        .update(body as object)
        .eq('id', id)
        .eq('tenant_id', context.tenantId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            status: 404,
            body: { error: { code: 'not_found', message: `${entity} with id ${id} not found` } },
          }
        }
        return {
          status: 400,
          body: { error: { code: 'update_error', message: error.message } },
        }
      }

      return { status: 200, body: { data } }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle delete operation
  async handleDelete(
    entity: EntityType,
    id: string,
    context: ApiRequestContext
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'write')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:write` } },
      }
    }

    try {
      // First verify the record exists and belongs to the tenant
      const { data: existing } = await supabase
        .from(entity)
        .select('id')
        .eq('id', id)
        .eq('tenant_id', context.tenantId)
        .single()

      if (!existing) {
        return {
          status: 404,
          body: { error: { code: 'not_found', message: `${entity} with id ${id} not found` } },
        }
      }

      const { error } = await supabase
        .from(entity)
        .delete()
        .eq('id', id)
        .eq('tenant_id', context.tenantId)

      if (error) {
        return {
          status: 400,
          body: { error: { code: 'delete_error', message: error.message } },
        }
      }

      return { status: 200, body: { data: { deleted: true } } }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle search operation
  async handleSearch(
    entity: EntityType,
    context: ApiRequestContext,
    query: Record<string, string | string[]>
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'read')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:read` } },
      }
    }

    const searchQuery = query.q as string
    if (!searchQuery) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Search query (q) is required' } },
      }
    }

    const page = parseInt(query.page as string) || 1
    const limit = Math.min(parseInt(query.limit as string) || 50, 100)
    const fields = query.fields as string
    const expand = query.expand as string
    const offset = (page - 1) * limit

    // Get searchable fields for the entity
    const searchFields = getSearchableFields(entity)

    try {
      let queryBuilder = supabase
        .from(entity)
        .select(buildSelectString(fields, expand), { count: 'exact' })
        .eq('tenant_id', context.tenantId)

      // Build OR condition for search across multiple fields
      if (searchFields.length > 0) {
        const orConditions = searchFields.map(field => `${field}.ilike.%${searchQuery}%`).join(',')
        queryBuilder = queryBuilder.or(orConditions)
      }

      queryBuilder = queryBuilder
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data, error, count } = await queryBuilder

      if (error) {
        return {
          status: 400,
          body: { error: { code: 'search_error', message: error.message } },
        }
      }

      return {
        status: 200,
        body: {
          data,
          meta: {
            total: count || 0,
            page,
            limit,
            has_more: count ? offset + limit < count : false,
          },
        },
      }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle bulk create
  async handleBulkCreate(
    entity: EntityType,
    context: ApiRequestContext,
    body: unknown
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'write')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:write` } },
      }
    }

    if (!body || typeof body !== 'object' || !('records' in body)) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Request body must contain records array' } },
      }
    }

    const { records } = body as { records: unknown[] }

    if (!Array.isArray(records) || records.length === 0) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Records array is required and must not be empty' } },
      }
    }

    if (records.length > 100) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Maximum 100 records per bulk operation' } },
      }
    }

    try {
      const insertRecords = records.map(record => ({
        ...(record as object),
        tenant_id: context.tenantId,
      }))

      const { data, error } = await supabase.from(entity).insert(insertRecords).select()

      if (error) {
        return {
          status: 400,
          body: {
            data: {
              success_count: 0,
              failure_count: records.length,
              errors: [{ id: 'bulk', error: error.message }],
            },
          },
        }
      }

      return {
        status: 200,
        body: {
          data: {
            success_count: data?.length || 0,
            failure_count: records.length - (data?.length || 0),
          },
        },
      }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle bulk update
  async handleBulkUpdate(
    entity: EntityType,
    context: ApiRequestContext,
    body: unknown
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'write')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:write` } },
      }
    }

    if (!body || typeof body !== 'object' || !('ids' in body) || !('data' in body)) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Request body must contain ids array and data object' } },
      }
    }

    const { ids, data: updateData } = body as { ids: string[]; data: object }

    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'IDs array is required and must not be empty' } },
      }
    }

    if (ids.length > 100) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Maximum 100 records per bulk operation' } },
      }
    }

    try {
      const results: { id: string; error?: string }[] = []
      let successCount = 0

      for (const id of ids) {
        const { error } = await supabase
          .from(entity)
          .update(updateData)
          .eq('id', id)
          .eq('tenant_id', context.tenantId)

        if (error) {
          results.push({ id, error: error.message })
        } else {
          successCount++
        }
      }

      return {
        status: 200,
        body: {
          data: {
            success_count: successCount,
            failure_count: ids.length - successCount,
            errors: results.filter(r => r.error).map(r => ({ id: r.id, error: r.error! })),
          },
        },
      }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle bulk delete
  async handleBulkDelete(
    entity: EntityType,
    context: ApiRequestContext,
    body: unknown
  ): Promise<RouteResult> {
    if (!hasScope(context.scopes, entity, 'write')) {
      return {
        status: 403,
        body: { error: { code: 'forbidden', message: `Missing scope: ${entity}:write` } },
      }
    }

    if (!body || typeof body !== 'object' || !('ids' in body)) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Request body must contain ids array' } },
      }
    }

    const { ids } = body as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'IDs array is required and must not be empty' } },
      }
    }

    if (ids.length > 100) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Maximum 100 records per bulk operation' } },
      }
    }

    try {
      const { error } = await supabase
        .from(entity)
        .delete()
        .in('id', ids)
        .eq('tenant_id', context.tenantId)

      if (error) {
        return {
          status: 400,
          body: {
            data: {
              success_count: 0,
              failure_count: ids.length,
              errors: [{ id: 'bulk', error: error.message }],
            },
          },
        }
      }

      return {
        status: 200,
        body: {
          data: {
            success_count: ids.length,
            failure_count: 0,
          },
        },
      }
    } catch (err) {
      return {
        status: 500,
        body: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Handle metadata list
  handleMetadataList(): RouteResult {
    const entities = getAllEntityMetadata()

    return {
      status: 200,
      body: {
        data: entities.map((e: { name: string; label: string; plural_label: string; description: string }) => ({
          name: e.name,
          label: e.label,
          plural_label: e.plural_label,
          description: e.description,
        })),
      },
    }
  }

  // Handle metadata describe
  handleMetadataDescribe(entityName: string): RouteResult {
    const metadata = getEntityMetadata(entityName)

    if (!metadata) {
      return {
        status: 404,
        body: { error: { code: 'not_found', message: `Entity ${entityName} not found` } },
      }
    }

    return {
      status: 200,
      body: { data: metadata },
    }
  }

  // Main route handler
  async handleRequest(request: ParsedRequest): Promise<RouteResult> {
    const { method, path, entity, id, action, query, body, headers } = request

    // Authenticate
    const auth = await this.authenticate(headers.authorization || headers.Authorization)
    if (!auth.success) {
      return {
        status: 401,
        body: { error: auth.error },
      }
    }

    const context = auth.context!

    // Check rate limit
    const rateLimit = await this.checkRateLimit(context, path, method)
    if (!rateLimit.allowed) {
      return {
        status: 429,
        body: {
          error: {
            code: 'rate_limited',
            message: 'Rate limit exceeded. Try again later.',
          },
        },
        headers: rateLimit.headers,
      }
    }

    // Handle metadata endpoints (no entity required)
    if (action === 'metadata') {
      if (entity) {
        return this.handleMetadataDescribe(entity)
      }
      return this.handleMetadataList()
    }

    // Entity is required for all other endpoints
    if (!entity) {
      return {
        status: 400,
        body: { error: { code: 'bad_request', message: 'Entity type is required' } },
      }
    }

    // Handle bulk operations
    if (action === 'bulk') {
      switch (method.toUpperCase()) {
        case 'POST':
          return this.handleBulkCreate(entity, context, body)
        case 'PATCH':
          return this.handleBulkUpdate(entity, context, body)
        case 'DELETE':
          return this.handleBulkDelete(entity, context, body)
        default:
          return {
            status: 405,
            body: { error: { code: 'method_not_allowed', message: `Method ${method} not allowed for bulk operations` } },
          }
      }
    }

    // Handle search
    if (action === 'search') {
      if (method.toUpperCase() !== 'GET') {
        return {
          status: 405,
          body: { error: { code: 'method_not_allowed', message: 'Only GET is allowed for search' } },
        }
      }
      return this.handleSearch(entity, context, query)
    }

    // Handle standard CRUD operations
    if (id) {
      // Single record operations
      switch (method.toUpperCase()) {
        case 'GET':
          return this.handleGet(entity, id, context, query)
        case 'PATCH':
        case 'PUT':
          return this.handleUpdate(entity, id, context, body)
        case 'DELETE':
          return this.handleDelete(entity, id, context)
        default:
          return {
            status: 405,
            body: { error: { code: 'method_not_allowed', message: `Method ${method} not allowed` } },
          }
      }
    } else {
      // Collection operations
      switch (method.toUpperCase()) {
        case 'GET':
          return this.handleList(entity, context, query)
        case 'POST':
          return this.handleCreate(entity, context, body)
        default:
          return {
            status: 405,
            body: { error: { code: 'method_not_allowed', message: `Method ${method} not allowed` } },
          }
      }
    }
  }
}

// Export singleton instance
export const apiRouter = new ApiRouter()

// Helper to create a simulated request for testing/internal use
export function createApiRequest(
  method: string,
  path: string,
  options: {
    query?: Record<string, string | string[]>
    body?: unknown
    headers?: Record<string, string>
  } = {}
): ParsedRequest {
  const parsed = parseApiPath(path)

  return {
    method,
    path,
    entity: parsed?.entity,
    id: parsed?.id,
    action: parsed?.action,
    query: options.query || {},
    body: options.body,
    headers: options.headers || {},
  }
}
