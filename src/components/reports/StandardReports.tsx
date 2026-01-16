import { useStandardReport, type DateRangePreset } from '@/lib/hooks/useReports'
import { type StandardReportKey } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Activity,
  DollarSign,
  RefreshCw,
  Calendar,
} from 'lucide-react'

interface StandardReportCardProps {
  reportKey: StandardReportKey
  title: string
  description: string
  icon: typeof BarChart3
  dateRange?: { start: Date; end: Date }
}

export function StandardReportCard({
  reportKey,
  title,
  description,
  icon: Icon,
  dateRange,
}: StandardReportCardProps) {
  const { data, loading, error, refresh } = useStandardReport({
    reportKey,
    dateRange,
  })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-red-500 text-sm">
            {error}
          </div>
        ) : (
          <ReportContent reportKey={reportKey} data={data} />
        )}
      </CardContent>
    </Card>
  )
}

function ReportContent({
  reportKey,
  data,
}: {
  reportKey: StandardReportKey
  data: Record<string, unknown>[]
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
        No data available
      </div>
    )
  }

  switch (reportKey) {
    case 'pipeline_by_stage':
      return <PipelineByStageChart data={data} />
    case 'deals_closed_won':
    case 'deals_closed_lost':
      return <DealsTable data={data} />
    case 'lead_conversion_rate':
      return <ConversionRateDisplay data={data[0]} />
    case 'sales_by_rep':
    case 'sales_by_team':
      return <SalesBarChart data={data} />
    case 'activity_by_type':
    case 'activity_by_rep':
      return <ActivityChart data={data} />
    case 'forecast_vs_actual':
      return <ForecastVsActualDisplay data={data[0]} />
    default:
      return <GenericTable data={data} />
  }
}

function PipelineByStageChart({ data }: { data: Record<string, unknown>[] }) {
  const maxValue = Math.max(...data.map(d => Number(d.value) || 0), 1)

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between text-xs mb-1">
            <span>{String(item.stage)}</span>
            <span className="font-medium">
              ${formatNumber(Number(item.value))} ({String(item.count)})
            </span>
          </div>
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded transition-all"
              style={{ width: `${(Number(item.value) / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DealsTable({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {data.slice(0, 5).map((deal, index) => (
        <div
          key={index}
          className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
        >
          <div>
            <div className="text-sm font-medium">{String(deal.name)}</div>
            <div className="text-xs text-gray-500">
              {deal.closed_at
                ? new Date(String(deal.closed_at)).toLocaleDateString()
                : 'N/A'}
            </div>
          </div>
          <div className="text-sm font-medium text-green-600">
            ${formatNumber(Number(deal.value))}
          </div>
        </div>
      ))}
      {data.length > 5 && (
        <div className="text-xs text-gray-500 text-center pt-2">
          +{data.length - 5} more deals
        </div>
      )}
    </div>
  )
}

function ConversionRateDisplay({ data }: { data: Record<string, unknown> }) {
  const rate = Number(data.conversion_rate) || 0
  const isGood = rate >= 10

  return (
    <div className="flex items-center justify-center h-32">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {isGood ? (
            <TrendingUp className="h-8 w-8 text-green-500" />
          ) : (
            <TrendingDown className="h-8 w-8 text-red-500" />
          )}
          <span className="text-4xl font-bold">{rate.toFixed(1)}%</span>
        </div>
        <div className="text-sm text-gray-500">
          {String(data.converted_leads)} of {String(data.total_leads)} leads converted
        </div>
      </div>
    </div>
  )
}

function SalesBarChart({ data }: { data: Record<string, unknown>[] }) {
  const maxValue = Math.max(...data.map(d => Number(d.value) || 0), 1)

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((item, index) => (
        <div key={index}>
          <div className="flex justify-between text-xs mb-1">
            <span>{String(item.name)}</span>
            <span className="font-medium">${formatNumber(Number(item.value))}</span>
          </div>
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 rounded transition-all"
              style={{ width: `${(Number(item.value) / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivityChart({ data }: { data: Record<string, unknown>[] }) {
  const total = data.reduce((sum, d) => sum + Number(d.count || 0), 0)

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((item, index) => {
        const percent = total > 0 ? (Number(item.count) / total) * 100 : 0
        return (
          <div key={index} className="flex items-center gap-2">
            <div className="w-24 text-xs truncate">
              {String(item.activity_type || item.name)}
            </div>
            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="w-12 text-xs text-right">{String(item.count)}</div>
          </div>
        )
      })}
    </div>
  )
}

function ForecastVsActualDisplay({ data }: { data: Record<string, unknown> }) {
  const forecast = Number(data.forecast) || 0
  const actual = Number(data.actual) || 0
  const variance = Number(data.variance_percentage) || 0
  const isPositive = variance >= 0

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <div className="text-xs text-gray-500 mb-1">Forecast</div>
        <div className="text-lg font-bold">${formatNumber(forecast)}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-gray-500 mb-1">Actual</div>
        <div className="text-lg font-bold text-green-600">
          ${formatNumber(actual)}
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-gray-500 mb-1">Variance</div>
        <div
          className={`text-lg font-bold flex items-center justify-center gap-1 ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {variance.toFixed(1)}%
        </div>
      </div>
    </div>
  )
}

function GenericTable({ data }: { data: Record<string, unknown>[] }) {
  const columns = Object.keys(data[0] || {}).slice(0, 4)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} className="text-left py-1">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 5).map((row, i) => (
            <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
              {columns.map(col => (
                <td key={col} className="py-1">
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// Standard reports configuration
export const STANDARD_REPORTS: {
  key: StandardReportKey
  title: string
  description: string
  icon: typeof BarChart3
  category: 'pipeline' | 'sales' | 'leads' | 'activity'
}[] = [
  {
    key: 'pipeline_by_stage',
    title: 'Pipeline by Stage',
    description: 'Deal distribution across stages',
    icon: BarChart3,
    category: 'pipeline',
  },
  {
    key: 'deals_closed_won',
    title: 'Deals Won',
    description: 'Closed won deals in period',
    icon: TrendingUp,
    category: 'sales',
  },
  {
    key: 'deals_closed_lost',
    title: 'Deals Lost',
    description: 'Closed lost deals in period',
    icon: TrendingDown,
    category: 'sales',
  },
  {
    key: 'lead_conversion_rate',
    title: 'Lead Conversion',
    description: 'Lead to opportunity conversion',
    icon: Target,
    category: 'leads',
  },
  {
    key: 'sales_by_rep',
    title: 'Sales by Rep',
    description: 'Revenue by sales representative',
    icon: Users,
    category: 'sales',
  },
  {
    key: 'sales_by_team',
    title: 'Sales by Team',
    description: 'Revenue by sales team',
    icon: Users,
    category: 'sales',
  },
  {
    key: 'activity_by_type',
    title: 'Activities by Type',
    description: 'Activity breakdown by type',
    icon: Activity,
    category: 'activity',
  },
  {
    key: 'activity_by_rep',
    title: 'Activities by Rep',
    description: 'Activity count by representative',
    icon: Activity,
    category: 'activity',
  },
  {
    key: 'forecast_vs_actual',
    title: 'Forecast vs Actual',
    description: 'Compare forecast to actual sales',
    icon: DollarSign,
    category: 'sales',
  },
]

// Date range selector component
interface DateRangeSelectorProps {
  value: DateRangePreset
  onChange: (preset: DateRangePreset) => void
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const presets: { value: DateRangePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
  ]

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-gray-500" />
      <select
        value={value}
        onChange={e => onChange(e.target.value as DateRangePreset)}
        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
      >
        {presets.map(preset => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  )
}
