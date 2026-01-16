import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDashboards, useDashboardWidgets, type KPIMetric } from '@/lib/hooks/useDashboards'
import { getDateRangeFromPreset, type DateRangePreset } from '@/lib/hooks/useReports'
import { type Dashboard, type WidgetType, type DashboardWidgetInsert } from '@/lib/supabase'
import { DashboardGrid, WIDGET_TYPES, KPI_METRICS } from '@/components/dashboards/DashboardGrid'
import { DateRangeSelector } from '@/components/reports/StandardReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Plus,
  X,
  RefreshCw,
  Settings,
  Star,
} from 'lucide-react'

export default function DashboardViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { dashboards, setDefaultDashboard } = useDashboards()
  const {
    widgets,
    loading: widgetsLoading,
    addWidget,
    updateWidget,
    deleteWidget,
    updateLayout,
    refresh: refreshWidgets,
  } = useDashboardWidgets(id)

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_30_days')

  const dateRange = useMemo(
    () => getDateRangeFromPreset(dateRangePreset),
    [dateRangePreset]
  )

  useEffect(() => {
    if (id && dashboards.length > 0) {
      const found = dashboards.find(d => d.id === id)
      if (found) {
        setDashboard(found)
      } else {
        navigate('/dashboards')
      }
    }
  }, [id, dashboards])

  const handleSetDefault = async () => {
    if (!id) return
    await setDefaultDashboard(id)
    toast.success('Dashboard set as default')
  }

  const handleRefresh = () => {
    refreshWidgets()
    toast.success('Dashboard refreshed')
  }

  const handleAddWidget = async (
    type: WidgetType,
    config: Partial<DashboardWidgetInsert>
  ) => {
    const newWidget: Omit<DashboardWidgetInsert, 'dashboard_id'> = {
      widget_type: type,
      title: config.title || 'New Widget',
      position_x: 0,
      position_y: widgets.length,
      width: config.width || 4,
      height: config.height || 3,
      config: config.config || {},
      kpi_metric: config.kpi_metric,
      kpi_target: config.kpi_target,
      kpi_comparison_type: config.kpi_comparison_type || 'previous_period',
      chart_type: config.chart_type,
      chart_config: config.chart_config,
    }

    await addWidget(newWidget)
    setShowAddWidget(false)
    toast.success('Widget added')
  }

  const handleDeleteWidget = async (widgetId: string) => {
    await deleteWidget(widgetId)
    toast.success('Widget removed')
  }

  const handleUpdateWidget = async (
    widgetId: string,
    updates: Partial<DashboardWidgetInsert>
  ) => {
    await updateWidget(widgetId, updates)
  }

  if (!dashboard) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              <p className="mt-4 text-gray-500">Loading dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboards')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{dashboard.name}</h1>
              {dashboard.is_default && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeSelector
              value={dateRangePreset}
              onChange={setDateRangePreset}
            />
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {!dashboard.is_default && (
              <Button variant="outline" size="sm" onClick={handleSetDefault}>
                <Star className="h-4 w-4 mr-2" />
                Set Default
              </Button>
            )}
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddWidget(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
                <Button size="sm" onClick={() => setIsEditMode(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
        {widgetsLoading ? (
          <div className="grid grid-cols-12 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="col-span-4">
                <Card>
                  <CardContent className="h-48 animate-pulse bg-gray-200 dark:bg-gray-700" />
                </Card>
              </div>
            ))}
          </div>
        ) : widgets.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No widgets yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Add widgets to customize your dashboard
                </p>
                <Button onClick={() => {
                  setIsEditMode(true)
                  setShowAddWidget(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DashboardGrid
            widgets={widgets}
            isEditMode={isEditMode}
            dateRange={dateRange}
            onWidgetUpdate={handleUpdateWidget}
            onWidgetDelete={handleDeleteWidget}
            onLayoutChange={updateLayout}
          />
        )}
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <AddWidgetModal
          onClose={() => setShowAddWidget(false)}
          onAdd={handleAddWidget}
        />
      )}
    </div>
  )
}

interface AddWidgetModalProps {
  onClose: () => void
  onAdd: (type: WidgetType, config: Partial<DashboardWidgetInsert>) => void
}

function AddWidgetModal({ onClose, onAdd }: AddWidgetModalProps) {
  const [step, setStep] = useState<'type' | 'config'>('type')
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null)
  const [title, setTitle] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<KPIMetric>('total_revenue')
  const [target, setTarget] = useState<string>('')
  const [comparisonType, setComparisonType] = useState('previous_period')

  const handleSelectType = (type: WidgetType) => {
    setSelectedType(type)
    setStep('config')
  }

  const handleAdd = () => {
    if (!selectedType) return

    const config: Partial<DashboardWidgetInsert> = {
      title: title || getDefaultTitle(selectedType, selectedMetric),
    }

    if (selectedType === 'kpi') {
      config.kpi_metric = selectedMetric
      config.kpi_target = target ? parseFloat(target) : undefined
      config.kpi_comparison_type = comparisonType
      config.width = 3
      config.height = 2
    } else if (selectedType === 'chart') {
      config.chart_type = 'bar'
      config.width = 6
      config.height = 4
    } else if (selectedType === 'list') {
      config.width = 4
      config.height = 4
    } else if (selectedType === 'activity_feed') {
      config.width = 4
      config.height = 4
    }

    onAdd(selectedType, config)
  }

  const getDefaultTitle = (type: WidgetType, metric: KPIMetric) => {
    if (type === 'kpi') {
      return KPI_METRICS.find(m => m.value === metric)?.label || 'KPI'
    }
    return WIDGET_TYPES.find(t => t.type === type)?.label || 'Widget'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {step === 'type' ? 'Select Widget Type' : 'Configure Widget'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {step === 'type' ? (
            <div className="grid grid-cols-2 gap-3">
              {WIDGET_TYPES.map(type => (
                <button
                  key={type.type}
                  onClick={() => handleSelectType(type.type)}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  <h4 className="font-medium mb-1">{type.label}</h4>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={getDefaultTitle(selectedType!, selectedMetric)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
              </div>

              {selectedType === 'kpi' && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Metric
                    </label>
                    <select
                      value={selectedMetric}
                      onChange={e => setSelectedMetric(e.target.value as KPIMetric)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      {KPI_METRICS.map(metric => (
                        <option key={metric.value} value={metric.value}>
                          {metric.label} ({metric.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Comparison Type
                    </label>
                    <select
                      value={comparisonType}
                      onChange={e => setComparisonType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="previous_period">
                        Compare to previous period
                      </option>
                      <option value="target">Compare to target</option>
                      <option value="none">No comparison</option>
                    </select>
                  </div>
                  {comparisonType === 'target' && (
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        Target Value
                      </label>
                      <input
                        type="number"
                        value={target}
                        onChange={e => setTarget(e.target.value)}
                        placeholder="Enter target"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('type')}>
                  Back
                </Button>
                <Button onClick={handleAdd} className="flex-1">
                  Add Widget
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
