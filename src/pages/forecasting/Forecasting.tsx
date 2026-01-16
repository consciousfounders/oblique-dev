import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { QuotaPeriodType, ForecastType } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  Edit2,
  History,
  Sparkles,
  Package,
  LineChart,
} from 'lucide-react'
import { toast } from 'sonner'

interface Deal {
  id: string
  name: string
  value: number | null
  probability: number | null
  expected_close_date: string | null
  stage_id: string
  owner_id: string | null
  closed_at: string | null
  won: boolean | null
  deal_type: string
  deal_stages?: { name: string; probability: number } | null
  users?: { id: string; full_name: string | null } | null
  accounts?: { name: string } | null
}

interface DealProduct {
  id: string
  deal_id: string
  product_id: string
  quantity: number
  unit_price: number
  line_total: number
  products?: { name: string; category: string | null } | null
}

interface Team {
  id: string
  name: string
  manager_id: string | null
  is_active: boolean
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  is_lead: boolean
}

interface DealStage {
  id: string
  name: string
  probability: number
  position: number
}

interface User {
  id: string
  full_name: string | null
  email: string
  role: string
  team_id: string | null
}

interface Quota {
  id: string
  user_id: string
  period_type: QuotaPeriodType
  period_start: string
  period_end: string
  quota_amount: number
  users?: { full_name: string | null; email: string } | null
}

interface ForecastEntry {
  id: string
  user_id: string
  period_type: QuotaPeriodType
  period_start: string
  period_end: string
  forecast_type: ForecastType
  amount: number
  deal_count: number
  weighted_amount: number | null
  manager_override_amount: number | null
  manager_override_by: string | null
  manager_override_note: string | null
  snapshot_date: string
  users?: { full_name: string | null; email: string } | null
}

interface RepForecast {
  userId: string
  userName: string
  quota: number
  pipeline: number
  pipelineWeighted: number
  commit: number
  bestCase: number
  closed: number
  attainmentPct: number
  dealCount: number
  managerOverride: number | null
  overrideNote: string | null
  teamId?: string | null
}

interface TeamForecast {
  teamId: string
  teamName: string
  memberCount: number
  quota: number
  pipeline: number
  pipelineWeighted: number
  commit: number
  bestCase: number
  closed: number
  attainmentPct: number
  dealCount: number
}

interface ProductForecast {
  category: string
  pipeline: number
  pipelineWeighted: number
  commit: number
  bestCase: number
  closed: number
  dealCount: number
}

interface HistoricalSnapshot {
  date: string
  pipeline: number
  commit: number
  closed: number
}

type ViewMode = 'rep' | 'team' | 'product'
type PeriodType = 'monthly' | 'quarterly' | 'yearly'

const PERIOD_TYPES: { value: PeriodType; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function ForecastingPage() {
  const { user } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [, setStages] = useState<DealStage[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [forecastHistory, setForecastHistory] = useState<ForecastEntry[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [dealProducts, setDealProducts] = useState<DealProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showTrendDialog, setShowTrendDialog] = useState(false)

  const [viewMode, setViewMode] = useState<ViewMode>('rep')
  const [periodType, setPeriodType] = useState<PeriodType>('quarterly')
  const [currentPeriod, setCurrentPeriod] = useState(() => {
    const now = new Date()
    if (periodType === 'monthly') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) }
    } else if (periodType === 'quarterly') {
      const quarter = Math.floor(now.getMonth() / 3)
      return { start: new Date(now.getFullYear(), quarter * 3, 1), end: new Date(now.getFullYear(), quarter * 3 + 3, 0) }
    } else {
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) }
    }
  })

  const [showQuotaDialog, setShowQuotaDialog] = useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [selectedRep, setSelectedRep] = useState<RepForecast | null>(null)
  const [newQuota, setNewQuota] = useState({ user_id: '', amount: '' })
  const [overrideAmount, setOverrideAmount] = useState('')
  const [overrideNote, setOverrideNote] = useState('')

  useEffect(() => {
    updatePeriod(periodType)
  }, [periodType])

  useEffect(() => {
    if (user?.tenantId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId, currentPeriod])

  function updatePeriod(type: PeriodType) {
    const now = new Date()
    if (type === 'monthly') {
      setCurrentPeriod({ start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) })
    } else if (type === 'quarterly') {
      const quarter = Math.floor(now.getMonth() / 3)
      setCurrentPeriod({ start: new Date(now.getFullYear(), quarter * 3, 1), end: new Date(now.getFullYear(), quarter * 3 + 3, 0) })
    } else {
      setCurrentPeriod({ start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) })
    }
  }

  function navigatePeriod(direction: 'prev' | 'next') {
    const multiplier = direction === 'next' ? 1 : -1
    if (periodType === 'monthly') {
      setCurrentPeriod({
        start: new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth() + multiplier, 1),
        end: new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth() + multiplier + 1, 0),
      })
    } else if (periodType === 'quarterly') {
      setCurrentPeriod({
        start: new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth() + (3 * multiplier), 1),
        end: new Date(currentPeriod.start.getFullYear(), currentPeriod.start.getMonth() + (3 * multiplier) + 3, 0),
      })
    } else {
      setCurrentPeriod({
        start: new Date(currentPeriod.start.getFullYear() + multiplier, 0, 1),
        end: new Date(currentPeriod.start.getFullYear() + multiplier, 11, 31),
      })
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      const periodStart = currentPeriod.start.toISOString().split('T')[0]
      const periodEnd = currentPeriod.end.toISOString().split('T')[0]

      const [dealsResult, stagesResult, usersResult, quotasResult, historyResult, teamsResult, teamMembersResult] = await Promise.all([
        supabase
          .from('deals')
          .select(`
            id, name, value, probability, expected_close_date, stage_id, owner_id, closed_at, won, deal_type,
            deal_stages(name, probability),
            users:owner_id(id, full_name),
            accounts(name)
          `)
          .or(`expected_close_date.gte.${periodStart},expected_close_date.lte.${periodEnd},and(closed_at.gte.${periodStart},closed_at.lte.${periodEnd})`)
          .is('closed_at', null)
          .order('value', { ascending: false }),
        supabase
          .from('deal_stages')
          .select('*')
          .order('position'),
        supabase
          .from('users')
          .select('id, full_name, email, role, team_id')
          .in('role', ['ae', 'am', 'admin']),
        supabase
          .from('quotas')
          .select('*, users(full_name, email)')
          .eq('period_type', periodType)
          .gte('period_start', periodStart)
          .lte('period_end', periodEnd),
        supabase
          .from('forecast_entries')
          .select('*, users(full_name, email)')
          .eq('period_type', periodType)
          .gte('period_start', periodStart)
          .lte('period_end', periodEnd)
          .order('snapshot_date', { ascending: false })
          .limit(100),
        supabase
          .from('teams')
          .select('id, name, manager_id, is_active')
          .eq('is_active', true),
        supabase
          .from('team_members')
          .select('id, team_id, user_id, is_lead'),
      ])

      // Also fetch closed deals for the period
      const closedDealsResult = await supabase
        .from('deals')
        .select(`
          id, name, value, probability, expected_close_date, stage_id, owner_id, closed_at, won, deal_type,
          deal_stages(name, probability),
          users:owner_id(id, full_name),
          accounts(name)
        `)
        .gte('closed_at', periodStart)
        .lte('closed_at', periodEnd)
        .eq('won', true)

      if (dealsResult.error) throw dealsResult.error
      if (stagesResult.error) throw stagesResult.error
      if (usersResult.error) throw usersResult.error

      const allDeals = [...(dealsResult.data || []), ...(closedDealsResult.data || [])]
      // Remove duplicates
      const uniqueDeals = allDeals.filter((deal, index, self) =>
        index === self.findIndex(d => d.id === deal.id)
      )

      // Fetch deal products for deals in this period
      const dealIds = uniqueDeals.map(d => d.id)
      let dealProductsData: DealProduct[] = []
      if (dealIds.length > 0) {
        const { data: dpData } = await supabase
          .from('deal_products')
          .select('id, deal_id, product_id, quantity, unit_price, line_total, products(name, category)')
          .in('deal_id', dealIds)
        dealProductsData = (dpData || []) as unknown as DealProduct[]
      }

      setDeals(uniqueDeals as unknown as Deal[])
      setStages(stagesResult.data || [])
      setUsers(usersResult.data || [])
      setQuotas((quotasResult.data || []) as unknown as Quota[])
      setForecastHistory((historyResult.data || []) as unknown as ForecastEntry[])
      setTeams((teamsResult.data || []) as Team[])
      setTeamMembers((teamMembersResult.data || []) as TeamMember[])
      setDealProducts(dealProductsData)
    } catch (error) {
      console.error('Error fetching forecast data:', error)
      toast.error('Failed to load forecast data')
    } finally {
      setLoading(false)
    }
  }

  const repForecasts = useMemo(() => {
    const periodStart = currentPeriod.start.toISOString().split('T')[0]
    const periodEnd = currentPeriod.end.toISOString().split('T')[0]

    return users.map((u) => {
      const userDeals = deals.filter((d) => d.owner_id === u.id)
      const userQuota = quotas.find((q) => q.user_id === u.id)

      // Pipeline: all open deals expected to close in period
      const pipelineDeals = userDeals.filter((d) =>
        !d.closed_at &&
        d.expected_close_date &&
        d.expected_close_date >= periodStart &&
        d.expected_close_date <= periodEnd
      )

      const pipeline = pipelineDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      const pipelineWeighted = pipelineDeals.reduce((sum, d) => {
        const prob = d.probability ?? d.deal_stages?.probability ?? 0
        return sum + ((d.value || 0) * prob / 100)
      }, 0)

      // Commit: deals with probability >= 75%
      const commitDeals = pipelineDeals.filter((d) => {
        const prob = d.probability ?? d.deal_stages?.probability ?? 0
        return prob >= 75
      })
      const commit = commitDeals.reduce((sum, d) => sum + (d.value || 0), 0)

      // Best Case: deals with probability >= 50%
      const bestCaseDeals = pipelineDeals.filter((d) => {
        const prob = d.probability ?? d.deal_stages?.probability ?? 0
        return prob >= 50
      })
      const bestCase = bestCaseDeals.reduce((sum, d) => sum + (d.value || 0), 0)

      // Closed: won deals in period
      const closedDeals = userDeals.filter((d) =>
        d.closed_at &&
        d.won === true &&
        d.closed_at >= periodStart &&
        d.closed_at <= periodEnd
      )
      const closed = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0)

      const quota = userQuota?.quota_amount || 0
      const attainmentPct = quota > 0 ? (closed / quota) * 100 : 0

      // Check for manager override in history
      const latestOverride = forecastHistory.find((f) =>
        f.user_id === u.id && f.manager_override_amount !== null
      )

      return {
        userId: u.id,
        userName: u.full_name || u.email,
        quota,
        pipeline,
        pipelineWeighted,
        commit,
        bestCase,
        closed,
        attainmentPct,
        dealCount: pipelineDeals.length,
        managerOverride: latestOverride?.manager_override_amount ?? null,
        overrideNote: latestOverride?.manager_override_note ?? null,
        teamId: u.team_id,
      }
    }).sort((a, b) => b.pipeline - a.pipeline)
  }, [deals, users, quotas, forecastHistory, currentPeriod])

  // Aggregate forecasts by team
  const teamForecasts = useMemo(() => {
    // Build a map of user_id -> team_id from team_members
    const userTeamMap = new Map<string, string>()
    teamMembers.forEach((tm) => {
      userTeamMap.set(tm.user_id, tm.team_id)
    })
    // Also add from user.team_id
    users.forEach((u) => {
      if (u.team_id && !userTeamMap.has(u.id)) {
        userTeamMap.set(u.id, u.team_id)
      }
    })

    // Group rep forecasts by team
    const teamMap = new Map<string, TeamForecast>()

    repForecasts.forEach((rep) => {
      const teamId = userTeamMap.get(rep.userId) || rep.teamId
      if (!teamId) return

      const team = teams.find((t) => t.id === teamId)
      if (!team) return

      const existing = teamMap.get(teamId)
      if (existing) {
        existing.memberCount += 1
        existing.quota += rep.quota
        existing.pipeline += rep.pipeline
        existing.pipelineWeighted += rep.pipelineWeighted
        existing.commit += rep.commit
        existing.bestCase += rep.bestCase
        existing.closed += rep.closed
        existing.dealCount += rep.dealCount
      } else {
        teamMap.set(teamId, {
          teamId,
          teamName: team.name,
          memberCount: 1,
          quota: rep.quota,
          pipeline: rep.pipeline,
          pipelineWeighted: rep.pipelineWeighted,
          commit: rep.commit,
          bestCase: rep.bestCase,
          closed: rep.closed,
          attainmentPct: 0,
          dealCount: rep.dealCount,
        })
      }
    })

    // Calculate attainment for each team
    return Array.from(teamMap.values()).map((t) => ({
      ...t,
      attainmentPct: t.quota > 0 ? (t.closed / t.quota) * 100 : 0,
    })).sort((a, b) => b.pipeline - a.pipeline)
  }, [repForecasts, teams, teamMembers, users])

  // Aggregate forecasts by product category
  const productForecasts = useMemo(() => {
    const periodStart = currentPeriod.start.toISOString().split('T')[0]
    const periodEnd = currentPeriod.end.toISOString().split('T')[0]

    // Map deal_id -> deal
    const dealMap = new Map<string, Deal>()
    deals.forEach((d) => dealMap.set(d.id, d))

    // Group by product category
    const categoryMap = new Map<string, ProductForecast>()

    dealProducts.forEach((dp) => {
      const deal = dealMap.get(dp.deal_id)
      if (!deal) return

      const category = dp.products?.category || 'Uncategorized'
      const prob = deal.probability ?? deal.deal_stages?.probability ?? 0
      const isOpen = !deal.closed_at
      const isClosedWon = deal.closed_at && deal.won && deal.closed_at >= periodStart && deal.closed_at <= periodEnd
      const inPeriod = deal.expected_close_date && deal.expected_close_date >= periodStart && deal.expected_close_date <= periodEnd

      const lineValue = dp.line_total || 0
      const weightedValue = lineValue * prob / 100

      const existing = categoryMap.get(category)
      if (existing) {
        if (isOpen && inPeriod) {
          existing.pipeline += lineValue
          existing.pipelineWeighted += weightedValue
          existing.dealCount += 1
          if (prob >= 75) existing.commit += lineValue
          if (prob >= 50) existing.bestCase += lineValue
        }
        if (isClosedWon) {
          existing.closed += lineValue
        }
      } else {
        const newEntry: ProductForecast = {
          category,
          pipeline: 0,
          pipelineWeighted: 0,
          commit: 0,
          bestCase: 0,
          closed: 0,
          dealCount: 0,
        }
        if (isOpen && inPeriod) {
          newEntry.pipeline = lineValue
          newEntry.pipelineWeighted = weightedValue
          newEntry.dealCount = 1
          if (prob >= 75) newEntry.commit = lineValue
          if (prob >= 50) newEntry.bestCase = lineValue
        }
        if (isClosedWon) {
          newEntry.closed = lineValue
        }
        categoryMap.set(category, newEntry)
      }
    })

    return Array.from(categoryMap.values()).sort((a, b) => b.pipeline - a.pipeline)
  }, [deals, dealProducts, currentPeriod])

  // Historical trend data from forecast entries
  const historicalTrend = useMemo((): HistoricalSnapshot[] => {
    // Group by snapshot_date
    const dateMap = new Map<string, HistoricalSnapshot>()

    forecastHistory.forEach((entry) => {
      const date = entry.snapshot_date
      const existing = dateMap.get(date)
      if (existing) {
        if (entry.forecast_type === 'pipeline') existing.pipeline += entry.amount
        if (entry.forecast_type === 'commit') existing.commit += entry.amount
      } else {
        dateMap.set(date, {
          date,
          pipeline: entry.forecast_type === 'pipeline' ? entry.amount : 0,
          commit: entry.forecast_type === 'commit' ? entry.amount : 0,
          closed: 0, // closed comes from deal data, not forecast entries
        })
      }
    })

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [forecastHistory])

  const totals = useMemo(() => {
    return repForecasts.reduce((acc, rep) => ({
      quota: acc.quota + rep.quota,
      pipeline: acc.pipeline + rep.pipeline,
      pipelineWeighted: acc.pipelineWeighted + rep.pipelineWeighted,
      commit: acc.commit + rep.commit,
      bestCase: acc.bestCase + rep.bestCase,
      closed: acc.closed + rep.closed,
      dealCount: acc.dealCount + rep.dealCount,
    }), { quota: 0, pipeline: 0, pipelineWeighted: 0, commit: 0, bestCase: 0, closed: 0, dealCount: 0 })
  }, [repForecasts])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPeriodLabel = () => {
    if (periodType === 'monthly') {
      return currentPeriod.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (periodType === 'quarterly') {
      const quarter = Math.floor(currentPeriod.start.getMonth() / 3) + 1
      return `Q${quarter} ${currentPeriod.start.getFullYear()}`
    } else {
      return currentPeriod.start.getFullYear().toString()
    }
  }

  async function saveQuota(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId || !newQuota.user_id || !newQuota.amount) return

    try {
      const periodStart = currentPeriod.start.toISOString().split('T')[0]
      const periodEnd = currentPeriod.end.toISOString().split('T')[0]

      // Check if quota already exists
      const existingQuota = quotas.find((q) => q.user_id === newQuota.user_id)

      if (existingQuota) {
        const { error } = await supabase
          .from('quotas')
          .update({ quota_amount: parseFloat(newQuota.amount) })
          .eq('id', existingQuota.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('quotas').insert({
          tenant_id: user.tenantId,
          user_id: newQuota.user_id,
          period_type: periodType,
          period_start: periodStart,
          period_end: periodEnd,
          quota_amount: parseFloat(newQuota.amount),
          created_by: user.id,
        })
        if (error) throw error
      }

      toast.success('Quota saved successfully')
      setShowQuotaDialog(false)
      setNewQuota({ user_id: '', amount: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving quota:', error)
      toast.error('Failed to save quota')
    }
  }

  async function saveOverride() {
    if (!user?.tenantId || !selectedRep || !overrideAmount) return

    try {
      const periodStart = currentPeriod.start.toISOString().split('T')[0]
      const periodEnd = currentPeriod.end.toISOString().split('T')[0]

      const { error } = await supabase.from('forecast_entries').insert({
        tenant_id: user.tenantId,
        user_id: selectedRep.userId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        forecast_type: 'commit' as ForecastType,
        amount: selectedRep.commit,
        deal_count: selectedRep.dealCount,
        weighted_amount: selectedRep.pipelineWeighted,
        manager_override_amount: parseFloat(overrideAmount),
        manager_override_by: user.id,
        manager_override_note: overrideNote || null,
        manager_override_at: new Date().toISOString(),
        snapshot_date: new Date().toISOString().split('T')[0],
      })

      if (error) throw error

      toast.success('Override saved successfully')
      setShowOverrideDialog(false)
      setSelectedRep(null)
      setOverrideAmount('')
      setOverrideNote('')
      fetchData()
    } catch (error) {
      console.error('Error saving override:', error)
      toast.error('Failed to save override')
    }
  }

  async function createSnapshot() {
    if (!user?.tenantId) return

    try {
      const periodStart = currentPeriod.start.toISOString().split('T')[0]
      const periodEnd = currentPeriod.end.toISOString().split('T')[0]
      const snapshotDate = new Date().toISOString().split('T')[0]

      const entries = repForecasts.map((rep) => ({
        tenant_id: user.tenantId!,
        user_id: rep.userId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        forecast_type: 'pipeline' as ForecastType,
        amount: rep.pipeline,
        deal_count: rep.dealCount,
        weighted_amount: rep.pipelineWeighted,
        snapshot_date: snapshotDate,
      }))

      const { error } = await supabase.from('forecast_entries').insert(entries)
      if (error) throw error

      toast.success('Forecast snapshot created')
      fetchData()
    } catch (error) {
      console.error('Error creating snapshot:', error)
      toast.error('Failed to create snapshot')
    }
  }

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales Forecasting</h1>
          <p className="text-muted-foreground">Track pipeline, quotas, and revenue projections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTrendDialog(true)}>
            <LineChart className="w-4 h-4 mr-2" />
            Trend
          </Button>
          <Button variant="outline" onClick={() => setShowHistoryDialog(true)}>
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button variant="outline" onClick={createSnapshot}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Snapshot
          </Button>
          {user?.role === 'admin' && (
            <Button onClick={() => setShowQuotaDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Set Quota
            </Button>
          )}
        </div>
      </div>

      {/* Period Navigation */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <select
            className="px-3 py-2 border rounded-md bg-background text-sm"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
          >
            {PERIOD_TYPES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">{formatPeriodLabel()}</span>
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {currentPeriod.start.toLocaleDateString()} - {currentPeriod.end.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Quota</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.quota)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Pipeline</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.pipeline)}</p>
            <p className="text-sm text-muted-foreground">
              Weighted: {formatCurrency(totals.pipelineWeighted)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PieChart className="w-4 h-4" />
              <span className="text-sm">Commit</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.commit)}</p>
            <p className="text-sm text-muted-foreground">{totals.dealCount} deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">Best Case</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.bestCase)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Closed</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.closed)}</p>
            <p className="text-sm text-muted-foreground">
              {totals.quota > 0 ? ((totals.closed / totals.quota) * 100).toFixed(1) : 0}% of quota
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Views */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="rep">
            <Users className="w-4 h-4 mr-2" />
            By Rep
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            By Team
          </TabsTrigger>
          <TabsTrigger value="product">
            <BarChart3 className="w-4 h-4 mr-2" />
            By Product
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rep" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Rep</th>
                        <th className="text-right p-4 font-medium">Quota</th>
                        <th className="text-right p-4 font-medium">Pipeline</th>
                        <th className="text-right p-4 font-medium">Weighted</th>
                        <th className="text-right p-4 font-medium">Commit</th>
                        <th className="text-right p-4 font-medium">Best Case</th>
                        <th className="text-right p-4 font-medium">Closed</th>
                        <th className="text-right p-4 font-medium">Attainment</th>
                        <th className="text-right p-4 font-medium">Override</th>
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {repForecasts.map((rep) => (
                        <tr key={rep.userId} className="border-b hover:bg-muted/30">
                          <td className="p-4">
                            <div className="font-medium">{rep.userName}</div>
                            <div className="text-sm text-muted-foreground">{rep.dealCount} deals</div>
                          </td>
                          <td className="text-right p-4">{formatCurrency(rep.quota)}</td>
                          <td className="text-right p-4">{formatCurrency(rep.pipeline)}</td>
                          <td className="text-right p-4 text-muted-foreground">{formatCurrency(rep.pipelineWeighted)}</td>
                          <td className="text-right p-4">{formatCurrency(rep.commit)}</td>
                          <td className="text-right p-4">{formatCurrency(rep.bestCase)}</td>
                          <td className="text-right p-4">{formatCurrency(rep.closed)}</td>
                          <td className="text-right p-4">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full ${rep.attainmentPct >= 100 ? 'bg-green-500' : rep.attainmentPct >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(rep.attainmentPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm min-w-[50px]">{rep.attainmentPct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="text-right p-4">
                            {rep.managerOverride !== null ? (
                              <div>
                                <span className="font-medium">{formatCurrency(rep.managerOverride)}</span>
                                {rep.overrideNote && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[100px]" title={rep.overrideNote}>
                                    {rep.overrideNote}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {user?.role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRep(rep)
                                  setOverrideAmount(rep.managerOverride?.toString() || '')
                                  setOverrideNote(rep.overrideNote || '')
                                  setShowOverrideDialog(true)
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-muted/50 font-medium">
                        <td className="p-4">Total</td>
                        <td className="text-right p-4">{formatCurrency(totals.quota)}</td>
                        <td className="text-right p-4">{formatCurrency(totals.pipeline)}</td>
                        <td className="text-right p-4">{formatCurrency(totals.pipelineWeighted)}</td>
                        <td className="text-right p-4">{formatCurrency(totals.commit)}</td>
                        <td className="text-right p-4">{formatCurrency(totals.bestCase)}</td>
                        <td className="text-right p-4">{formatCurrency(totals.closed)}</td>
                        <td className="text-right p-4">
                          {totals.quota > 0 ? ((totals.closed / totals.quota) * 100).toFixed(0) : 0}%
                        </td>
                        <td className="p-4" colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : teamForecasts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Team view aggregates forecasts by sales team hierarchy.</p>
                <p className="text-sm mt-2">Configure teams in the Teams section to enable this view.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Team</th>
                        <th className="text-right p-4 font-medium">Members</th>
                        <th className="text-right p-4 font-medium">Quota</th>
                        <th className="text-right p-4 font-medium">Pipeline</th>
                        <th className="text-right p-4 font-medium">Weighted</th>
                        <th className="text-right p-4 font-medium">Commit</th>
                        <th className="text-right p-4 font-medium">Best Case</th>
                        <th className="text-right p-4 font-medium">Closed</th>
                        <th className="text-right p-4 font-medium">Attainment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamForecasts.map((team) => (
                        <tr key={team.teamId} className="border-b hover:bg-muted/30">
                          <td className="p-4">
                            <div className="font-medium">{team.teamName}</div>
                            <div className="text-sm text-muted-foreground">{team.dealCount} deals</div>
                          </td>
                          <td className="text-right p-4">{team.memberCount}</td>
                          <td className="text-right p-4">{formatCurrency(team.quota)}</td>
                          <td className="text-right p-4">{formatCurrency(team.pipeline)}</td>
                          <td className="text-right p-4 text-muted-foreground">{formatCurrency(team.pipelineWeighted)}</td>
                          <td className="text-right p-4">{formatCurrency(team.commit)}</td>
                          <td className="text-right p-4">{formatCurrency(team.bestCase)}</td>
                          <td className="text-right p-4">{formatCurrency(team.closed)}</td>
                          <td className="text-right p-4">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full ${team.attainmentPct >= 100 ? 'bg-green-500' : team.attainmentPct >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(team.attainmentPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm min-w-[50px]">{team.attainmentPct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-muted/50 font-medium">
                        <td className="p-4">Total</td>
                        <td className="text-right p-4">{teamForecasts.reduce((sum, t) => sum + t.memberCount, 0)}</td>
                        <td className="text-right p-4">{formatCurrency(teamForecasts.reduce((sum, t) => sum + t.quota, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(teamForecasts.reduce((sum, t) => sum + t.pipeline, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(teamForecasts.reduce((sum, t) => sum + t.pipelineWeighted, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(teamForecasts.reduce((sum, t) => sum + t.commit, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(teamForecasts.reduce((sum, t) => sum + t.bestCase, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(teamForecasts.reduce((sum, t) => sum + t.closed, 0))}</td>
                        <td className="text-right p-4">
                          {(() => {
                            const totalQuota = teamForecasts.reduce((sum, t) => sum + t.quota, 0)
                            const totalClosed = teamForecasts.reduce((sum, t) => sum + t.closed, 0)
                            return totalQuota > 0 ? ((totalClosed / totalQuota) * 100).toFixed(0) : 0
                          })()}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="product" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : productForecasts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Product view shows forecasts by product category.</p>
                <p className="text-sm mt-2">Add products to deals to enable this view.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Category</th>
                        <th className="text-right p-4 font-medium">Deals</th>
                        <th className="text-right p-4 font-medium">Pipeline</th>
                        <th className="text-right p-4 font-medium">Weighted</th>
                        <th className="text-right p-4 font-medium">Commit</th>
                        <th className="text-right p-4 font-medium">Best Case</th>
                        <th className="text-right p-4 font-medium">Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productForecasts.map((product) => (
                        <tr key={product.category} className="border-b hover:bg-muted/30">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{product.category}</span>
                            </div>
                          </td>
                          <td className="text-right p-4">{product.dealCount}</td>
                          <td className="text-right p-4">{formatCurrency(product.pipeline)}</td>
                          <td className="text-right p-4 text-muted-foreground">{formatCurrency(product.pipelineWeighted)}</td>
                          <td className="text-right p-4">{formatCurrency(product.commit)}</td>
                          <td className="text-right p-4">{formatCurrency(product.bestCase)}</td>
                          <td className="text-right p-4">{formatCurrency(product.closed)}</td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-muted/50 font-medium">
                        <td className="p-4">Total</td>
                        <td className="text-right p-4">{productForecasts.reduce((sum, p) => sum + p.dealCount, 0)}</td>
                        <td className="text-right p-4">{formatCurrency(productForecasts.reduce((sum, p) => sum + p.pipeline, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(productForecasts.reduce((sum, p) => sum + p.pipelineWeighted, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(productForecasts.reduce((sum, p) => sum + p.commit, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(productForecasts.reduce((sum, p) => sum + p.bestCase, 0))}</td>
                        <td className="text-right p-4">{formatCurrency(productForecasts.reduce((sum, p) => sum + p.closed, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Set Quota Dialog */}
      <Dialog open={showQuotaDialog} onOpenChange={setShowQuotaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Quota for {formatPeriodLabel()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveQuota} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sales Rep</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newQuota.user_id}
                onChange={(e) => setNewQuota({ ...newQuota, user_id: e.target.value })}
                required
              >
                <option value="">Select rep...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Quota Amount ($)</label>
              <Input
                type="number"
                placeholder="100000"
                value={newQuota.amount}
                onChange={(e) => setNewQuota({ ...newQuota, amount: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowQuotaDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Quota</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manager Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manager Override for {selectedRep?.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Pipeline:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedRep?.pipeline || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Commit:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedRep?.commit || 0)}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Override Amount ($)</label>
              <Input
                type="number"
                placeholder="Enter adjusted forecast"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Input
                placeholder="Reason for adjustment"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveOverride}>Save Override</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forecast History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Forecast History</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {forecastHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No forecast history yet. Create a snapshot to start tracking.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Rep</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastHistory.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-2">{new Date(entry.snapshot_date).toLocaleDateString()}</td>
                      <td className="p-2">{entry.users?.full_name || entry.users?.email}</td>
                      <td className="p-2 capitalize">{entry.forecast_type}</td>
                      <td className="text-right p-2">{formatCurrency(entry.amount)}</td>
                      <td className="text-right p-2">
                        {entry.manager_override_amount ? formatCurrency(entry.manager_override_amount) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Forecast Trend Dialog */}
      <Dialog open={showTrendDialog} onOpenChange={setShowTrendDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Forecast Trend - {formatPeriodLabel()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {historicalTrend.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No trend data available. Create snapshots to track forecast changes over time.
              </p>
            ) : (
              <>
                {/* Simple bar chart visualization */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span>Pipeline</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded" />
                      <span>Commit</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {historicalTrend.map((snapshot) => {
                      const maxValue = Math.max(...historicalTrend.map(s => Math.max(s.pipeline, s.commit))) || 1
                      return (
                        <div key={snapshot.date} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{new Date(snapshot.date).toLocaleDateString()}</span>
                            <span className="font-medium">{formatCurrency(snapshot.pipeline)}</span>
                          </div>
                          <div className="flex gap-1 h-6">
                            <div
                              className="bg-blue-500 rounded"
                              style={{ width: `${(snapshot.pipeline / maxValue) * 100}%` }}
                              title={`Pipeline: ${formatCurrency(snapshot.pipeline)}`}
                            />
                          </div>
                          <div className="flex gap-1 h-4">
                            <div
                              className="bg-green-500 rounded"
                              style={{ width: `${(snapshot.commit / maxValue) * 100}%` }}
                              title={`Commit: ${formatCurrency(snapshot.commit)}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Trend table */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Snapshot Details</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-right p-2">Pipeline</th>
                        <th className="text-right p-2">Commit</th>
                        <th className="text-right p-2">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalTrend.map((snapshot, idx) => {
                        const prevSnapshot = historicalTrend[idx - 1]
                        const pipelineChange = prevSnapshot ? snapshot.pipeline - prevSnapshot.pipeline : 0
                        return (
                          <tr key={snapshot.date} className="border-b">
                            <td className="p-2">{new Date(snapshot.date).toLocaleDateString()}</td>
                            <td className="text-right p-2">{formatCurrency(snapshot.pipeline)}</td>
                            <td className="text-right p-2">{formatCurrency(snapshot.commit)}</td>
                            <td className={`text-right p-2 ${pipelineChange > 0 ? 'text-green-600' : pipelineChange < 0 ? 'text-red-600' : ''}`}>
                              {idx > 0 ? (
                                <>
                                  {pipelineChange > 0 ? '+' : ''}{formatCurrency(pipelineChange)}
                                </>
                              ) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
