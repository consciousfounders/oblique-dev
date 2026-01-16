import { useState, useEffect, useCallback } from 'react'
import {
  supabase,
  type Dashboard,
  type DashboardInsert,
  type DashboardUpdate,
  type DashboardWidget,
  type DashboardWidgetInsert,
  type DashboardWidgetUpdate,
  type DashboardWidgetLayout,
} from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface UseDashboardsReturn {
  dashboards: Dashboard[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createDashboard: (dashboard: Omit<DashboardInsert, 'tenant_id'>) => Promise<Dashboard | null>
  updateDashboard: (id: string, updates: DashboardUpdate) => Promise<Dashboard | null>
  deleteDashboard: (id: string) => Promise<boolean>
  setDefaultDashboard: (id: string) => Promise<boolean>
}

export function useDashboards(): UseDashboardsReturn {
  const { user } = useAuth()
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboards = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('dashboards')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      setDashboards((data || []) as Dashboard[])
    } catch (err) {
      console.error('Error fetching dashboards:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboards')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId])

  const createDashboard = useCallback(async (
    dashboard: Omit<DashboardInsert, 'tenant_id'>
  ): Promise<Dashboard | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: createError } = await supabase
        .from('dashboards')
        .insert({
          ...dashboard,
          tenant_id: user.tenantId,
          owner_id: user.id,
        })
        .select()
        .single()

      if (createError) throw createError

      await fetchDashboards()
      return data as Dashboard
    } catch (err) {
      console.error('Error creating dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to create dashboard')
      return null
    }
  }, [user?.tenantId, user?.id, fetchDashboards])

  const updateDashboard = useCallback(async (
    id: string,
    updates: DashboardUpdate
  ): Promise<Dashboard | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: updateError } = await supabase
        .from('dashboards')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', user.tenantId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchDashboards()
      return data as Dashboard
    } catch (err) {
      console.error('Error updating dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to update dashboard')
      return null
    }
  }, [user?.tenantId, fetchDashboards])

  const deleteDashboard = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      await fetchDashboards()
      return true
    } catch (err) {
      console.error('Error deleting dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete dashboard')
      return false
    }
  }, [user?.tenantId, fetchDashboards])

  const setDefaultDashboard = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      // First, unset any existing default
      await supabase
        .from('dashboards')
        .update({ is_default: false })
        .eq('tenant_id', user.tenantId)
        .eq('is_default', true)

      // Set the new default
      const { error: updateError } = await supabase
        .from('dashboards')
        .update({ is_default: true })
        .eq('id', id)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      await fetchDashboards()
      return true
    } catch (err) {
      console.error('Error setting default dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to set default dashboard')
      return false
    }
  }, [user?.tenantId, fetchDashboards])

  const refresh = useCallback(async () => {
    await fetchDashboards()
  }, [fetchDashboards])

  useEffect(() => {
    fetchDashboards()
  }, [fetchDashboards])

  return {
    dashboards,
    loading,
    error,
    refresh,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    setDefaultDashboard,
  }
}

// Hook for managing a single dashboard's widgets
interface UseDashboardWidgetsReturn {
  widgets: DashboardWidget[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addWidget: (widget: Omit<DashboardWidgetInsert, 'dashboard_id'>) => Promise<DashboardWidget | null>
  updateWidget: (id: string, updates: DashboardWidgetUpdate) => Promise<DashboardWidget | null>
  deleteWidget: (id: string) => Promise<boolean>
  updateLayout: (layout: DashboardWidgetLayout[]) => Promise<boolean>
}

export function useDashboardWidgets(dashboardId: string | undefined): UseDashboardWidgetsReturn {
  const { user } = useAuth()
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWidgets = useCallback(async () => {
    if (!user?.tenantId || !dashboardId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true })

      if (fetchError) throw fetchError

      setWidgets((data || []) as DashboardWidget[])
    } catch (err) {
      console.error('Error fetching widgets:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch widgets')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, dashboardId])

  const addWidget = useCallback(async (
    widget: Omit<DashboardWidgetInsert, 'dashboard_id'>
  ): Promise<DashboardWidget | null> => {
    if (!dashboardId) return null

    try {
      const { data, error: createError } = await supabase
        .from('dashboard_widgets')
        .insert({
          ...widget,
          dashboard_id: dashboardId,
        })
        .select()
        .single()

      if (createError) throw createError

      await fetchWidgets()
      return data as DashboardWidget
    } catch (err) {
      console.error('Error adding widget:', err)
      setError(err instanceof Error ? err.message : 'Failed to add widget')
      return null
    }
  }, [dashboardId, fetchWidgets])

  const updateWidget = useCallback(async (
    id: string,
    updates: DashboardWidgetUpdate
  ): Promise<DashboardWidget | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('dashboard_widgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchWidgets()
      return data as DashboardWidget
    } catch (err) {
      console.error('Error updating widget:', err)
      setError(err instanceof Error ? err.message : 'Failed to update widget')
      return null
    }
  }, [fetchWidgets])

  const deleteWidget = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await fetchWidgets()
      return true
    } catch (err) {
      console.error('Error deleting widget:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete widget')
      return false
    }
  }, [fetchWidgets])

  const updateLayout = useCallback(async (
    layout: DashboardWidgetLayout[]
  ): Promise<boolean> => {
    try {
      // Update each widget's position
      for (const item of layout) {
        const { error } = await supabase
          .from('dashboard_widgets')
          .update({
            position_x: item.x,
            position_y: item.y,
            width: item.w,
            height: item.h,
          })
          .eq('id', item.widget_id)

        if (error) throw error
      }

      // Also update the dashboard's layout field
      if (dashboardId) {
        await supabase
          .from('dashboards')
          .update({ layout })
          .eq('id', dashboardId)
      }

      await fetchWidgets()
      return true
    } catch (err) {
      console.error('Error updating layout:', err)
      setError(err instanceof Error ? err.message : 'Failed to update layout')
      return false
    }
  }, [dashboardId, fetchWidgets])

  const refresh = useCallback(async () => {
    await fetchWidgets()
  }, [fetchWidgets])

  useEffect(() => {
    fetchWidgets()
  }, [fetchWidgets])

  return {
    widgets,
    loading,
    error,
    refresh,
    addWidget,
    updateWidget,
    deleteWidget,
    updateLayout,
  }
}

// Hook for dashboard KPI calculations
export interface KPIData {
  value: number
  previousValue?: number
  change?: number
  changePercentage?: number
}

export type KPIMetric =
  | 'total_revenue'
  | 'deals_won'
  | 'deals_lost'
  | 'pipeline_value'
  | 'lead_count'
  | 'conversion_rate'
  | 'avg_deal_size'
  | 'activity_count'

export function useKPIData(
  metric: KPIMetric,
  dateRange?: { start: Date; end: Date }
): { data: KPIData | null; loading: boolean; error: string | null } {
  const { user } = useAuth()
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchKPI() {
      if (!user?.tenantId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const endDate = dateRange?.end || new Date()
        const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Calculate previous period for comparison
        const periodLength = endDate.getTime() - startDate.getTime()
        const prevEndDate = new Date(startDate.getTime())
        const prevStartDate = new Date(prevEndDate.getTime() - periodLength)

        const kpiData = await calculateKPI(user.tenantId, metric, {
          current: { start: startDate, end: endDate },
          previous: { start: prevStartDate, end: prevEndDate },
        })

        setData(kpiData)
      } catch (err) {
        console.error('Error fetching KPI:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch KPI')
      } finally {
        setLoading(false)
      }
    }

    fetchKPI()
  }, [user?.tenantId, metric, dateRange?.start?.getTime(), dateRange?.end?.getTime()])

  return { data, loading, error }
}

async function calculateKPI(
  tenantId: string,
  metric: KPIMetric,
  periods: {
    current: { start: Date; end: Date }
    previous: { start: Date; end: Date }
  }
): Promise<KPIData> {
  const currentStart = periods.current.start.toISOString()
  const currentEnd = periods.current.end.toISOString()
  const prevStart = periods.previous.start.toISOString()
  const prevEnd = periods.previous.end.toISOString()

  switch (metric) {
    case 'total_revenue': {
      const { data: current } = await supabase
        .from('deals')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('won', true)
        .gte('closed_at', currentStart)
        .lte('closed_at', currentEnd)

      const { data: previous } = await supabase
        .from('deals')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('won', true)
        .gte('closed_at', prevStart)
        .lte('closed_at', prevEnd)

      const currentValue = current?.reduce((sum, d) => sum + (d.value || 0), 0) || 0
      const prevValue = previous?.reduce((sum, d) => sum + (d.value || 0), 0) || 0

      return calculateChange(currentValue, prevValue)
    }

    case 'deals_won': {
      const { count: current } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('won', true)
        .gte('closed_at', currentStart)
        .lte('closed_at', currentEnd)

      const { count: previous } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('won', true)
        .gte('closed_at', prevStart)
        .lte('closed_at', prevEnd)

      return calculateChange(current || 0, previous || 0)
    }

    case 'deals_lost': {
      const { count: current } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('won', false)
        .not('closed_at', 'is', null)
        .gte('closed_at', currentStart)
        .lte('closed_at', currentEnd)

      const { count: previous } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('won', false)
        .not('closed_at', 'is', null)
        .gte('closed_at', prevStart)
        .lte('closed_at', prevEnd)

      return calculateChange(current || 0, previous || 0)
    }

    case 'pipeline_value': {
      const { data: current } = await supabase
        .from('deals')
        .select('value')
        .eq('tenant_id', tenantId)
        .is('closed_at', null)

      const currentValue = current?.reduce((sum, d) => sum + (d.value || 0), 0) || 0
      return { value: currentValue }
    }

    case 'lead_count': {
      const { count: current } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', currentStart)
        .lte('created_at', currentEnd)

      const { count: previous } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd)

      return calculateChange(current || 0, previous || 0)
    }

    case 'conversion_rate': {
      const { count: totalCurrent } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', currentStart)
        .lte('created_at', currentEnd)

      const { count: convertedCurrent } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'converted')
        .gte('created_at', currentStart)
        .lte('created_at', currentEnd)

      const { count: totalPrev } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd)

      const { count: convertedPrev } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'converted')
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd)

      const currentRate = totalCurrent && totalCurrent > 0
        ? ((convertedCurrent || 0) / totalCurrent) * 100
        : 0
      const prevRate = totalPrev && totalPrev > 0
        ? ((convertedPrev || 0) / totalPrev) * 100
        : 0

      return calculateChange(currentRate, prevRate)
    }

    case 'avg_deal_size': {
      const { data: current } = await supabase
        .from('deals')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('won', true)
        .gte('closed_at', currentStart)
        .lte('closed_at', currentEnd)

      const { data: previous } = await supabase
        .from('deals')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('won', true)
        .gte('closed_at', prevStart)
        .lte('closed_at', prevEnd)

      const currentAvg = current && current.length > 0
        ? current.reduce((sum, d) => sum + (d.value || 0), 0) / current.length
        : 0
      const prevAvg = previous && previous.length > 0
        ? previous.reduce((sum, d) => sum + (d.value || 0), 0) / previous.length
        : 0

      return calculateChange(currentAvg, prevAvg)
    }

    case 'activity_count': {
      const { count: current } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', currentStart)
        .lte('created_at', currentEnd)

      const { count: previous } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', prevStart)
        .lte('created_at', prevEnd)

      return calculateChange(current || 0, previous || 0)
    }

    default:
      return { value: 0 }
  }
}

function calculateChange(current: number, previous: number): KPIData {
  const change = current - previous
  const changePercentage = previous !== 0
    ? Math.round((change / previous) * 100 * 100) / 100
    : current > 0 ? 100 : 0

  return {
    value: current,
    previousValue: previous,
    change,
    changePercentage,
  }
}
