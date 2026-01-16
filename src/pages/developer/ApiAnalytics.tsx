import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiKeyService } from '@/lib/api/keys'
import { rateLimitService } from '@/lib/api/rateLimit'
import {
  BarChart3,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
} from 'lucide-react'

interface UsageStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  avgResponseTimeMs: number
  requestsByEndpoint: Record<string, number>
  requestsByDay: { date: string; count: number; avgResponseTime: number }[]
  errorsByCode: Record<string, number>
}

interface ApiKeyStats {
  keyId: string
  keyName: string
  keyPrefix: string
  stats: UsageStats | null
  loading: boolean
}

export function ApiAnalytics() {
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string
    name: string
    key_prefix: string
    rate_limit_per_minute: number
    rate_limit_per_day: number
  }>>([])
  const [keyStats, setKeyStats] = useState<Map<string, ApiKeyStats>>(new Map())
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<number>(30)
  const [loading, setLoading] = useState(true)

  // Load API keys
  useEffect(() => {
    async function loadApiKeys() {
      setLoading(true)
      const { data } = await apiKeyService.listKeys()
      if (data) {
        setApiKeys(data)
        if (data.length > 0 && !selectedKeyId) {
          setSelectedKeyId(data[0].id)
        }
      }
      setLoading(false)
    }
    loadApiKeys()
  }, [])

  // Load stats for selected key
  useEffect(() => {
    async function loadStats() {
      if (!selectedKeyId) return

      const existingStats = keyStats.get(selectedKeyId)
      if (existingStats?.stats && !existingStats.loading) return

      setKeyStats(prev => {
        const newMap = new Map(prev)
        const key = apiKeys.find(k => k.id === selectedKeyId)
        newMap.set(selectedKeyId, {
          keyId: selectedKeyId,
          keyName: key?.name || 'Unknown',
          keyPrefix: key?.key_prefix || '',
          stats: null,
          loading: true,
        })
        return newMap
      })

      const key = apiKeys.find(k => k.id === selectedKeyId)
      const result = await rateLimitService.getUsageStats(selectedKeyId, dateRange)

      setKeyStats(prev => {
        const newMap = new Map(prev)
        newMap.set(selectedKeyId, {
          keyId: selectedKeyId,
          keyName: key?.name || 'Unknown',
          keyPrefix: key?.key_prefix || '',
          stats: result.data ? {
            totalRequests: result.data.totalRequests,
            successfulRequests: result.data.successfulRequests,
            failedRequests: result.data.failedRequests,
            avgResponseTimeMs: result.data.avgResponseTimeMs,
            requestsByEndpoint: result.data.requestsByEndpoint,
            requestsByDay: result.data.requestsByDay,
            errorsByCode: result.data.errorsByCode,
          } : null,
          loading: false,
        })
        return newMap
      })
    }
    loadStats()
  }, [selectedKeyId, dateRange, apiKeys])

  const refreshStats = async () => {
    if (!selectedKeyId) return

    setKeyStats(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(selectedKeyId)
      if (existing) {
        newMap.set(selectedKeyId, { ...existing, loading: true })
      }
      return newMap
    })

    const key = apiKeys.find(k => k.id === selectedKeyId)
    const result = await rateLimitService.getUsageStats(selectedKeyId, dateRange)

    setKeyStats(prev => {
      const newMap = new Map(prev)
      newMap.set(selectedKeyId, {
        keyId: selectedKeyId,
        keyName: key?.name || 'Unknown',
        keyPrefix: key?.key_prefix || '',
        stats: result.data ? {
          totalRequests: result.data.totalRequests,
          successfulRequests: result.data.successfulRequests,
          failedRequests: result.data.failedRequests,
          avgResponseTimeMs: result.data.avgResponseTimeMs,
          requestsByEndpoint: result.data.requestsByEndpoint,
          requestsByDay: result.data.requestsByDay,
          errorsByCode: result.data.errorsByCode,
        } : null,
        loading: false,
      })
      return newMap
    })
  }

  const currentKeyStats = selectedKeyId ? keyStats.get(selectedKeyId) : null
  const stats = currentKeyStats?.stats

  // Calculate metrics
  const successRate = stats && stats.totalRequests > 0
    ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
    : '0.0'

  const errorRate = stats && stats.totalRequests > 0
    ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)
    : '0.0'

  // Get top endpoints
  const topEndpoints = stats
    ? Object.entries(stats.requestsByEndpoint)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : []

  // Get daily trend
  const dailyData = stats?.requestsByDay || []
  const maxDaily = Math.max(...dailyData.map(d => d.count), 1)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    )
  }

  if (apiKeys.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No API Keys</h3>
          <p className="text-muted-foreground text-sm">
            Create an API key to start tracking usage analytics.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                API Analytics
              </CardTitle>
              <CardDescription>
                Monitor API usage, performance, and errors
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedKeyId || ''}
                onChange={(e) => setSelectedKeyId(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {apiKeys.map(key => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.key_prefix}...)
                  </option>
                ))}
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(parseInt(e.target.value))}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Button variant="outline" size="sm" onClick={refreshStats}>
                <RefreshCw className={`w-4 h-4 ${currentKeyStats?.loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">
                  {stats?.totalRequests.toLocaleString() || '0'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {successRate}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.successfulRequests.toLocaleString() || '0'} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className={`text-2xl font-bold ${
                  parseFloat(errorRate) > 5 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                }`}>
                  {errorRate}%
                </p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${
                parseFloat(errorRate) > 5 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              }`} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.failedRequests.toLocaleString() || '0'} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {stats?.avgResponseTimeMs || 0}ms
                </p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(stats?.avgResponseTimeMs || 0) < 200 ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <TrendingDown className="w-3 h-3" /> Good performance
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <TrendingUp className="w-3 h-3" /> Could be improved
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Daily Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-end h-40 gap-1">
                  {dailyData.slice(-14).map((day) => (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                        style={{
                          height: `${(day.count / maxDaily) * 100}%`,
                          minHeight: day.count > 0 ? '4px' : '0',
                        }}
                        title={`${day.date}: ${day.count} requests`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{dailyData[Math.max(0, dailyData.length - 14)]?.date || ''}</span>
                  <span>{dailyData[dailyData.length - 1]?.date || ''}</span>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            {topEndpoints.length > 0 ? (
              <div className="space-y-3">
                {topEndpoints.map(([endpoint, count]) => (
                  <div key={endpoint} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]">
                        {endpoint}
                      </code>
                      <span className="text-muted-foreground">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${(count / topEndpoints[0][1]) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                No endpoint data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Breakdown */}
      {stats?.errorsByCode && Object.keys(stats.errorsByCode).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Error Breakdown
            </CardTitle>
            <CardDescription>
              HTTP status codes for failed requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.errorsByCode).map(([code, count]) => (
                <div
                  key={code}
                  className="p-3 rounded-lg border bg-muted/30"
                >
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {count}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    HTTP {code}
                    <span className="block text-xs">
                      {code === '400' && 'Bad Request'}
                      {code === '401' && 'Unauthorized'}
                      {code === '403' && 'Forbidden'}
                      {code === '404' && 'Not Found'}
                      {code === '429' && 'Rate Limited'}
                      {code === '500' && 'Server Error'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Limit Status */}
      {selectedKeyId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate Limit Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Per Minute</p>
                <p className="text-xl font-bold">
                  {apiKeys.find(k => k.id === selectedKeyId)?.rate_limit_per_minute || 60}
                </p>
                <p className="text-xs text-muted-foreground">requests/min</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Per Day</p>
                <p className="text-xl font-bold">
                  {(apiKeys.find(k => k.id === selectedKeyId)?.rate_limit_per_day || 10000).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">requests/day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
