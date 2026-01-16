import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { usePipelines, type PipelineAnalytics as AnalyticsType } from '@/lib/hooks/usePipelines'
import {
  TrendingUp,
  Clock,
  Target,
  DollarSign,
  ArrowRight,
  BarChart2,
} from 'lucide-react'

interface PipelineAnalyticsProps {
  pipelineId: string
}

export function PipelineAnalytics({ pipelineId }: PipelineAnalyticsProps) {
  const { getAnalytics, pipelines } = usePipelines()
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null)
  const [loading, setLoading] = useState(true)

  const pipeline = pipelines.find(p => p.id === pipelineId)

  useEffect(() => {
    loadAnalytics()
  }, [pipelineId])

  async function loadAnalytics() {
    setLoading(true)
    const data = await getAnalytics(pipelineId)
    setAnalytics(data)
    setLoading(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatDays = (value: number | null) => {
    if (value === null) return '-'
    return `${value.toFixed(1)} days`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  if (!analytics || !pipeline) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No analytics data available
        </CardContent>
      </Card>
    )
  }

  // Calculate pipeline velocity (weighted value / average time)
  const avgTimeAcrossStages = analytics.stageMetrics.reduce((sum, m) => sum + (m.avgTimeInStage || 0), 0) / (analytics.stageMetrics.filter(m => m.avgTimeInStage !== null).length || 1)
  const pipelineVelocity = avgTimeAcrossStages > 0 ? analytics.weightedValue / avgTimeAcrossStages : 0

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="w-4 h-4" />
              Total Pipeline
            </div>
            <p className="text-2xl font-bold">{formatCurrency(analytics.totalValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalDeals} deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Weighted Value
            </div>
            <p className="text-2xl font-bold">{formatCurrency(analytics.weightedValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on stage probability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              Avg Deal Size
            </div>
            <p className="text-2xl font-bold">{formatCurrency(analytics.avgDealSize)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Per deal average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart2 className="w-4 h-4" />
              Pipeline Velocity
            </div>
            <p className="text-2xl font-bold">{formatCurrency(pipelineVelocity)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Weighted value / day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Stage Conversion Funnel
          </CardTitle>
          <CardDescription>
            Conversion rates and time spent in each stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.stageMetrics.map((metric, index) => {
              const stage = pipeline.stages.find(s => s.id === metric.stageId)
              const isLast = index === analytics.stageMetrics.length - 1

              return (
                <div key={metric.stageId}>
                  <div className="flex items-center gap-4">
                    {/* Stage indicator */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage?.color || '#6b7280' }}
                    />

                    {/* Stage info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{metric.stageName}</h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {metric.dealCount} deals
                          </span>
                          <span className="font-medium">
                            {formatCurrency(metric.totalValue)}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(metric.dealCount / analytics.totalDeals) * 100}%`,
                              backgroundColor: stage?.color || '#6b7280',
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {analytics.totalDeals > 0
                            ? formatPercent((metric.dealCount / analytics.totalDeals) * 100)
                            : '0%'}
                        </span>
                      </div>

                      {/* Time in stage */}
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Avg time: {formatDays(metric.avgTimeInStage)}
                        </span>
                        {!isLast && metric.conversionRate > 0 && (
                          <span className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" />
                            {formatPercent(metric.conversionRate)} conversion
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conversion arrow */}
                  {!isLast && (
                    <div className="ml-1.5 my-2 border-l-2 border-dashed border-muted h-4" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Value Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Value Distribution by Stage
          </CardTitle>
          <CardDescription>
            How deal value is distributed across pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.stageMetrics.map(metric => {
              const stage = pipeline.stages.find(s => s.id === metric.stageId)
              const percentage = analytics.totalValue > 0
                ? (metric.totalValue / analytics.totalValue) * 100
                : 0

              return (
                <div key={metric.stageId} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage?.color || '#6b7280' }}
                  />
                  <span className="text-sm w-32 truncate">{metric.stageName}</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full flex items-center justify-end px-2 text-xs font-medium transition-all"
                      style={{
                        width: `${Math.max(percentage, 10)}%`,
                        backgroundColor: stage?.color || '#6b7280',
                        color: 'white',
                      }}
                    >
                      {formatCurrency(metric.totalValue)}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground w-14 text-right">
                    {formatPercent(percentage)}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
