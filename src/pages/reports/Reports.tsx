import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReports, getDateRangeFromPreset, type DateRangePreset } from '@/lib/hooks/useReports'
import { type Report } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  StandardReportCard,
  STANDARD_REPORTS,
  DateRangeSelector,
} from '@/components/reports/StandardReports'
import {
  Plus,
  Search,
  FileText,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Trash2,
  Edit,
  Clock,
  Filter,
  Grid,
  List,
} from 'lucide-react'

export default function ReportsPage() {
  const navigate = useNavigate()
  const { reports, loading, deleteReport } = useReports()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_30_days')
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const dateRange = useMemo(
    () => getDateRangeFromPreset(dateRangePreset),
    [dateRangePreset]
  )

  const filteredReports = useMemo(() => {
    let filtered = reports

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        report =>
          report.name.toLowerCase().includes(query) ||
          (report.description?.toLowerCase().includes(query) ?? false)
      )
    }

    return filtered
  }, [reports, searchQuery])

  const filteredStandardReports = useMemo(() => {
    if (selectedCategory === 'all') return STANDARD_REPORTS
    return STANDARD_REPORTS.filter(r => r.category === selectedCategory)
  }, [selectedCategory])

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this report?')) {
      await deleteReport(id)
    }
  }

  const categories = [
    { value: 'all', label: 'All Reports' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'sales', label: 'Sales' },
    { value: 'leads', label: 'Leads' },
    { value: 'activity', label: 'Activity' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reports
          </h1>
          <p className="text-gray-500 mt-1">
            Analyze your sales data and track performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector
            value={dateRangePreset}
            onChange={setDateRangePreset}
          />
          <Button onClick={() => navigate('/reports/builder')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('standard')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'standard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Standard Reports
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom Reports ({filteredReports.length})
          </button>
        </div>
      </div>

      {activeTab === 'standard' ? (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Standard Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStandardReports.map(report => (
              <StandardReportCard
                key={report.key}
                reportKey={report.key}
                title={report.title}
                description={report.description}
                icon={report.icon}
                dateRange={dateRange}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search and View Toggle */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Custom Reports */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No custom reports yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Create your first custom report to analyze your data
                  </p>
                  <Button onClick={() => navigate('/reports/builder')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDelete={handleDeleteReport}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                        Object Type
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                        Chart Type
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                        Last Run
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map(report => (
                      <tr
                        key={report.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => navigate(`/reports/${report.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{report.name}</div>
                          {report.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {report.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {report.object_type}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {report.chart_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {report.last_run_at
                            ? new Date(report.last_run_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                navigate(`/reports/builder/${report.id}`)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => handleDeleteReport(report.id, e)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function ReportCard({
  report,
  onDelete,
}: {
  report: Report
  onDelete: (id: string, e: React.MouseEvent) => void
}) {
  const navigate = useNavigate()

  const ChartIcon = {
    table: Table,
    bar: BarChart3,
    line: LineChart,
    pie: PieChart,
    funnel: BarChart3,
    gauge: BarChart3,
    kpi: BarChart3,
  }[report.chart_type] || Table

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/reports/${report.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">{report.name}</CardTitle>
              <CardDescription className="text-xs capitalize">
                {report.object_type} Report
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                navigate(`/reports/builder/${report.id}`)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => onDelete(report.id, e)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {report.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {report.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {report.filters?.length || 0} filters
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {report.last_run_at
              ? new Date(report.last_run_at).toLocaleDateString()
              : 'Never run'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
