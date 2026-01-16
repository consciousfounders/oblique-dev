import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboards } from '@/lib/hooks/useDashboards'
import { getDateRangeFromPreset, type DateRangePreset } from '@/lib/hooks/useReports'
import { type Dashboard } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangeSelector } from '@/components/reports/StandardReports'
import {
  Plus,
  Search,
  LayoutDashboard,
  Star,
  Trash2,
  Copy,
  MoreVertical,
  Grid,
  List,
  RefreshCw,
  Settings,
} from 'lucide-react'

export default function DashboardsPage() {
  const navigate = useNavigate()
  const {
    dashboards,
    loading,
    deleteDashboard,
    setDefaultDashboard,
    createDashboard,
  } = useDashboards()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_30_days')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Date range for data filtering (currently used to pass to DateRangeSelector)
  const dateRange = useMemo(
    () => getDateRangeFromPreset(dateRangePreset),
    [dateRangePreset]
  )
  // Suppress unused warning - date range is provided for future filtering
  void dateRange

  const filteredDashboards = useMemo(() => {
    if (!searchQuery) return dashboards
    const query = searchQuery.toLowerCase()
    return dashboards.filter(
      d =>
        d.name.toLowerCase().includes(query) ||
        (d.description?.toLowerCase().includes(query) ?? false)
    )
  }, [dashboards, searchQuery])

  const defaultDashboard = dashboards.find(d => d.is_default)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this dashboard?')) {
      await deleteDashboard(id)
    }
  }

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await setDefaultDashboard(id)
  }

  const handleDuplicate = async (dashboard: Dashboard, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await createDashboard({
      name: `${dashboard.name} (Copy)`,
      description: dashboard.description,
      layout: dashboard.layout,
      auto_refresh_enabled: dashboard.auto_refresh_enabled,
      auto_refresh_interval: dashboard.auto_refresh_interval,
      date_range_type: dashboard.date_range_type,
    })
  }

  const handleCreateDashboard = async () => {
    const newDashboard = await createDashboard({
      name: 'New Dashboard',
      description: '',
      layout: [],
    })
    if (newDashboard) {
      navigate(`/dashboards/${newDashboard.id}`)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboards
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor your sales metrics with customizable dashboards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector
            value={dateRangePreset}
            onChange={setDateRangePreset}
          />
          <Button onClick={handleCreateDashboard}>
            <Plus className="h-4 w-4 mr-2" />
            Create Dashboard
          </Button>
        </div>
      </div>

      {/* Default Dashboard Quick Access */}
      {defaultDashboard && (
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Star className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    {defaultDashboard.name}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your default dashboard
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate(`/dashboards/${defaultDashboard.id}`)}>
                Open Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and View Toggle */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search dashboards..."
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

      {/* Dashboards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDashboards.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <LayoutDashboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No dashboards yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first dashboard to monitor your sales metrics
              </p>
              <Button onClick={handleCreateDashboard}>
                <Plus className="h-4 w-4 mr-2" />
                Create Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map(dashboard => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onDuplicate={handleDuplicate}
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
                    Widgets
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Auto Refresh
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    Updated
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDashboards.map(dashboard => (
                  <tr
                    key={dashboard.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => navigate(`/dashboards/${dashboard.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {dashboard.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">{dashboard.name}</div>
                          {dashboard.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {dashboard.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {dashboard.layout?.length || 0} widgets
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {dashboard.auto_refresh_enabled ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <RefreshCw className="h-3 w-3" />
                          {dashboard.auto_refresh_interval}s
                        </span>
                      ) : (
                        <span className="text-gray-400">Off</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(dashboard.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => handleSetDefault(dashboard.id, e)}
                          title="Set as default"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              dashboard.is_default
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => handleDuplicate(dashboard, e)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => handleDelete(dashboard.id, e)}
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
  )
}

function DashboardCard({
  dashboard,
  onDelete,
  onSetDefault,
  onDuplicate,
}: {
  dashboard: Dashboard
  onDelete: (id: string, e: React.MouseEvent) => void
  onSetDefault: (id: string, e: React.MouseEvent) => void
  onDuplicate: (dashboard: Dashboard, e: React.MouseEvent) => void
}) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/dashboards/${dashboard.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{dashboard.name}</CardTitle>
                {dashboard.is_default && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              <CardDescription className="text-xs">
                {dashboard.layout?.length || 0} widgets
              </CardDescription>
            </div>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-10 min-w-[150px]"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={e => {
                    onSetDefault(dashboard.id, e)
                    setShowMenu(false)
                  }}
                >
                  <Star className="h-4 w-4" />
                  Set as default
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={e => {
                    e.stopPropagation()
                    navigate(`/dashboards/${dashboard.id}/edit`)
                    setShowMenu(false)
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Edit
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={e => {
                    onDuplicate(dashboard, e)
                    setShowMenu(false)
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                  onClick={e => {
                    onDelete(dashboard.id, e)
                    setShowMenu(false)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dashboard.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {dashboard.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            {dashboard.auto_refresh_enabled ? (
              <>
                <RefreshCw className="h-3 w-3" />
                Auto-refresh: {dashboard.auto_refresh_interval}s
              </>
            ) : (
              <span>Manual refresh</span>
            )}
          </div>
          <div>
            Updated {new Date(dashboard.updated_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
