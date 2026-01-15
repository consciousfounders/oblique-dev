// REST API Client for the Oblique CRM API
// This module provides a client for making authenticated API requests

import { supabase } from '@/lib/supabase'
import type {
  ApiError,
  PaginationParams,
  SortParams,
  FilterParam,
  FieldSelection,
  FilterOperator,
  BulkOperationResult,
  RateLimitInfo,
} from './types'

// API Configuration
const API_VERSION = 'v1'

// Entity types supported by the API
export type EntityType = 'accounts' | 'contacts' | 'leads' | 'deals' | 'deal_stages' | 'activities' | 'users'

// Query parameters for list operations
export interface QueryParams extends PaginationParams, SortParams, FieldSelection {
  filters?: FilterParam[]
}

// Convert filter operator to Supabase PostgREST format
function filterOperatorToPostgrest(operator: FilterOperator): string {
  const mapping: Record<FilterOperator, string> = {
    eq: 'eq',
    neq: 'neq',
    gt: 'gt',
    gte: 'gte',
    lt: 'lt',
    lte: 'lte',
    like: 'like',
    ilike: 'ilike',
    in: 'in',
    is: 'is',
  }
  return mapping[operator]
}

// Build select string from field selection
function buildSelectString(fields?: string[], expand?: string[]): string {
  const baseFields = fields?.length ? fields.join(',') : '*'
  if (!expand?.length) return baseFields

  // Add relationship expansion
  const expansions = expand.map(rel => `${rel}(*)`).join(',')
  return `${baseFields},${expansions}`
}

// API Response wrapper with rate limit info
export interface ApiClientResponse<T> {
  data: T | null
  error: ApiError | null
  meta?: {
    total?: number
    page?: number
    limit?: number
    has_more?: boolean
  }
  rateLimit?: RateLimitInfo
}

// CRM API Client class
export class CrmApiClient {
  private _tenantId: string | null = null

  constructor(tenantId?: string) {
    this._tenantId = tenantId || null
  }

  setTenantId(tenantId: string) {
    this._tenantId = tenantId
  }

  get tenantId() {
    return this._tenantId
  }

  // Generic list operation
  async list<T>(
    entity: EntityType,
    params: QueryParams = {}
  ): Promise<ApiClientResponse<T[]>> {
    try {
      const { page = 1, limit = 50, sort_by, sort_order = 'asc', filters, fields, expand } = params

      let query = supabase
        .from(entity)
        .select(buildSelectString(fields, expand), { count: 'exact' })

      // Apply filters
      if (filters?.length) {
        for (const filter of filters) {
          const postgrestOp = filterOperatorToPostgrest(filter.operator)
          if (filter.operator === 'in' && Array.isArray(filter.value)) {
            query = query.in(filter.field, filter.value)
          } else if (filter.operator === 'is') {
            query = query.is(filter.field, filter.value as null)
          } else {
            query = query.filter(filter.field, postgrestOp, filter.value)
          }
        }
      }

      // Apply sorting
      if (sort_by) {
        query = query.order(sort_by, { ascending: sort_order === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // Apply pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        return {
          data: null,
          error: {
            error: {
              code: 'query_error',
              message: error.message,
              details: { hint: error.hint },
            },
          },
        }
      }

      return {
        data: data as T[],
        error: null,
        meta: {
          total: count || 0,
          page,
          limit,
          has_more: count ? offset + limit < count : false,
        },
      }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Get single record by ID
  async get<T>(
    entity: EntityType,
    id: string,
    params: FieldSelection = {}
  ): Promise<ApiClientResponse<T>> {
    try {
      const { fields, expand } = params

      const { data, error } = await supabase
        .from(entity)
        .select(buildSelectString(fields, expand))
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            data: null,
            error: {
              error: {
                code: 'not_found',
                message: `${entity} with id ${id} not found`,
              },
            },
          }
        }
        return {
          data: null,
          error: {
            error: {
              code: 'query_error',
              message: error.message,
            },
          },
        }
      }

      return { data: data as T, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Create a new record
  async create<T, R>(
    entity: EntityType,
    data: T,
    tenantId: string,
    ownerId?: string
  ): Promise<ApiClientResponse<R>> {
    try {
      const insertData = {
        ...data,
        tenant_id: tenantId,
        ...(ownerId && { owner_id: ownerId }),
      }

      const { data: result, error } = await supabase
        .from(entity)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        return {
          data: null,
          error: {
            error: {
              code: 'create_error',
              message: error.message,
              details: { hint: error.hint },
            },
          },
        }
      }

      return { data: result as R, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Update a record
  async update<T, R>(
    entity: EntityType,
    id: string,
    data: Partial<T>
  ): Promise<ApiClientResponse<R>> {
    try {
      const { data: result, error } = await supabase
        .from(entity)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            data: null,
            error: {
              error: {
                code: 'not_found',
                message: `${entity} with id ${id} not found`,
              },
            },
          }
        }
        return {
          data: null,
          error: {
            error: {
              code: 'update_error',
              message: error.message,
            },
          },
        }
      }

      return { data: result as R, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Delete a record
  async delete(entity: EntityType, id: string): Promise<ApiClientResponse<{ deleted: boolean }>> {
    try {
      const { error } = await supabase.from(entity).delete().eq('id', id)

      if (error) {
        return {
          data: null,
          error: {
            error: {
              code: 'delete_error',
              message: error.message,
            },
          },
        }
      }

      return { data: { deleted: true }, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Bulk create records
  async bulkCreate<T>(
    entity: EntityType,
    records: T[],
    tenantId: string,
    ownerId?: string
  ): Promise<ApiClientResponse<BulkOperationResult>> {
    try {
      const insertRecords = records.map(record => ({
        ...record,
        tenant_id: tenantId,
        ...(ownerId && { owner_id: ownerId }),
      }))

      const { data, error } = await supabase.from(entity).insert(insertRecords).select()

      if (error) {
        return {
          data: {
            success_count: 0,
            failure_count: records.length,
            errors: [{ id: 'bulk', error: error.message }],
          },
          error: null,
        }
      }

      return {
        data: {
          success_count: data?.length || 0,
          failure_count: records.length - (data?.length || 0),
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'bulk_create_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Bulk update records
  async bulkUpdate<T>(
    entity: EntityType,
    ids: string[],
    data: Partial<T>
  ): Promise<ApiClientResponse<BulkOperationResult>> {
    try {
      const results: { id: string; error?: string }[] = []
      let successCount = 0

      // Process updates in batches
      for (const id of ids) {
        const { error } = await supabase.from(entity).update(data).eq('id', id)

        if (error) {
          results.push({ id, error: error.message })
        } else {
          successCount++
        }
      }

      return {
        data: {
          success_count: successCount,
          failure_count: ids.length - successCount,
          errors: results.filter(r => r.error).map(r => ({ id: r.id, error: r.error! })),
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'bulk_update_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Bulk delete records
  async bulkDelete(entity: EntityType, ids: string[]): Promise<ApiClientResponse<BulkOperationResult>> {
    try {
      const { error } = await supabase.from(entity).delete().in('id', ids)

      if (error) {
        return {
          data: {
            success_count: 0,
            failure_count: ids.length,
            errors: [{ id: 'bulk', error: error.message }],
          },
          error: null,
        }
      }

      return {
        data: {
          success_count: ids.length,
          failure_count: 0,
        },
        error: null,
      }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'bulk_delete_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }

  // Search across entity fields
  async search<T>(
    entity: EntityType,
    searchTerm: string,
    searchFields: string[],
    params: QueryParams = {}
  ): Promise<ApiClientResponse<T[]>> {
    try {
      const { page = 1, limit = 50, sort_by, sort_order = 'asc', fields, expand } = params

      let query = supabase
        .from(entity)
        .select(buildSelectString(fields, expand), { count: 'exact' })

      // Build OR condition for search across multiple fields
      if (searchFields.length > 0 && searchTerm) {
        const orConditions = searchFields.map(field => `${field}.ilike.%${searchTerm}%`).join(',')
        query = query.or(orConditions)
      }

      // Apply sorting
      if (sort_by) {
        query = query.order(sort_by, { ascending: sort_order === 'asc' })
      }

      // Apply pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        return {
          data: null,
          error: {
            error: {
              code: 'search_error',
              message: error.message,
            },
          },
        }
      }

      return {
        data: data as T[],
        error: null,
        meta: {
          total: count || 0,
          page,
          limit,
          has_more: count ? offset + limit < count : false,
        },
      }
    } catch (err) {
      return {
        data: null,
        error: {
          error: {
            code: 'internal_error',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      }
    }
  }
}

// Create a default API client instance
export const apiClient = new CrmApiClient()

// Export API version for documentation
export { API_VERSION }
