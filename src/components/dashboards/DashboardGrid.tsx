import { useState } from 'react'
import {
  type DashboardWidget,
  type WidgetType,
  type ChartType,
  type DashboardWidgetLayout,
} from '@/lib/supabase'
import { useKPIData, type KPIMetric } from '@/lib/hooks/useDashboards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  GripVertical,
  Trash2,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Maximize2,
  Minimize2,
} from 'lucide-react'

interface DashboardGridProps {
  widgets: DashboardWidget[]
  isEditMode: boolean
  dateRange?: { start: Date; end: Date }
  onWidgetUpdate?: (id: string, updates: Partial<DashboardWidget>) => void
  onWidgetDelete?: (id: string) => void
  onLayoutChange?: (layout: DashboardWidgetLayout[]) => void
}

export function DashboardGrid({
  widgets,
  isEditMode,
  dateRange,
  onWidgetUpdate,
  onWidgetDelete,
  onLayoutChange,
}: DashboardGridProps) {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)

  const handleDragStart = (widgetId: string) => {
    if (!isEditMode) return
    setDraggedWidget(widgetId)
  }

  const handleDragEnd = () => {
    setDraggedWidget(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetId: string) => {
    if (!draggedWidget || draggedWidget === targetId) return

    // Swap positions
    const layout: DashboardWidgetLayout[] = widgets.map(w => ({
      widget_id: w.id,
      x: w.position_x,
      y: w.position_y,
      w: w.width,
      h: w.height,
    }))

    const draggedIndex = layout.findIndex(l => l.widget_id === draggedWidget)
    const targetIndex = layout.findIndex(l => l.widget_id === targetId)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const temp = { ...layout[draggedIndex] }
      layout[draggedIndex] = {
        ...layout[draggedIndex],
        x: layout[targetIndex].x,
        y: layout[targetIndex].y,
      }
      layout[targetIndex] = {
        ...layout[targetIndex],
        x: temp.x,
        y: temp.y,
      }
      onLayoutChange?.(layout)
    }

    setDraggedWidget(null)
  }

  // Sort widgets by position
  const sortedWidgets = [...widgets].sort((a, b) => {
    if (a.position_y !== b.position_y) return a.position_y - b.position_y
    return a.position_x - b.position_x
  })

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {sortedWidgets.map(widget => (
        <div
          key={widget.id}
          className={`col-span-${widget.width} ${
            draggedWidget === widget.id ? 'opacity-50' : ''
          }`}
          style={{
            gridColumn: `span ${Math.min(widget.width, 12)}`,
          }}
          draggable={isEditMode}
          onDragStart={() => handleDragStart(widget.id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(widget.id)}
        >
          <WidgetRenderer
            widget={widget}
            isEditMode={isEditMode}
            dateRange={dateRange}
            onUpdate={onWidgetUpdate}
            onDelete={onWidgetDelete}
          />
        </div>
      ))}
    </div>
  )
}

interface WidgetRendererProps {
  widget: DashboardWidget
  isEditMode: boolean
  dateRange?: { start: Date; end: Date }
  onUpdate?: (id: string, updates: Partial<DashboardWidget>) => void
  onDelete?: (id: string) => void
}

function WidgetRenderer({
  widget,
  isEditMode,
  dateRange,
  onUpdate,
  onDelete,
}: WidgetRendererProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Card className={`h-full ${isEditMode ? 'border-dashed border-2 border-blue-300' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditMode && (
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
            )}
            <CardTitle className="text-sm">{widget.title}</CardTitle>
          </div>
          {isEditMode && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={() => {
                      // Toggle size
                      const newWidth = widget.width >= 6 ? 4 : 6
                      onUpdate?.(widget.id, { width: newWidth })
                      setShowMenu(false)
                    }}
                  >
                    {widget.width >= 6 ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                    Resize
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                    onClick={() => {
                      onDelete?.(widget.id)
                      setShowMenu(false)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <WidgetContent widget={widget} dateRange={dateRange} />
      </CardContent>
    </Card>
  )
}

function WidgetContent({
  widget,
  dateRange,
}: {
  widget: DashboardWidget
  dateRange?: { start: Date; end: Date }
}) {
  switch (widget.widget_type) {
    case 'kpi':
      return (
        <KPIWidget
          metric={widget.kpi_metric as KPIMetric}
          target={widget.kpi_target || undefined}
          comparisonType={widget.kpi_comparison_type || 'previous_period'}
          dateRange={dateRange}
        />
      )
    case 'chart':
      return (
        <ChartWidget
          reportId={widget.report_id || undefined}
          chartType={widget.chart_type || 'bar'}
          config={widget.chart_config || {}}
        />
      )
    case 'list':
      return <ListWidget config={widget.config} />
    case 'activity_feed':
      return <ActivityFeedWidget config={widget.config} />
    default:
      return (
        <div className="text-center text-gray-500 py-4">
          Unknown widget type
        </div>
      )
  }
}

interface KPIWidgetProps {
  metric: KPIMetric
  target?: number
  comparisonType: string
  dateRange?: { start: Date; end: Date }
}

function KPIWidget({ metric, target, comparisonType, dateRange }: KPIWidgetProps) {
  const { data, loading, error } = useKPIData(metric, dateRange)

  if (loading) {
    return (
      <div className="h-24 flex items-center justify-center">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
        Failed to load
      </div>
    )
  }

  const formattedValue = formatKPIValue(data.value, metric)
  const showComparison = comparisonType === 'previous_period' && data.changePercentage !== undefined
  const showTarget = comparisonType === 'target' && target !== undefined
  const targetProgress = target ? (data.value / target) * 100 : 0

  return (
    <div className="text-center">
      <div className="text-3xl font-bold mb-2">{formattedValue}</div>
      {showComparison && (
        <div
          className={`flex items-center justify-center gap-1 text-sm ${
            (data.changePercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {(data.changePercentage || 0) >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{Math.abs(data.changePercentage || 0).toFixed(1)}%</span>
          <span className="text-gray-500">vs previous</span>
        </div>
      )}
      {showTarget && (
        <div className="mt-2">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-full rounded ${
                targetProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(targetProgress, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {targetProgress.toFixed(0)}% of target ({formatKPIValue(target, metric)})
          </div>
        </div>
      )}
    </div>
  )
}

function formatKPIValue(value: number, metric: KPIMetric): string {
  switch (metric) {
    case 'total_revenue':
    case 'pipeline_value':
    case 'avg_deal_size':
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
      return `$${value.toLocaleString()}`
    case 'conversion_rate':
      return `${value.toFixed(1)}%`
    default:
      return value.toLocaleString()
  }
}

function ChartWidget({
  reportId,
  chartType,
}: {
  reportId?: string
  chartType: ChartType
  config: Record<string, unknown>
}) {
  // Placeholder for chart widget - would integrate with report runner
  return (
    <div className="h-48 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <p>Chart Widget</p>
        <p className="text-xs">Type: {chartType}</p>
        {reportId && <p className="text-xs">Report: {reportId.slice(0, 8)}...</p>}
      </div>
    </div>
  )
}

function ListWidget(_props: { config: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function ActivityFeedWidget(_props: { config: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Widget type selector for adding new widgets
export const WIDGET_TYPES: {
  type: WidgetType
  label: string
  description: string
}[] = [
  {
    type: 'kpi',
    label: 'KPI Card',
    description: 'Display a key metric with trend indicator',
  },
  {
    type: 'chart',
    label: 'Chart',
    description: 'Visualize data from a report',
  },
  {
    type: 'list',
    label: 'List',
    description: 'Show a list of records',
  },
  {
    type: 'activity_feed',
    label: 'Activity Feed',
    description: 'Recent activity timeline',
  },
]

export const KPI_METRICS: {
  value: KPIMetric
  label: string
  category: string
}[] = [
  { value: 'total_revenue', label: 'Total Revenue', category: 'Sales' },
  { value: 'deals_won', label: 'Deals Won', category: 'Sales' },
  { value: 'deals_lost', label: 'Deals Lost', category: 'Sales' },
  { value: 'pipeline_value', label: 'Pipeline Value', category: 'Pipeline' },
  { value: 'lead_count', label: 'New Leads', category: 'Leads' },
  { value: 'conversion_rate', label: 'Conversion Rate', category: 'Leads' },
  { value: 'avg_deal_size', label: 'Average Deal Size', category: 'Sales' },
  { value: 'activity_count', label: 'Activities', category: 'Activity' },
]
