// API Key Management Service
// Handles creation, validation, and management of API keys

import { supabase } from '@/lib/supabase'
import type { ApiScope, CreateApiKeyRequest, ApiKeyResponse, ApiKeyCreatedResponse } from './types'

// Generate a cryptographically secure API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const keyLength = 32
  const randomValues = new Uint8Array(keyLength)
  crypto.getRandomValues(randomValues)

  let key = 'obl_' // Prefix for Oblique CRM API keys
  for (let i = 0; i < keyLength; i++) {
    key += chars[randomValues[i] % chars.length]
  }
  return key
}

// Hash an API key using SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// API Key Service
export const apiKeyService = {
  // Create a new API key
  async createApiKey(
    request: CreateApiKeyRequest,
    userId: string,
    tenantId: string
  ): Promise<{ data: ApiKeyCreatedResponse | null; error: string | null }> {
    try {
      // Generate the API key
      const apiKey = generateApiKey()
      const keyHash = await hashApiKey(apiKey)
      const keyPrefix = apiKey.substring(0, 8)

      // Insert into database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          name: request.name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          scopes: request.scopes,
          rate_limit_per_minute: request.rate_limit_per_minute || 60,
          rate_limit_per_day: request.rate_limit_per_day || 10000,
          expires_at: request.expires_at || null,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      // Return the created key (includes the actual key, which is only shown once)
      return {
        data: {
          id: data.id,
          name: data.name,
          key: apiKey, // Only returned on creation
          key_prefix: data.key_prefix,
          scopes: data.scopes,
          rate_limit_per_minute: data.rate_limit_per_minute,
          rate_limit_per_day: data.rate_limit_per_day,
          last_used_at: data.last_used_at,
          expires_at: data.expires_at,
          created_at: data.created_at,
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // List all API keys for a user
  async listApiKeys(tenantId: string): Promise<{ data: ApiKeyResponse[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, last_used_at, expires_at, created_at, revoked_at')
        .eq('tenant_id', tenantId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: data.map(key => ({
          id: key.id,
          name: key.name,
          key_prefix: key.key_prefix,
          scopes: key.scopes,
          rate_limit_per_minute: key.rate_limit_per_minute,
          rate_limit_per_day: key.rate_limit_per_day,
          last_used_at: key.last_used_at,
          expires_at: key.expires_at,
          created_at: key.created_at,
        })),
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Get a specific API key
  async getApiKey(keyId: string): Promise<{ data: ApiKeyResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, last_used_at, expires_at, created_at')
        .eq('id', keyId)
        .is('revoked_at', null)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Revoke an API key
  async revokeApiKey(keyId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Update API key scopes or rate limits
  async updateApiKey(
    keyId: string,
    updates: {
      name?: string
      scopes?: ApiScope[]
      rate_limit_per_minute?: number
      rate_limit_per_day?: number
    }
  ): Promise<{ data: ApiKeyResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', keyId)
        .select('id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, last_used_at, expires_at, created_at')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Validate an API key (for API authentication)
  async validateApiKey(apiKey: string): Promise<{
    valid: boolean
    keyData?: {
      id: string
      tenantId: string
      userId: string
      scopes: string[]
      rateLimitPerMinute: number
      rateLimitPerDay: number
    }
    error?: string
  }> {
    try {
      const keyHash = await hashApiKey(apiKey)

      const { data, error } = await supabase
        .from('api_keys')
        .select('id, tenant_id, user_id, scopes, rate_limit_per_minute, rate_limit_per_day, expires_at, revoked_at')
        .eq('key_hash', keyHash)
        .single()

      if (error || !data) {
        return { valid: false, error: 'Invalid API key' }
      }

      // Check if key is revoked
      if (data.revoked_at) {
        return { valid: false, error: 'API key has been revoked' }
      }

      // Check if key is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' }
      }

      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id)

      return {
        valid: true,
        keyData: {
          id: data.id,
          tenantId: data.tenant_id,
          userId: data.user_id,
          scopes: data.scopes,
          rateLimitPerMinute: data.rate_limit_per_minute,
          rateLimitPerDay: data.rate_limit_per_day,
        },
      }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },

  // Check if a scope is allowed
  hasScope(allowedScopes: string[], requiredScope: ApiScope): boolean {
    return allowedScopes.includes(requiredScope)
  },

  // Get API usage statistics for an API key
  async getApiKeyUsage(
    keyId: string,
    days: number = 30
  ): Promise<{
    data: {
      totalRequests: number
      successfulRequests: number
      failedRequests: number
      avgResponseTimeMs: number
      requestsByEndpoint: Record<string, number>
      requestsByDay: { date: string; count: number }[]
    } | null
    error: string | null
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('api_usage')
        .select('endpoint, method, status_code, response_time_ms, created_at')
        .eq('api_key_id', keyId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      // Calculate statistics
      const totalRequests = data.length
      const successfulRequests = data.filter(r => r.status_code >= 200 && r.status_code < 400).length
      const failedRequests = totalRequests - successfulRequests
      const avgResponseTimeMs = data.length > 0
        ? Math.round(data.reduce((acc, r) => acc + (r.response_time_ms || 0), 0) / data.length)
        : 0

      // Group by endpoint
      const requestsByEndpoint: Record<string, number> = {}
      data.forEach(r => {
        const key = `${r.method} ${r.endpoint}`
        requestsByEndpoint[key] = (requestsByEndpoint[key] || 0) + 1
      })

      // Group by day
      const requestsByDayMap: Record<string, number> = {}
      data.forEach(r => {
        const date = new Date(r.created_at).toISOString().split('T')[0]
        requestsByDayMap[date] = (requestsByDayMap[date] || 0) + 1
      })
      const requestsByDay = Object.entries(requestsByDayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        data: {
          totalRequests,
          successfulRequests,
          failedRequests,
          avgResponseTimeMs,
          requestsByEndpoint,
          requestsByDay,
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  },
}
