// Rate Limiting Service for Oblique CRM API
// Implements sliding window rate limiting for API keys

import { supabase } from '@/lib/supabase'

export interface RateLimitConfig {
  limitPerMinute: number
  limitPerDay: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number // Unix timestamp
  retryAfter?: number // Seconds until next request allowed
}

export interface RateLimitUsage {
  requestsThisMinute: number
  requestsToday: number
  limitPerMinute: number
  limitPerDay: number
}

// Time constants
const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export class RateLimitService {
  // Check if a request is allowed and record it
  async checkAndRecord(
    apiKeyId: string,
    tenantId: string,
    config: RateLimitConfig,
    requestInfo: {
      endpoint: string
      method: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const minuteWindowStart = new Date(now - MINUTE_MS).toISOString()
    const dayWindowStart = new Date(now - DAY_MS).toISOString()

    try {
      // Get current usage counts
      const [minuteResult, dayResult] = await Promise.all([
        // Count requests in the last minute
        supabase
          .from('api_usage')
          .select('id', { count: 'exact', head: true })
          .eq('api_key_id', apiKeyId)
          .gte('created_at', minuteWindowStart),
        // Count requests in the last day
        supabase
          .from('api_usage')
          .select('id', { count: 'exact', head: true })
          .eq('api_key_id', apiKeyId)
          .gte('created_at', dayWindowStart),
      ])

      const requestsThisMinute = minuteResult.count || 0
      const requestsToday = dayResult.count || 0

      // Check if rate limited
      if (requestsThisMinute >= config.limitPerMinute) {
        // Calculate when the oldest request in the window will expire
        const resetAt = Math.ceil(now / 1000) + 60
        return {
          allowed: false,
          limit: config.limitPerMinute,
          remaining: 0,
          resetAt,
          retryAfter: 60,
        }
      }

      if (requestsToday >= config.limitPerDay) {
        // Daily limit exceeded - reset at midnight UTC
        const tomorrow = new Date()
        tomorrow.setUTCHours(24, 0, 0, 0)
        const resetAt = Math.floor(tomorrow.getTime() / 1000)
        const retryAfter = Math.ceil((tomorrow.getTime() - now) / 1000)

        return {
          allowed: false,
          limit: config.limitPerDay,
          remaining: 0,
          resetAt,
          retryAfter,
        }
      }

      // Request is allowed - record it
      await this.recordRequest(apiKeyId, tenantId, requestInfo)

      return {
        allowed: true,
        limit: config.limitPerMinute,
        remaining: config.limitPerMinute - requestsThisMinute - 1,
        resetAt: Math.ceil(now / 1000) + 60,
      }
    } catch (err) {
      // On error, allow the request but log it
      console.error('Rate limit check failed:', err)
      return {
        allowed: true,
        limit: config.limitPerMinute,
        remaining: config.limitPerMinute,
        resetAt: Math.ceil(now / 1000) + 60,
      }
    }
  }

  // Record an API request
  async recordRequest(
    apiKeyId: string,
    tenantId: string,
    requestInfo: {
      endpoint: string
      method: string
      statusCode?: number
      responseTimeMs?: number
      requestSizeBytes?: number
      responseSizeBytes?: number
      ipAddress?: string
      userAgent?: string
      errorMessage?: string
    }
  ): Promise<void> {
    try {
      await supabase.from('api_usage').insert({
        api_key_id: apiKeyId,
        tenant_id: tenantId,
        endpoint: requestInfo.endpoint,
        method: requestInfo.method,
        status_code: requestInfo.statusCode,
        response_time_ms: requestInfo.responseTimeMs,
        request_size_bytes: requestInfo.requestSizeBytes,
        response_size_bytes: requestInfo.responseSizeBytes,
        ip_address: requestInfo.ipAddress,
        user_agent: requestInfo.userAgent,
        error_message: requestInfo.errorMessage,
      })
    } catch (err) {
      console.error('Failed to record API usage:', err)
    }
  }

  // Update a recorded request with response details
  async updateRequestRecord(
    requestId: string,
    updates: {
      statusCode: number
      responseTimeMs: number
      responseSizeBytes?: number
      errorMessage?: string
    }
  ): Promise<void> {
    try {
      await supabase
        .from('api_usage')
        .update({
          status_code: updates.statusCode,
          response_time_ms: updates.responseTimeMs,
          response_size_bytes: updates.responseSizeBytes,
          error_message: updates.errorMessage,
        })
        .eq('id', requestId)
    } catch (err) {
      console.error('Failed to update API usage record:', err)
    }
  }

  // Get current rate limit usage for an API key
  async getUsage(apiKeyId: string, config: RateLimitConfig): Promise<RateLimitUsage> {
    const now = Date.now()
    const minuteWindowStart = new Date(now - MINUTE_MS).toISOString()
    const dayWindowStart = new Date(now - DAY_MS).toISOString()

    try {
      const [minuteResult, dayResult] = await Promise.all([
        supabase
          .from('api_usage')
          .select('id', { count: 'exact', head: true })
          .eq('api_key_id', apiKeyId)
          .gte('created_at', minuteWindowStart),
        supabase
          .from('api_usage')
          .select('id', { count: 'exact', head: true })
          .eq('api_key_id', apiKeyId)
          .gte('created_at', dayWindowStart),
      ])

      return {
        requestsThisMinute: minuteResult.count || 0,
        requestsToday: dayResult.count || 0,
        limitPerMinute: config.limitPerMinute,
        limitPerDay: config.limitPerDay,
      }
    } catch {
      return {
        requestsThisMinute: 0,
        requestsToday: 0,
        limitPerMinute: config.limitPerMinute,
        limitPerDay: config.limitPerDay,
      }
    }
  }

  // Get usage statistics for an API key over a time period
  async getUsageStats(
    apiKeyId: string,
    days: number = 30
  ): Promise<{
    data: {
      totalRequests: number
      successfulRequests: number
      failedRequests: number
      avgResponseTimeMs: number
      requestsByEndpoint: Record<string, number>
      requestsByDay: { date: string; count: number; avgResponseTime: number }[]
      errorsByCode: Record<string, number>
    } | null
    error: string | null
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('api_usage')
        .select('endpoint, method, status_code, response_time_ms, error_message, created_at')
        .eq('api_key_id', apiKeyId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      // Calculate statistics
      const totalRequests = data.length
      const successfulRequests = data.filter(r => r.status_code && r.status_code >= 200 && r.status_code < 400).length
      const failedRequests = totalRequests - successfulRequests

      const responseTimes = data.filter(r => r.response_time_ms).map(r => r.response_time_ms!)
      const avgResponseTimeMs = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0

      // Group by endpoint
      const requestsByEndpoint: Record<string, number> = {}
      data.forEach(r => {
        const key = `${r.method} ${r.endpoint}`
        requestsByEndpoint[key] = (requestsByEndpoint[key] || 0) + 1
      })

      // Group by day
      const byDayMap = new Map<string, { count: number; totalTime: number }>()
      data.forEach(r => {
        const date = r.created_at.split('T')[0]
        const existing = byDayMap.get(date) || { count: 0, totalTime: 0 }
        existing.count++
        existing.totalTime += r.response_time_ms || 0
        byDayMap.set(date, existing)
      })

      const requestsByDay = Array.from(byDayMap.entries())
        .map(([date, stats]) => ({
          date,
          count: stats.count,
          avgResponseTime: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Group errors by code
      const errorsByCode: Record<string, number> = {}
      data.filter(r => r.status_code && r.status_code >= 400).forEach(r => {
        const key = String(r.status_code)
        errorsByCode[key] = (errorsByCode[key] || 0) + 1
      })

      return {
        data: {
          totalRequests,
          successfulRequests,
          failedRequests,
          avgResponseTimeMs,
          requestsByEndpoint,
          requestsByDay,
          errorsByCode,
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Clean up old usage records (for maintenance)
  async cleanupOldRecords(retentionDays: number = 90): Promise<{ deleted: number; error: string | null }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const { error, count } = await supabase
        .from('api_usage')
        .delete({ count: 'exact' })
        .lt('created_at', cutoffDate.toISOString())

      if (error) {
        return { deleted: 0, error: error.message }
      }

      return { deleted: count || 0, error: null }
    } catch (err) {
      return { deleted: 0, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get rate limit headers for HTTP response
  getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetAt),
    }

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = String(result.retryAfter)
    }

    return headers
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService()
