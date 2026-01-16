import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReports } from '@/lib/hooks/useReports'
import { type Report, type ReportResult } from '@/lib/supabase'
import { ReportViewer } from '@/components/reports/ReportViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react'

export default function ReportViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { reports, runReport, exportReport, deleteReport, loading } = useReports()

  const [report, setReport] = useState<Report | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (id && reports.length > 0) {
      const found = reports.find(r => r.id === id)
      if (found) {
        setReport(found)
        // Auto-run the report
        handleRunReport(id)
      } else {
        navigate('/reports')
      }
    }
  }, [id, reports])

  const handleRunReport = async (reportId: string) => {
    setRunning(true)
    try {
      const reportResult = await runReport(reportId)
      setResult(reportResult)
    } catch (error) {
      toast.error('Failed to run report')
    } finally {
      setRunning(false)
    }
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    if (!id || !report) return

    try {
      const blob = await exportReport(id, format)
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${report.name}.${format === 'excel' ? 'xlsx' : 'csv'}`
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

  const handleDelete = async () => {
    if (!id) return
    if (confirm('Are you sure you want to delete this report?')) {
      await deleteReport(id)
      toast.success('Report deleted')
      navigate('/reports')
    }
  }

  if (loading || !report) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              <p className="mt-4 text-gray-500">Loading report...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {report.name}
            </h1>
            {report.description && (
              <p className="text-gray-500 mt-1">{report.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/reports/builder/${id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
            Delete
          </Button>
        </div>
      </div>

      {/* Report Meta */}
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <span className="font-medium">Object:</span>
          <span className="capitalize">{report.object_type}</span>
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4" />
          <span>{report.filters?.length || 0} filters</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>
            Last run:{' '}
            {report.last_run_at
              ? new Date(report.last_run_at).toLocaleString()
              : 'Never'}
          </span>
        </div>
      </div>

      {/* Report Viewer */}
      <ReportViewer
        title={report.name}
        result={result}
        chartType={report.chart_type}
        loading={running}
        onRefresh={() => id && handleRunReport(id)}
        onExport={handleExport}
      />
    </div>
  )
}
