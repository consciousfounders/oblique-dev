import React, { useMemo } from 'react'
import { type ReportResult, type ChartType } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, Clock } from 'lucide-react'

interface ReportViewerProps {
  title: string
  result: ReportResult | null
  chartType: ChartType
  loading: boolean
  onRefresh: () => void
  onExport: (format: 'csv' | 'excel') => void
}

export function ReportViewer({
  title,
  result,
  chartType,
  loading,
  onRefresh,
  onExport,
}: ReportViewerProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-4 text-gray-500">Running report...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <p>No data to display</p>
            <p className="text-sm mt-2">Run the report to see results</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{result.totalCount} records</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.executionTimeMs}ms
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartType === 'table' ? (
          <ReportTable data={result.data} />
        ) : (
          <ReportChart
            data={result.data}
            chartType={chartType}
            summary={result.summary}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ReportTable({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No records found
      </div>
    )
  }

  const columns = Object.keys(data[0]).filter(
    key => key !== 'items' && !key.startsWith('_')
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {columns.map(column => (
              <th
                key={column}
                className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
              >
                {formatColumnName(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {columns.map(column => (
                <td key={column} className="px-4 py-3">
                  {formatCellValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportChart({
  data,
  chartType,
  summary,
}: {
  data: Record<string, unknown>[]
  chartType: ChartType
  summary?: Record<string, number>
}) {
  // For now, render a simple visual representation
  // In a production app, you'd use a charting library like recharts
  const chartData = useMemo(() => {
    if (summary) {
      return Object.entries(summary).map(([key, value]) => ({
        label: key,
        value,
      }))
    }

    // Try to extract numeric data from the results
    if (data.length === 0) return []

    const firstItem = data[0]
    const numericKeys = Object.keys(firstItem).filter(
      key =>
        typeof firstItem[key] === 'number' && key !== 'id' && key !== 'count'
    )
    const labelKey = Object.keys(firstItem).find(
      key =>
        typeof firstItem[key] === 'string' &&
        key !== 'id' &&
        !key.includes('_id')
    )

    if (!labelKey || numericKeys.length === 0) {
      return data.slice(0, 10).map((item, idx) => ({
        label: item[labelKey || 'name'] || `Item ${idx + 1}`,
        value: item[numericKeys[0] || 'count'] || 0,
      }))
    }

    return data.slice(0, 10).map(item => ({
      label: item[labelKey],
      value: item[numericKeys[0]],
    }))
  }, [data, summary])

  const maxValue = Math.max(...chartData.map(d => Number(d.value) || 0), 1)

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No chart data available
      </div>
    )
  }

  if (chartType === 'bar') {
    return (
      <div className="space-y-3">
        {chartData.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">
                {String(item.label)}
              </span>
              <span className="font-medium">
                {formatNumber(Number(item.value))}
              </span>
            </div>
            <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded transition-all duration-500"
                style={{
                  width: `${(Number(item.value) / maxValue) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (chartType === 'pie') {
    const total = chartData.reduce((sum, d) => sum + Number(d.value), 0)
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-orange-500',
    ]

    return (
      <div className="flex items-center gap-8">
        <div className="w-48 h-48 relative">
          <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
            {chartData.reduce(
              (acc, item, index) => {
                const percentage = (Number(item.value) / total) * 100
                const dashArray = `${percentage} ${100 - percentage}`
                const dashOffset = acc.offset

                acc.elements.push(
                  <circle
                    key={index}
                    r="16"
                    cx="16"
                    cy="16"
                    fill="transparent"
                    stroke={colors[index % colors.length].replace('bg-', '')}
                    strokeWidth="32"
                    strokeDasharray={dashArray}
                    strokeDashoffset={-dashOffset}
                    className={colors[index % colors.length].replace(
                      'bg-',
                      'stroke-'
                    )}
                  />
                )

                acc.offset += percentage
                return acc
              },
              { elements: [] as React.ReactElement[], offset: 0 }
            ).elements}
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded ${colors[index % colors.length]}`}
              />
              <span className="text-sm flex-1">{String(item.label)}</span>
              <span className="text-sm font-medium">
                {formatNumber(Number(item.value))}
              </span>
              <span className="text-sm text-gray-500">
                ({Math.round((Number(item.value) / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (chartType === 'line') {
    const points = chartData.map((item, index) => {
      const x = (index / (chartData.length - 1 || 1)) * 100
      const y = 100 - (Number(item.value) / maxValue) * 100
      return { x, y, ...item }
    })

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')

    return (
      <div>
        <svg viewBox="0 0 100 50" className="w-full h-48" preserveAspectRatio="none">
          <path
            d={pathD}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="0.5"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1"
              fill="rgb(59, 130, 246)"
            />
          ))}
        </svg>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {chartData.slice(0, 5).map((item, i) => (
            <span key={i}>{String(item.label)}</span>
          ))}
        </div>
      </div>
    )
  }

  if (chartType === 'funnel') {
    return (
      <div className="space-y-2">
        {chartData.map((item, index) => {
          const widthPercent = 100 - (index / chartData.length) * 40
          return (
            <div
              key={index}
              className="flex items-center gap-4"
              style={{ paddingLeft: `${index * 2}%` }}
            >
              <div
                className="h-10 bg-blue-500 rounded flex items-center justify-between px-4 text-white text-sm"
                style={{ width: `${widthPercent}%` }}
              >
                <span>{String(item.label)}</span>
                <span className="font-medium">
                  {formatNumber(Number(item.value))}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (chartType === 'gauge') {
    const value = Number(chartData[0]?.value || 0)
    const percentage = Math.min((value / maxValue) * 100, 100)

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-24 overflow-hidden">
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 50" className="w-full h-full">
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${percentage * 1.256} 125.6`}
              />
            </svg>
          </div>
        </div>
        <div className="text-center mt-2">
          <div className="text-3xl font-bold">{formatNumber(value)}</div>
          <div className="text-sm text-gray-500">
            {String(chartData[0]?.label || 'Value')}
          </div>
        </div>
      </div>
    )
  }

  // Default: table view
  return <ReportTable data={data} />
}

function formatColumnName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return formatNumber(value)
  if (value instanceof Date) return value.toLocaleDateString()
  if (typeof value === 'string') {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString()
    }
    return value
  }
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}
