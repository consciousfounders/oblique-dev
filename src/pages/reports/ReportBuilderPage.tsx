import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReports } from '@/lib/hooks/useReports'
import {
  type ReportObjectType,
  type ReportFilter,
  type ChartType,
  type ReportResult,
} from '@/lib/supabase'
import { ReportBuilder } from '@/components/reports/ReportBuilder'
import { ReportViewer } from '@/components/reports/ReportViewer'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Save,
  Play,
  ArrowLeft,
  Eye,
  Settings,
} from 'lucide-react'

export default function ReportBuilderPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { reports, createReport, updateReport, runReport, exportReport } = useReports()

  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ReportResult | null>(null)

  // Report state
  const [name, setName] = useState('New Report')
  const [description, setDescription] = useState('')
  const [objectType, setObjectType] = useState<ReportObjectType>('deals')
  const [fields, setFields] = useState<string[]>([])
  const [filters, setFilters] = useState<ReportFilter[]>([])
  const [grouping, setGrouping] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [chartType, setChartType] = useState<ChartType>('table')

  // Load existing report
  useEffect(() => {
    if (id) {
      const report = reports.find(r => r.id === id)
      if (report) {
        setName(report.name)
        setDescription(report.description || '')
        setObjectType(report.object_type)
        setFields(report.fields || [])
        setFilters(report.filters || [])
        setGrouping(report.grouping)
        setSortField(report.sort_field)
        setSortDirection(report.sort_direction || 'asc')
        setChartType(report.chart_type)
      }
    }
  }, [id, reports])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a report name')
      return
    }

    setSaving(true)
    try {
      const reportData = {
        name,
        description,
        object_type: objectType,
        fields,
        filters,
        grouping,
        sort_field: sortField,
        sort_direction: sortDirection,
        chart_type: chartType,
      }

      if (id) {
        await updateReport(id, reportData)
        toast.success('Report updated successfully')
      } else {
        const newReport = await createReport(reportData)
        if (newReport) {
          toast.success('Report created successfully')
          navigate(`/reports/builder/${newReport.id}`, { replace: true })
        }
      }
    } catch (error) {
      toast.error('Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    if (!id) {
      // Save first
      await handleSave()
      return
    }

    setRunning(true)
    try {
      const reportResult = await runReport(id)
      setResult(reportResult)
      setActiveTab('preview')
      if (reportResult) {
        toast.success(`Report returned ${reportResult.totalCount} records`)
      }
    } catch (error) {
      toast.error('Failed to run report')
    } finally {
      setRunning(false)
    }
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    if (!id) {
      toast.error('Please save the report first')
      return
    }

    try {
      const blob = await exportReport(id, format)
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name}.${format === 'excel' ? 'xlsx' : 'csv'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Report exported successfully')
      }
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  const handleSortChange = (field: string | null, direction: string) => {
    setSortField(field)
    setSortDirection(direction)
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
              onClick={() => navigate('/reports')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {id ? 'Edit Report' : 'Create Report'}
              </h1>
              <p className="text-sm text-gray-500">{name || 'New Report'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRun}
              disabled={running || fields.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              {running ? 'Running...' : 'Run Report'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'builder'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Settings className="h-4 w-4" />
            Builder
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'preview'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
        {activeTab === 'builder' ? (
          <div className="max-w-4xl mx-auto">
            <ReportBuilder
              name={name}
              description={description}
              objectType={objectType}
              fields={fields}
              filters={filters}
              grouping={grouping}
              sortField={sortField}
              sortDirection={sortDirection}
              chartType={chartType}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onObjectTypeChange={setObjectType}
              onFieldsChange={setFields}
              onFiltersChange={setFilters}
              onGroupingChange={setGrouping}
              onSortChange={handleSortChange}
              onChartTypeChange={setChartType}
            />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {fields.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <p className="mb-4">Select fields to display in the Builder tab</p>
                    <Button onClick={() => setActiveTab('builder')}>
                      Go to Builder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ReportViewer
                title={name}
                result={result}
                chartType={chartType}
                loading={running}
                onRefresh={handleRun}
                onExport={handleExport}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
