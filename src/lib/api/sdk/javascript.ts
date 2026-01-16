// Oblique CRM JavaScript/TypeScript SDK
// A complete SDK for interacting with the Oblique CRM API

/**
 * Configuration options for the SDK client
 */
export interface ObliqueCRMConfig {
  apiKey: string
  baseUrl?: string
  version?: string
  timeout?: number
  retryCount?: number
  onRateLimited?: (retryAfter: number) => void
}

/**
 * Pagination parameters for list operations
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Filter parameters for queries
 */
export interface FilterParams {
  [field: string]: string | number | boolean | string[] | null | {
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is'
    value: string | number | boolean | string[] | null
  }
}

/**
 * Field selection parameters
 */
export interface SelectParams {
  fields?: string[]
  expand?: string[]
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationParams, SelectParams {
  filters?: FilterParams
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

/**
 * Bulk operation result
 */
export interface BulkResult {
  successCount: number
  failureCount: number
  errors?: Array<{ id: string; error: string }>
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

/**
 * API error class
 */
export class ObliqueCRMError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>
  rateLimit?: RateLimitInfo

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>,
    rateLimit?: RateLimitInfo
  ) {
    super(message)
    this.name = 'ObliqueCRMError'
    this.code = code
    this.status = status
    this.details = details
    this.rateLimit = rateLimit
  }
}

/**
 * Entity types available in the API
 */
export type EntityType = 'accounts' | 'contacts' | 'leads' | 'deals' | 'deal_stages' | 'activities' | 'users'

/**
 * Account entity
 */
export interface Account {
  id: string
  name: string
  domain?: string
  industry?: string
  employee_count?: string
  annual_revenue?: string
  owner_id?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * Contact entity
 */
export interface Contact {
  id: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  title?: string
  account_id?: string
  owner_id?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * Lead entity
 */
export interface Lead {
  id: string
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  source?: string
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
  owner_id?: string
  converted_contact_id?: string
  converted_account_id?: string
  converted_at?: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * Deal entity
 */
export interface Deal {
  id: string
  name: string
  value?: number
  stage_id: string
  account_id?: string
  contact_id?: string
  owner_id?: string
  expected_close_date?: string
  closed_at?: string
  won?: boolean
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * Deal Stage entity
 */
export interface DealStage {
  id: string
  name: string
  position: number
  probability: number
  tenant_id: string
  created_at: string
}

/**
 * Activity entity
 */
export interface Activity {
  id: string
  entity_type: string
  entity_id: string
  activity_type: string
  subject?: string
  description?: string
  user_id?: string
  tenant_id: string
  created_at: string
}

/**
 * User entity
 */
export interface User {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'sdr' | 'ae' | 'am'
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * Entity resource class for CRUD operations
 */
class EntityResource<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  private client: ObliqueCRM
  private entityName: EntityType

  constructor(client: ObliqueCRM, entityName: EntityType) {
    this.client = client
    this.entityName = entityName
  }

  /**
   * List records with pagination and filtering
   */
  async list(params: QueryParams = {}): Promise<PaginatedResponse<T>> {
    return this.client.request<PaginatedResponse<T>>('GET', `/${this.entityName}`, { query: params as Record<string, unknown> })
  }

  /**
   * Get a single record by ID
   */
  async get(id: string, params: SelectParams = {}): Promise<T> {
    const response = await this.client.request<{ data: T }>('GET', `/${this.entityName}/${id}`, { query: params as Record<string, unknown> })
    return response.data
  }

  /**
   * Create a new record
   */
  async create(data: CreateT): Promise<T> {
    const response = await this.client.request<{ data: T }>('POST', `/${this.entityName}`, { body: data })
    return response.data
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: UpdateT): Promise<T> {
    const response = await this.client.request<{ data: T }>('PATCH', `/${this.entityName}/${id}`, { body: data })
    return response.data
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<{ deleted: boolean }> {
    const response = await this.client.request<{ data: { deleted: boolean } }>('DELETE', `/${this.entityName}/${id}`)
    return response.data
  }

  /**
   * Search records
   */
  async search(query: string, params: Omit<QueryParams, 'filters'> = {}): Promise<PaginatedResponse<T>> {
    return this.client.request<PaginatedResponse<T>>('GET', `/${this.entityName}/search`, {
      query: { ...params, q: query },
    })
  }

  /**
   * Bulk create records
   */
  async bulkCreate(records: CreateT[]): Promise<BulkResult> {
    const response = await this.client.request<{ data: BulkResult }>('POST', `/${this.entityName}/bulk`, {
      body: { records },
    })
    return response.data
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(ids: string[], data: UpdateT): Promise<BulkResult> {
    const response = await this.client.request<{ data: BulkResult }>('PATCH', `/${this.entityName}/bulk`, {
      body: { ids, data },
    })
    return response.data
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(ids: string[]): Promise<BulkResult> {
    const response = await this.client.request<{ data: BulkResult }>('DELETE', `/${this.entityName}/bulk`, {
      body: { ids },
    })
    return response.data
  }
}

/**
 * Main SDK Client
 */
export class ObliqueCRM {
  private apiKey: string
  private baseUrl: string
  private version: string
  private timeout: number
  private retryCount: number
  private onRateLimited?: (retryAfter: number) => void

  // Entity resources
  readonly accounts: EntityResource<Account>
  readonly contacts: EntityResource<Contact>
  readonly leads: EntityResource<Lead>
  readonly deals: EntityResource<Deal>
  readonly dealStages: EntityResource<DealStage>
  readonly activities: EntityResource<Activity>
  readonly users: EntityResource<User>

  constructor(config: ObliqueCRMConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.oblique.dev'
    this.version = config.version || 'v1'
    this.timeout = config.timeout || 30000
    this.retryCount = config.retryCount || 3
    this.onRateLimited = config.onRateLimited

    // Initialize entity resources
    this.accounts = new EntityResource<Account>(this, 'accounts')
    this.contacts = new EntityResource<Contact>(this, 'contacts')
    this.leads = new EntityResource<Lead>(this, 'leads')
    this.deals = new EntityResource<Deal>(this, 'deals')
    this.dealStages = new EntityResource<DealStage>(this, 'deal_stages')
    this.activities = new EntityResource<Activity>(this, 'activities')
    this.users = new EntityResource<User>(this, 'users')
  }

  /**
   * Make an authenticated API request
   */
  async request<T>(
    method: string,
    endpoint: string,
    options: {
      query?: Record<string, unknown>
      body?: unknown
    } = {}
  ): Promise<T> {
    const url = new URL(`/api/${this.version}${endpoint}`, this.baseUrl)

    // Add query parameters
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            url.searchParams.set(key, value.join(','))
          } else if (typeof value === 'object') {
            // Handle filter objects
            const filterObj = value as { operator: string; value: unknown }
            if (filterObj.operator) {
              url.searchParams.set(`filter[${key}][${filterObj.operator}]`, String(filterObj.value))
            }
          } else {
            url.searchParams.set(key, String(value))
          }
        }
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    let lastError: ObliqueCRMError | null = null
    let retries = 0

    while (retries <= this.retryCount) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': `application/vnd.oblique.${this.version}+json`,
            'X-API-Version': this.version,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Parse rate limit headers
        const rateLimit: RateLimitInfo = {
          limit: parseInt(response.headers.get('X-RateLimit-Limit') || '60'),
          remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '60'),
          reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
          this.onRateLimited?.(retryAfter)

          if (retries < this.retryCount) {
            await this.sleep(retryAfter * 1000)
            retries++
            continue
          }

          const errorData = await response.json()
          throw new ObliqueCRMError(
            errorData.error?.message || 'Rate limit exceeded',
            'rate_limited',
            429,
            undefined,
            rateLimit
          )
        }

        if (!response.ok) {
          const errorData = await response.json()
          throw new ObliqueCRMError(
            errorData.error?.message || 'API request failed',
            errorData.error?.code || 'unknown_error',
            response.status,
            errorData.error?.details,
            rateLimit
          )
        }

        const data = await response.json()

        // Transform response to consistent format
        if (data.meta) {
          return {
            data: data.data,
            meta: {
              total: data.meta.total,
              page: data.meta.page,
              limit: data.meta.limit,
              hasMore: data.meta.has_more,
            },
          } as T
        }

        return data as T
      } catch (error) {
        if (error instanceof ObliqueCRMError) {
          lastError = error
          // Only retry on server errors or rate limits
          if (error.status < 500 && error.status !== 429) {
            throw error
          }
        } else if (error instanceof Error && error.name === 'AbortError') {
          throw new ObliqueCRMError('Request timeout', 'timeout', 408)
        } else {
          throw new ObliqueCRMError(
            error instanceof Error ? error.message : 'Unknown error',
            'network_error',
            0
          )
        }

        retries++
        if (retries <= this.retryCount) {
          await this.sleep(Math.pow(2, retries) * 1000) // Exponential backoff
        }
      }
    }

    throw lastError || new ObliqueCRMError('Max retries exceeded', 'max_retries', 0)
  }

  /**
   * Get entity metadata
   */
  async getMetadata(entity?: EntityType): Promise<unknown> {
    const endpoint = entity ? `/metadata/${entity}` : '/metadata'
    return this.request('GET', endpoint)
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Generate SDK code as a string for documentation
 */
export function generateSDKCode(): string {
  return `// Oblique CRM JavaScript SDK
// Install: npm install oblique-crm-sdk

import { ObliqueCRM } from 'oblique-crm-sdk';

// Initialize the client
const crm = new ObliqueCRM({
  apiKey: 'obl_your_api_key_here',
  baseUrl: 'https://api.oblique.dev', // Optional
  version: 'v1', // Optional
  timeout: 30000, // Optional (ms)
  retryCount: 3, // Optional
  onRateLimited: (retryAfter) => {
    console.log(\`Rate limited. Retry after \${retryAfter}s\`);
  },
});

// === ACCOUNTS ===

// List accounts with pagination
const accounts = await crm.accounts.list({
  page: 1,
  limit: 25,
  sortBy: 'created_at',
  sortOrder: 'desc',
});
console.log(\`Found \${accounts.meta.total} accounts\`);

// Get a single account with expanded relationships
const account = await crm.accounts.get('uuid-here', {
  expand: ['contacts', 'deals'],
});

// Create a new account
const newAccount = await crm.accounts.create({
  name: 'Acme Corporation',
  domain: 'acme.com',
  industry: 'Technology',
});

// Update an account
const updatedAccount = await crm.accounts.update('uuid-here', {
  industry: 'Software',
});

// Delete an account
await crm.accounts.delete('uuid-here');

// Search accounts
const searchResults = await crm.accounts.search('acme');

// Bulk create accounts
const bulkResult = await crm.accounts.bulkCreate([
  { name: 'Company A', domain: 'company-a.com' },
  { name: 'Company B', domain: 'company-b.com' },
]);
console.log(\`Created \${bulkResult.successCount} accounts\`);

// === CONTACTS ===

// List contacts with filters
const contacts = await crm.contacts.list({
  filters: {
    account_id: 'uuid-here',
    title: { operator: 'ilike', value: '%engineer%' },
  },
});

// === LEADS ===

// List leads by status
const leads = await crm.leads.list({
  filters: {
    status: 'qualified',
  },
});

// === DEALS ===

// List deals with value filter
const deals = await crm.deals.list({
  filters: {
    value: { operator: 'gte', value: 10000 },
    won: null, // Open deals
  },
});

// === ERROR HANDLING ===

try {
  await crm.accounts.get('invalid-id');
} catch (error) {
  if (error instanceof ObliqueCRMError) {
    console.error(\`API Error: \${error.code} - \${error.message}\`);
    console.error(\`Status: \${error.status}\`);
    if (error.rateLimit) {
      console.error(\`Rate limit: \${error.rateLimit.remaining}/\${error.rateLimit.limit}\`);
    }
  }
}
`
}

// Export default instance creator
export function createClient(config: ObliqueCRMConfig): ObliqueCRM {
  return new ObliqueCRM(config)
}
