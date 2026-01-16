import { useState, useEffect, useCallback } from 'react'
import {
  supabase,
  type Report,
  type ReportInsert,
  type ReportUpdate,
  type ReportObjectType,
  type ReportFilter,
  type ReportResult,
  type StandardReportKey,
} from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'

interface UseReportsReturn {
  reports: Report[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createReport: (report: Omit<ReportInsert, 'tenant_id'>) => Promise<Report | null>
  updateReport: (id: string, updates: ReportUpdate) => Promise<Report | null>
  deleteReport: (id: string) => Promise<boolean>
  runReport: (reportId: string, additionalFilters?: ReportFilter[]) => Promise<ReportResult | null>
  exportReport: (reportId: string, format: 'csv' | 'excel') => Promise<Blob | null>
}

export function useReports(): UseReportsReturn {
  const { user } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      setReports((data || []) as Report[])
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  const createReport = useCallback(async (
    report: Omit<ReportInsert, 'tenant_id'>
  ): Promise<Report | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: createError } = await supabase
        .from('reports')
        .insert({
          ...report,
          tenant_id: user.tenantId,
          owner_id: user.id,
        })
        .select()
        .single()

      if (createError) throw createError

      await fetchReports()
      return data as Report
    } catch (err) {
      console.error('Error creating report:', err)
      setError(err instanceof Error ? err.message : 'Failed to create report')
      return null
    }
  }, [user?.tenantId, user?.id, fetchReports])

  const updateReport = useCallback(async (
    id: string,
    updates: ReportUpdate
  ): Promise<Report | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: updateError } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', user.tenantId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchReports()
      return data as Report
    } catch (err) {
      console.error('Error updating report:', err)
      setError(err instanceof Error ? err.message : 'Failed to update report')
      return null
    }
  }, [user?.tenantId, fetchReports])

  const deleteReport = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      await fetchReports()
      return true
    } catch (err) {
      console.error('Error deleting report:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete report')
      return false
    }
  }, [user?.tenantId, fetchReports])

  const runReport = useCallback(async (
    reportId: string,
    additionalFilters?: ReportFilter[]
  ): Promise<ReportResult | null> => {
    if (!user?.tenantId) return null

    try {
      const startTime = Date.now()

      // Fetch the report configuration
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .eq('tenant_id', user.tenantId)
        .single()

      if (reportError) throw reportError
      if (!report) throw new Error('Report not found')

      // Combine filters
      const allFilters = [
        ...(report.filters as ReportFilter[] || []),
        ...(additionalFilters || []),
      ]

      // Execute the query based on object type
      const result = await executeReportQuery(
        user.tenantId,
        report.object_type as ReportObjectType,
        report.fields as string[],
        allFilters,
        report.grouping as string | null,
        report.sort_field as string | null,
        report.sort_direction as string || 'asc'
      )

      const executionTimeMs = Date.now() - startTime

      // Log the execution
      await supabase.from('report_executions').insert({
        report_id: reportId,
        tenant_id: user.tenantId,
        user_id: user.id,
        execution_type: 'manual',
        row_count: result.totalCount,
        execution_time_ms: executionTimeMs,
        filters_applied: allFilters,
      })

      // Update last run time
      await supabase
        .from('reports')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', reportId)

      return {
        ...result,
        executionTimeMs,
      }
    } catch (err) {
      console.error('Error running report:', err)
      setError(err instanceof Error ? err.message : 'Failed to run report')
      return null
    }
  }, [user?.tenantId, user?.id])

  const exportReport = useCallback(async (
    reportId: string,
    exportFormat: 'csv' | 'excel'
  ): Promise<Blob | null> => {
    try {
      const result = await runReport(reportId)
      if (!result) return null

      if (exportFormat === 'csv') {
        return exportToCSV(result.data)
      } else {
        // For Excel, we'll use CSV format with .xlsx extension
        // A proper Excel library could be added for full Excel support
        return exportToCSV(result.data)
      }
    } catch (err) {
      console.error('Error exporting report:', err)
      setError(err instanceof Error ? err.message : 'Failed to export report')
      return null
    }
  }, [runReport])

  const refresh = useCallback(async () => {
    await fetchReports()
  }, [fetchReports])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  return {
    reports,
    loading,
    error,
    refresh,
    createReport,
    updateReport,
    deleteReport,
    runReport,
    exportReport,
  }
}

// Helper function to execute report queries
async function executeReportQuery(
  tenantId: string,
  objectType: ReportObjectType,
  fields: string[],
  filters: ReportFilter[],
  grouping: string | null,
  sortField: string | null,
  sortDirection: string
): Promise<Omit<ReportResult, 'executionTimeMs'>> {
  const tableName = getTableName(objectType)
  const selectFields = fields.length > 0 ? fields.join(', ') : '*'

  let query = supabase
    .from(tableName)
    .select(selectFields, { count: 'exact' })
    .eq('tenant_id', tenantId)

  // Apply filters
  for (const filter of filters) {
    query = applyFilter(query, filter)
  }

  // Apply sorting
  if (sortField) {
    query = query.order(sortField, { ascending: sortDirection === 'asc' })
  }

  const { data, count, error } = await query

  if (error) throw error

  let resultData: Record<string, unknown>[] = (data || []) as unknown as Record<string, unknown>[]

  // Apply grouping if specified
  let summary: Record<string, number> | undefined
  if (grouping) {
    const grouped = groupData(resultData, grouping)
    resultData = grouped.data
    summary = grouped.summary
  }

  return {
    data: resultData,
    totalCount: count || 0,
    summary,
  }
}

function getTableName(objectType: ReportObjectType): string {
  const tableMap: Record<ReportObjectType, string> = {
    leads: 'leads',
    contacts: 'contacts',
    accounts: 'accounts',
    deals: 'deals',
    activities: 'activities',
    campaigns: 'campaigns',
    users: 'users',
  }
  return tableMap[objectType]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter<T extends { eq: any; neq: any; ilike: any; not: any; gt: any; lt: any; gte: any; lte: any; in: any; is: any }>(
  query: T,
  filter: ReportFilter
): T {
  const { field, operator, value, value2 } = filter

  switch (operator) {
    case 'equals':
      return query.eq(field, value)
    case 'not_equals':
      return query.neq(field, value)
    case 'contains':
      return query.ilike(field, `%${value}%`)
    case 'not_contains':
      return query.not(field, 'ilike', `%${value}%`)
    case 'greater_than':
      return query.gt(field, value)
    case 'less_than':
      return query.lt(field, value)
    case 'between':
      return query.gte(field, value).lte(field, value2)
    case 'in':
      return query.in(field, value as unknown[])
    case 'not_in':
      return query.not(field, 'in', `(${(value as unknown[]).join(',')})`)
    case 'is_null':
      return query.is(field, null)
    case 'is_not_null':
      return query.not(field, 'is', null)
    default:
      return query
  }
}

function groupData(
  data: Record<string, unknown>[],
  groupField: string
): { data: Record<string, unknown>[]; summary: Record<string, number> } {
  const grouped = new Map<string, Record<string, unknown>[]>()

  for (const item of data) {
    const key = String(item[groupField] || 'Unknown')
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(item)
  }

  const summary: Record<string, number> = {}
  const groupedData: Record<string, unknown>[] = []

  for (const [key, items] of grouped.entries()) {
    summary[key] = items.length
    groupedData.push({
      [groupField]: key,
      count: items.length,
      items,
    })
  }

  return { data: groupedData, summary }
}

function exportToCSV(data: Record<string, unknown>[]): Blob {
  if (data.length === 0) {
    return new Blob([''], { type: 'text/csv' })
  }

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        const stringValue = value === null || value === undefined ? '' : String(value)
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    ),
  ]

  return new Blob([csvRows.join('\n')], { type: 'text/csv' })
}

// Hook for running standard reports
interface UseStandardReportOptions {
  reportKey: StandardReportKey
  dateRange?: {
    start: Date
    end: Date
  }
}

interface UseStandardReportReturn {
  data: Record<string, unknown>[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useStandardReport(options: UseStandardReportOptions): UseStandardReportReturn {
  const { reportKey, dateRange } = options
  const { user } = useAuth()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const runStandardReport = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const start = dateRange?.start || subDays(new Date(), 30)
      const end = dateRange?.end || new Date()

      const result = await executeStandardReport(user.tenantId, reportKey, start, end)
      setData(result)
    } catch (err) {
      console.error('Error running standard report:', err)
      setError(err instanceof Error ? err.message : 'Failed to run report')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, reportKey, dateRange])

  const refresh = useCallback(async () => {
    await runStandardReport()
  }, [runStandardReport])

  useEffect(() => {
    runStandardReport()
  }, [runStandardReport])

  return {
    data,
    loading,
    error,
    refresh,
  }
}

async function executeStandardReport(
  tenantId: string,
  reportKey: StandardReportKey,
  startDate: Date,
  endDate: Date
): Promise<Record<string, unknown>[]> {
  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  switch (reportKey) {
    case 'pipeline_by_stage':
      return await getPipelineByStage(tenantId)
    case 'deals_closed_won':
      return await getDealsClosedWon(tenantId, startStr, endStr)
    case 'deals_closed_lost':
      return await getDealsClosedLost(tenantId, startStr, endStr)
    case 'lead_conversion_rate':
      return await getLeadConversionRate(tenantId, startStr, endStr)
    case 'sales_by_rep':
      return await getSalesByRep(tenantId, startStr, endStr)
    case 'sales_by_team':
      return await getSalesByTeam(tenantId, startStr, endStr)
    case 'activity_by_type':
      return await getActivityByType(tenantId, startStr, endStr)
    case 'activity_by_rep':
      return await getActivityByRep(tenantId, startStr, endStr)
    case 'forecast_vs_actual':
      return await getForecastVsActual(tenantId, startStr, endStr)
    default:
      return []
  }
}

async function getPipelineByStage(tenantId: string): Promise<Record<string, unknown>[]> {
  const { data: stages } = await supabase
    .from('deal_stages')
    .select('id, name, position')
    .eq('tenant_id', tenantId)
    .order('position')

  if (!stages) return []

  const { data: deals } = await supabase
    .from('deals')
    .select('stage_id, value')
    .eq('tenant_id', tenantId)
    .is('closed_at', null)

  if (!deals) return stages.map(s => ({ stage: s.name, count: 0, value: 0 }))

  const stageMap = new Map(stages.map(s => [s.id, s.name]))
  const stageCounts = new Map<string, { count: number; value: number }>()

  for (const stage of stages) {
    stageCounts.set(stage.name, { count: 0, value: 0 })
  }

  for (const deal of deals) {
    const stageName = stageMap.get(deal.stage_id) || 'Unknown'
    const current = stageCounts.get(stageName) || { count: 0, value: 0 }
    stageCounts.set(stageName, {
      count: current.count + 1,
      value: current.value + (deal.value || 0),
    })
  }

  return stages.map(s => ({
    stage: s.name,
    count: stageCounts.get(s.name)?.count || 0,
    value: stageCounts.get(s.name)?.value || 0,
  }))
}

async function getDealsClosedWon(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('deals')
    .select('id, name, value, closed_at, owner_id')
    .eq('tenant_id', tenantId)
    .eq('won', true)
    .gte('closed_at', startDate)
    .lte('closed_at', endDate)
    .order('closed_at', { ascending: false })

  return (data || []) as Record<string, unknown>[]
}

async function getDealsClosedLost(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('deals')
    .select('id, name, value, closed_at, owner_id')
    .eq('tenant_id', tenantId)
    .eq('won', false)
    .not('closed_at', 'is', null)
    .gte('closed_at', startDate)
    .lte('closed_at', endDate)
    .order('closed_at', { ascending: false })

  return (data || []) as Record<string, unknown>[]
}

async function getLeadConversionRate(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { count: totalCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { count: convertedCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'converted')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const conversionRate = totalCount && totalCount > 0
    ? ((convertedCount || 0) / totalCount) * 100
    : 0

  return [{
    total_leads: totalCount || 0,
    converted_leads: convertedCount || 0,
    conversion_rate: Math.round(conversionRate * 100) / 100,
  }]
}

async function getSalesByRep(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { data: deals } = await supabase
    .from('deals')
    .select('value, owner_id')
    .eq('tenant_id', tenantId)
    .eq('won', true)
    .gte('closed_at', startDate)
    .lte('closed_at', endDate)

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('tenant_id', tenantId)

  if (!deals || !users) return []

  const userMap = new Map(users.map(u => [u.id, u.full_name || 'Unknown']))
  const salesByRep = new Map<string, { name: string; value: number; count: number }>()

  for (const deal of deals) {
    if (!deal.owner_id) continue
    const name = userMap.get(deal.owner_id) || 'Unknown'
    const current = salesByRep.get(deal.owner_id) || { name, value: 0, count: 0 }
    salesByRep.set(deal.owner_id, {
      name,
      value: current.value + (deal.value || 0),
      count: current.count + 1,
    })
  }

  return Array.from(salesByRep.values()).sort((a, b) => b.value - a.value)
}

async function getSalesByTeam(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { data: deals } = await supabase
    .from('deals')
    .select('value, owner_id')
    .eq('tenant_id', tenantId)
    .eq('won', true)
    .gte('closed_at', startDate)
    .lte('closed_at', endDate)

  const { data: users } = await supabase
    .from('users')
    .select('id, team_id')
    .eq('tenant_id', tenantId)

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('tenant_id', tenantId)

  if (!deals || !users || !teams) return []

  const userTeamMap = new Map(users.map(u => [u.id, u.team_id]))
  const teamMap = new Map(teams.map(t => [t.id, t.name]))
  const salesByTeam = new Map<string, { name: string; value: number; count: number }>()

  for (const deal of deals) {
    if (!deal.owner_id) continue
    const teamId = userTeamMap.get(deal.owner_id)
    if (!teamId) continue
    const name = teamMap.get(teamId) || 'Unknown'
    const current = salesByTeam.get(teamId) || { name, value: 0, count: 0 }
    salesByTeam.set(teamId, {
      name,
      value: current.value + (deal.value || 0),
      count: current.count + 1,
    })
  }

  return Array.from(salesByTeam.values()).sort((a, b) => b.value - a.value)
}

async function getActivityByType(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('activities')
    .select('activity_type')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (!data) return []

  const typeCounts = new Map<string, number>()
  for (const activity of data) {
    const current = typeCounts.get(activity.activity_type) || 0
    typeCounts.set(activity.activity_type, current + 1)
  }

  return Array.from(typeCounts.entries())
    .map(([type, count]) => ({ activity_type: type, count }))
    .sort((a, b) => b.count - a.count)
}

async function getActivityByRep(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { data: activities } = await supabase
    .from('activities')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('tenant_id', tenantId)

  if (!activities || !users) return []

  const userMap = new Map(users.map(u => [u.id, u.full_name || 'Unknown']))
  const activityByRep = new Map<string, { name: string; count: number }>()

  for (const activity of activities) {
    if (!activity.user_id) continue
    const name = userMap.get(activity.user_id) || 'Unknown'
    const current = activityByRep.get(activity.user_id) || { name, count: 0 }
    activityByRep.set(activity.user_id, {
      name,
      count: current.count + 1,
    })
  }

  return Array.from(activityByRep.values()).sort((a, b) => b.count - a.count)
}

async function getForecastVsActual(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, unknown>[]> {
  const { data: forecasts } = await supabase
    .from('forecast_entries')
    .select('forecast_type, amount, period_start, period_end')
    .eq('tenant_id', tenantId)
    .gte('period_start', startDate)
    .lte('period_end', endDate)

  const { data: deals } = await supabase
    .from('deals')
    .select('value, closed_at')
    .eq('tenant_id', tenantId)
    .eq('won', true)
    .gte('closed_at', startDate)
    .lte('closed_at', endDate)

  const forecastAmount = forecasts?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0
  const actualAmount = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0

  return [{
    forecast: forecastAmount,
    actual: actualAmount,
    variance: actualAmount - forecastAmount,
    variance_percentage: forecastAmount > 0
      ? Math.round(((actualAmount - forecastAmount) / forecastAmount) * 100 * 100) / 100
      : 0,
  }]
}

// Date range presets
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom'

export function getDateRangeFromPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { start: now, end: now }
    case 'yesterday':
      return { start: subDays(now, 1), end: subDays(now, 1) }
    case 'last_7_days':
      return { start: subDays(now, 7), end: now }
    case 'last_30_days':
      return { start: subDays(now, 30), end: now }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'last_month':
      const lastMonth = subDays(startOfMonth(now), 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    case 'this_quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) }
    case 'last_quarter':
      const lastQuarter = subDays(startOfQuarter(now), 1)
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) }
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'last_year':
      const lastYear = subDays(startOfYear(now), 1)
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) }
    default:
      return { start: subDays(now, 30), end: now }
  }
}

// Get available fields for a report object type
export function getAvailableFields(objectType: ReportObjectType): { name: string; label: string; type: string }[] {
  const fieldMap: Record<ReportObjectType, { name: string; label: string; type: string }[]> = {
    leads: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'first_name', label: 'First Name', type: 'string' },
      { name: 'last_name', label: 'Last Name', type: 'string' },
      { name: 'email', label: 'Email', type: 'string' },
      { name: 'phone', label: 'Phone', type: 'string' },
      { name: 'company', label: 'Company', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'source', label: 'Source', type: 'string' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'score', label: 'Score', type: 'number' },
      { name: 'score_label', label: 'Score Label', type: 'string' },
      { name: 'industry', label: 'Industry', type: 'string' },
      { name: 'company_size', label: 'Company Size', type: 'string' },
      { name: 'created_at', label: 'Created At', type: 'datetime' },
      { name: 'updated_at', label: 'Updated At', type: 'datetime' },
    ],
    contacts: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'first_name', label: 'First Name', type: 'string' },
      { name: 'last_name', label: 'Last Name', type: 'string' },
      { name: 'email', label: 'Email', type: 'string' },
      { name: 'phone', label: 'Phone', type: 'string' },
      { name: 'title', label: 'Title', type: 'string' },
      { name: 'account_id', label: 'Account', type: 'string' },
      { name: 'created_at', label: 'Created At', type: 'datetime' },
      { name: 'updated_at', label: 'Updated At', type: 'datetime' },
    ],
    accounts: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'name', label: 'Name', type: 'string' },
      { name: 'domain', label: 'Domain', type: 'string' },
      { name: 'website', label: 'Website', type: 'string' },
      { name: 'industry', label: 'Industry', type: 'string' },
      { name: 'employee_count', label: 'Employees', type: 'string' },
      { name: 'annual_revenue', label: 'Annual Revenue', type: 'string' },
      { name: 'account_type', label: 'Account Type', type: 'string' },
      { name: 'phone', label: 'Phone', type: 'string' },
      { name: 'created_at', label: 'Created At', type: 'datetime' },
      { name: 'updated_at', label: 'Updated At', type: 'datetime' },
    ],
    deals: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'name', label: 'Name', type: 'string' },
      { name: 'value', label: 'Value', type: 'number' },
      { name: 'stage_id', label: 'Stage', type: 'string' },
      { name: 'probability', label: 'Probability', type: 'number' },
      { name: 'expected_close_date', label: 'Expected Close', type: 'date' },
      { name: 'closed_at', label: 'Closed At', type: 'datetime' },
      { name: 'won', label: 'Won', type: 'boolean' },
      { name: 'deal_type', label: 'Deal Type', type: 'string' },
      { name: 'lead_source', label: 'Lead Source', type: 'string' },
      { name: 'created_at', label: 'Created At', type: 'datetime' },
      { name: 'updated_at', label: 'Updated At', type: 'datetime' },
    ],
    activities: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'entity_type', label: 'Entity Type', type: 'string' },
      { name: 'entity_id', label: 'Entity ID', type: 'string' },
      { name: 'activity_type', label: 'Activity Type', type: 'string' },
      { name: 'subject', label: 'Subject', type: 'string' },
      { name: 'description', label: 'Description', type: 'string' },
      { name: 'user_id', label: 'User', type: 'string' },
      { name: 'created_at', label: 'Created At', type: 'datetime' },
    ],
    campaigns: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'name', label: 'Name', type: 'string' },
      { name: 'campaign_type', label: 'Type', type: 'string' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'budget', label: 'Budget', type: 'number' },
      { name: 'actual_cost', label: 'Actual Cost', type: 'number' },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'end_date', label: 'End Date', type: 'date' },
      { name: 'total_leads', label: 'Total Leads', type: 'number' },
      { name: 'total_converted', label: 'Total Converted', type: 'number' },
      { name: 'total_revenue', label: 'Total Revenue', type: 'number' },
      { name: 'created_at', label: 'Created At', type: 'datetime' },
    ],
    users: [
      { name: 'id', label: 'ID', type: 'string' },
      { name: 'email', label: 'Email', type: 'string' },
      { name: 'full_name', label: 'Full Name', type: 'string' },
      { name: 'role', label: 'Role', type: 'string' },
      { name: 'created_at', label: 'Created At', type: 'datetime' },
    ],
  }

  return fieldMap[objectType] || []
}
