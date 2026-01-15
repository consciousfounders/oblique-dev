// API Key Management Service
// Handles creation, validation, and management of API keys

import { supabase } from '@/lib/supabase'
import type { ApiScope, ApiKeyResponse, ApiKeyCreatedResponse, CreateApiKeyRequest } from './types'

// Generate a secure random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return 'obl_' + Array.from(array, byte => chars[byte % chars.length]).join('')
}

// Hash a key using SHA-256
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ApiKeyWithStats extends ApiKeyResponse {
  usage_count_today?: number
  usage_count_month?: number
}

export class ApiKeyService {
  // Create a new API key
  async createKey(
    request: CreateApiKeyRequest,
    tenantId: string,
    userId: string
  ): Promise<{ data: ApiKeyCreatedResponse | null; error: string | null }> {
    try {
      const rawKey = generateApiKey()
      const keyHash = await hashKey(rawKey)
      const keyPrefix = rawKey.substring(0, 8)

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

      return {
        data: {
          id: data.id,
          name: data.name,
          key: rawKey, // Only returned on creation
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
  }

  // List all API keys for the current user
  async listKeys(): Promise<{ data: ApiKeyResponse[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
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
  }

  // Get a single API key by ID
  async getKey(id: string): Promise<{ data: ApiKeyResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: {
          id: data.id,
          name: data.name,
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
  }

  // Update an API key (name, scopes, rate limits)
  async updateKey(
    id: string,
    updates: Partial<Pick<CreateApiKeyRequest, 'name' | 'scopes' | 'rate_limit_per_minute' | 'rate_limit_per_day'>>
  ): Promise<{ data: ApiKeyResponse | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: {
          id: data.id,
          name: data.name,
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
  }

  // Revoke an API key
  async revokeKey(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Delete an API key permanently
  async deleteKey(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Validate an API key and return its details
  async validateKey(rawKey: string): Promise<{
    valid: boolean
    keyId?: string
    tenantId?: string
    scopes?: ApiScope[]
    error?: string
  }> {
    try {
      const keyHash = await hashKey(rawKey)

      const { data, error } = await supabase
        .from('api_keys')
        .select('id, tenant_id, scopes, expires_at, revoked_at')
        .eq('key_hash', keyHash)
        .single()

      if (error || !data) {
        return { valid: false, error: 'Invalid API key' }
      }

      // Check if revoked
      if (data.revoked_at) {
        return { valid: false, error: 'API key has been revoked' }
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' }
      }

      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id)

      return {
        valid: true,
        keyId: data.id,
        tenantId: data.tenant_id,
        scopes: data.scopes as ApiScope[],
      }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get usage statistics for an API key
  async getKeyUsage(
    keyId: string,
    days: number = 30
  ): Promise<{
    data: { date: string; count: number; avg_response_time: number }[] | null
    error: string | null
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('api_usage')
        .select('created_at, response_time_ms')
        .eq('api_key_id', keyId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        return { data: null, error: error.message }
      }

      // Group by date
      const byDate = new Map<string, { count: number; totalTime: number }>()
      for (const record of data) {
        const date = record.created_at.split('T')[0]
        const existing = byDate.get(date) || { count: 0, totalTime: 0 }
        existing.count++
        existing.totalTime += record.response_time_ms || 0
        byDate.set(date, existing)
      }

      const result = Array.from(byDate.entries()).map(([date, stats]) => ({
        date,
        count: stats.count,
        avg_response_time: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
      }))

      return { data: result, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService()
