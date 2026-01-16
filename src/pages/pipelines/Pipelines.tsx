import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePipelines, type PipelineAnalytics } from '@/lib/hooks/usePipelines'
import { PipelineAnalytics as PipelineAnalyticsComponent } from '@/components/pipelines'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  DollarSign,
  Building2,
  Calendar,
  Search,
  User,
  Settings,
  Filter,
  TrendingUp,
  Clock,
  Target,
  ChevronDown,
  BarChart2,
  Kanban,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DealType } from '@/lib/supabase'

interface Deal {
  id: string
  name: string
  value: number | null
  stage_id: string
  account_id: string | null
  accounts: { name: string } | null
  contact_id: string | null
  contacts: { first_name: string; last_name: string | null } | null
  owner_id: string | null
  users: { full_name: string | null } | null
  expected_close_date: string | null
  deal_type: DealType
  lead_source: string | null
  created_at: string
}

interface FilterState {
  owner: string
  dateRange: 'all' | 'this_week' | 'this_month' | 'this_quarter'
  minValue: string
  maxValue: string
}

export function PipelinesPage() {
  const { user } = useAuth()
  const {
    pipelines,
    loading: pipelinesLoading,
    selectedPipelineId,
    selectedPipeline,
    setSelectedPipelineId,
    getAnalytics,
  } = usePipelines()

  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    owner: '',
    dateRange: 'all',
    minValue: '',
    maxValue: '',
  })
  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null)
  const [users, setUsers] = useState<{ id: string; full_name: string | null }[]>([])
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)
  const [view, setView] = useState<'kanban' | 'analytics'>('kanban')

  // Fetch deals
  useEffect(() => {
    if (user?.tenantId) {
      fetchDeals()
      fetchUsers()
    }
  }, [user?.tenantId])

  // Fetch analytics when pipeline changes
  useEffect(() => {
    if (selectedPipelineId) {
      loadAnalytics()
    }
  }, [selectedPipelineId])

  async function fetchDeals() {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, accounts(name), contacts(first_name, last_name), users:owner_id(full_name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeals(data || [])
    } catch (error) {
      console.error('Error fetching deals:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name')
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  async function loadAnalytics() {
    if (!selectedPipelineId) return
    const data = await getAnalytics(selectedPipelineId)
    setAnalytics(data)
  }

  async function moveDeal(dealId: string, newStageId: string) {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', dealId)

      if (error) throw error

      setDeals(prev =>
        prev.map(d => d.id === dealId ? { ...d, stage_id: newStageId } : d)
      )
      toast.success('Deal moved successfully')

      // Refresh analytics
      loadAnalytics()
    } catch (error) {
      console.error('Error moving deal:', error)
      toast.error('Failed to move deal')
    }
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Get stage IDs for the selected pipeline
  const stageIds = useMemo(() => {
    return selectedPipeline?.stages.map(s => s.id) || []
  }, [selectedPipeline])

  // Filter deals for selected pipeline
  const pipelineDeals = useMemo(() => {
    let filtered = deals.filter(d => stageIds.includes(d.stage_id))

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(deal =>
        deal.name.toLowerCase().includes(searchLower) ||
        deal.accounts?.name.toLowerCase().includes(searchLower) ||
        deal.contacts?.first_name.toLowerCase().includes(searchLower) ||
        deal.contacts?.last_name?.toLowerCase().includes(searchLower)
      )
    }

    // Apply owner filter
    if (filters.owner) {
      filtered = filtered.filter(deal => deal.owner_id === filters.owner)
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (filters.dateRange) {
        case 'this_week':
          startDate = new Date(now.setDate(now.getDate() - now.getDay()))
          break
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'this_quarter':
          const quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter(deal => {
        if (!deal.expected_close_date) return true
        return new Date(deal.expected_close_date) >= startDate
      })
    }

    // Apply value filters
    if (filters.minValue) {
      const min = parseFloat(filters.minValue)
      filtered = filtered.filter(deal => (deal.value || 0) >= min)
    }
    if (filters.maxValue) {
      const max = parseFloat(filters.maxValue)
      filtered = filtered.filter(deal => (deal.value || 0) <= max)
    }

    return filtered
  }, [deals, stageIds, search, filters])

  const getStageDeals = (stageId: string) => {
    return pipelineDeals.filter(d => d.stage_id === stageId)
  }

  const getStageValue = (stageId: string) => {
    return getStageDeals(stageId).reduce((sum, d) => sum + (d.value || 0), 0)
  }

  const totalPipelineValue = pipelineDeals.reduce((sum, d) => sum + (d.value || 0), 0)

  if (pipelinesLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (pipelines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No pipelines configured yet.</p>
        <Link to="/settings/pipelines">
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Configure Pipelines
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Dashboard</h1>
          <p className="text-muted-foreground">
            {pipelineDeals.length} deals worth {formatCurrency(totalPipelineValue)}
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-input overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                view === 'kanban'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              <Kanban className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${
                view === 'analytics'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </button>
          </div>
          <Link to="/settings/pipelines">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Link to="/deals">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Button>
          </Link>
        </div>
      </div>

      {/* Pipeline Selector & Analytics Summary */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Pipeline Selector */}
        <Card className="flex-shrink-0 lg:w-64">
          <CardContent className="p-4">
            <label className="text-sm font-medium mb-2 block">Select Pipeline</label>
            <select
              value={selectedPipelineId || ''}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name} {pipeline.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Analytics Summary */}
        {analytics && (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Target className="w-4 h-4" />
                  Total Deals
                </div>
                <p className="text-2xl font-bold">{analytics.totalDeals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  Pipeline Value
                </div>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Weighted Value
                </div>
                <p className="text-2xl font-bold">{formatCurrency(analytics.weightedValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Avg Deal Size
                </div>
                <p className="text-2xl font-bold">{formatCurrency(analytics.avgDealSize)}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-muted' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Owner</label>
                <select
                  value={filters.owner}
                  onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">All owners</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || 'Unnamed'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Close Date</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as FilterState['dateRange'] }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="all">All time</option>
                  <option value="this_week">This week</option>
                  <option value="this_month">This month</option>
                  <option value="this_quarter">This quarter</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Min Value</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minValue}
                  onChange={(e) => setFilters(prev => ({ ...prev, minValue: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Max Value</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.maxValue}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxValue: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ owner: '', dateRange: 'all', minValue: '', maxValue: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics View */}
      {view === 'analytics' && selectedPipelineId && (
        <PipelineAnalyticsComponent pipelineId={selectedPipelineId} />
      )}

      {/* Kanban Board */}
      {view === 'kanban' && (
        <>
          {selectedPipeline && selectedPipeline.stages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No stages configured for this pipeline.</p>
              <Link to="/settings/pipelines">
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stages
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {selectedPipeline?.stages.map(stage => {
                  const stageDeals = getStageDeals(stage.id)
                  const stageValue = getStageValue(stage.id)
                  const stageAnalytics = analytics?.stageMetrics.find(m => m.stageId === stage.id)

                  return (
                    <div
                      key={stage.id}
                      className="w-72 flex-shrink-0"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedDealId) {
                          moveDeal(draggedDealId, stage.id)
                          setDraggedDealId(null)
                        }
                      }}
                    >
                      <div className="bg-muted/50 rounded-lg p-3">
                        {/* Stage Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color || '#6b7280' }}
                            />
                            <div>
                              <h3 className="font-medium text-sm">{stage.name}</h3>
                              <span className="text-xs text-muted-foreground">
                                {stage.probability}% probability
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium">
                              {stageDeals.length} deals
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(stageValue)}
                            </p>
                          </div>
                        </div>

                        {/* Stage Analytics */}
                        {stageAnalytics && stageAnalytics.conversionRate > 0 && (
                          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                            <TrendingUp className="w-3 h-3" />
                            <span>{stageAnalytics.conversionRate.toFixed(0)}% conversion</span>
                            {stageAnalytics.avgTimeInStage !== null && (
                              <>
                                <span>|</span>
                                <Clock className="w-3 h-3" />
                                <span>{stageAnalytics.avgTimeInStage.toFixed(1)}d avg</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Deal Cards */}
                        <div className="space-y-2">
                          {stageDeals.map(deal => (
                            <Link key={deal.id} to={`/deals/${deal.id}`}>
                              <Card
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('dealId', deal.id)
                                  setDraggedDealId(deal.id)
                                }}
                                onDragEnd={() => setDraggedDealId(null)}
                                className={`cursor-grab active:cursor-grabbing hover:bg-card/80 transition-colors ${
                                  draggedDealId === deal.id ? 'opacity-50' : ''
                                }`}
                              >
                                <CardContent className="p-3">
                                  <h4 className="font-medium text-sm">{deal.name}</h4>
                                  <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                                    {deal.value && (
                                      <span className="flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        {formatCurrency(deal.value)}
                                      </span>
                                    )}
                                    {deal.accounts && (
                                      <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        {deal.accounts.name}
                                      </span>
                                    )}
                                    {deal.contacts && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {deal.contacts.first_name} {deal.contacts.last_name}
                                      </span>
                                    )}
                                    {deal.expected_close_date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(deal.expected_close_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}

                          {stageDeals.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              Drop deals here
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
