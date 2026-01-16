import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type {
  Pipeline,
  PipelineInsert,
  PipelineUpdate,
  DealStage,
  DealStageInsert,
  DealStageUpdate,
  PipelineType,
  StageType,
} from '@/lib/supabase'

export interface PipelineWithStages extends Pipeline {
  stages: DealStage[]
}

export interface PipelineAnalytics {
  pipelineId: string
  totalDeals: number
  totalValue: number
  weightedValue: number
  avgDealSize: number
  stageMetrics: {
    stageId: string
    stageName: string
    dealCount: number
    totalValue: number
    avgTimeInStage: number | null
    conversionRate: number
  }[]
}

interface UsePipelinesReturn {
  pipelines: PipelineWithStages[]
  loading: boolean
  error: string | null
  selectedPipelineId: string | null
  selectedPipeline: PipelineWithStages | null
  setSelectedPipelineId: (id: string | null) => void
  createPipeline: (data: Omit<PipelineInsert, 'tenant_id'>) => Promise<Pipeline | null>
  updatePipeline: (id: string, data: PipelineUpdate) => Promise<boolean>
  deletePipeline: (id: string) => Promise<boolean>
  setDefaultPipeline: (id: string) => Promise<boolean>
  createStage: (pipelineId: string, data: Omit<DealStageInsert, 'tenant_id' | 'pipeline_id' | 'position'> & { position?: number }) => Promise<DealStage | null>
  updateStage: (id: string, data: DealStageUpdate) => Promise<boolean>
  deleteStage: (id: string) => Promise<boolean>
  reorderStages: (pipelineId: string, stageIds: string[]) => Promise<boolean>
  getAnalytics: (pipelineId: string) => Promise<PipelineAnalytics | null>
  refresh: () => Promise<void>
}

export const PIPELINE_TYPES: { value: PipelineType; label: string }[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'upsell', label: 'Upsell/Expansion' },
  { value: 'custom', label: 'Custom' },
]

export const STAGE_TYPES: { value: StageType; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won (Closed)' },
  { value: 'lost', label: 'Lost (Closed)' },
]

export const STAGE_COLORS = [
  '#6b7280', // Gray
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
]

export function usePipelines(): UsePipelinesReturn {
  const { user } = useAuth()
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)

  const fetchPipelines = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .order('position')

      if (pipelinesError) throw pipelinesError

      // Fetch all stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('deal_stages')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .order('position')

      if (stagesError) throw stagesError

      // Group stages by pipeline
      const pipelinesWithStages: PipelineWithStages[] = (pipelinesData || []).map(pipeline => ({
        ...pipeline,
        stages: (stagesData || []).filter(stage => stage.pipeline_id === pipeline.id),
      }))

      // Include orphan stages (stages without pipeline) as a virtual "Default" pipeline
      const orphanStages = (stagesData || []).filter(stage => !stage.pipeline_id)
      if (orphanStages.length > 0 && !pipelinesData?.length) {
        // Create a virtual default pipeline for backward compatibility
        pipelinesWithStages.unshift({
          id: 'default',
          tenant_id: user.tenantId,
          name: 'Default Pipeline',
          description: null,
          pipeline_type: 'sales',
          is_default: true,
          is_active: true,
          color: '#3b82f6',
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stages: orphanStages,
        })
      }

      setPipelines(pipelinesWithStages)

      // Set default selected pipeline
      if (!selectedPipelineId && pipelinesWithStages.length > 0) {
        const defaultPipeline = pipelinesWithStages.find(p => p.is_default) || pipelinesWithStages[0]
        setSelectedPipelineId(defaultPipeline.id)
      }
    } catch (err) {
      console.error('Error fetching pipelines:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pipelines')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, selectedPipelineId])

  const createPipeline = useCallback(async (
    data: Omit<PipelineInsert, 'tenant_id'>
  ): Promise<Pipeline | null> => {
    if (!user?.tenantId) return null

    try {
      // Get max position
      const maxPosition = Math.max(0, ...pipelines.map(p => p.position))

      const { data: newPipeline, error: insertError } = await supabase
        .from('pipelines')
        .insert({
          ...data,
          tenant_id: user.tenantId,
          position: data.position ?? maxPosition + 1,
        })
        .select()
        .single()

      if (insertError) throw insertError

      await fetchPipelines()
      return newPipeline
    } catch (err) {
      console.error('Error creating pipeline:', err)
      setError(err instanceof Error ? err.message : 'Failed to create pipeline')
      return null
    }
  }, [user?.tenantId, pipelines, fetchPipelines])

  const updatePipeline = useCallback(async (
    id: string,
    data: PipelineUpdate
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('pipelines')
        .update(data)
        .eq('id', id)

      if (updateError) throw updateError

      await fetchPipelines()
      return true
    } catch (err) {
      console.error('Error updating pipeline:', err)
      setError(err instanceof Error ? err.message : 'Failed to update pipeline')
      return false
    }
  }, [fetchPipelines])

  const deletePipeline = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Select another pipeline if the deleted one was selected
      if (selectedPipelineId === id) {
        const remaining = pipelines.filter(p => p.id !== id)
        setSelectedPipelineId(remaining[0]?.id || null)
      }

      await fetchPipelines()
      return true
    } catch (err) {
      console.error('Error deleting pipeline:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete pipeline')
      return false
    }
  }, [fetchPipelines, selectedPipelineId, pipelines])

  const setDefaultPipeline = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({ is_default: true })
        .eq('id', id)

      if (updateError) throw updateError

      await fetchPipelines()
      return true
    } catch (err) {
      console.error('Error setting default pipeline:', err)
      setError(err instanceof Error ? err.message : 'Failed to set default pipeline')
      return false
    }
  }, [fetchPipelines])

  const createStage = useCallback(async (
    pipelineId: string,
    data: Omit<DealStageInsert, 'tenant_id' | 'pipeline_id' | 'position'> & { position?: number }
  ): Promise<DealStage | null> => {
    if (!user?.tenantId) return null

    try {
      // Get max position for this pipeline
      const pipeline = pipelines.find(p => p.id === pipelineId)
      const maxPosition = Math.max(0, ...(pipeline?.stages.map(s => s.position) || []))

      const { data: newStage, error: insertError } = await supabase
        .from('deal_stages')
        .insert({
          ...data,
          tenant_id: user.tenantId,
          pipeline_id: pipelineId === 'default' ? null : pipelineId,
          position: data.position ?? maxPosition + 1,
        })
        .select()
        .single()

      if (insertError) throw insertError

      await fetchPipelines()
      return newStage
    } catch (err) {
      console.error('Error creating stage:', err)
      setError(err instanceof Error ? err.message : 'Failed to create stage')
      return null
    }
  }, [user?.tenantId, pipelines, fetchPipelines])

  const updateStage = useCallback(async (
    id: string,
    data: DealStageUpdate
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('deal_stages')
        .update(data)
        .eq('id', id)

      if (updateError) throw updateError

      await fetchPipelines()
      return true
    } catch (err) {
      console.error('Error updating stage:', err)
      setError(err instanceof Error ? err.message : 'Failed to update stage')
      return false
    }
  }, [fetchPipelines])

  const deleteStage = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('deal_stages')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await fetchPipelines()
      return true
    } catch (err) {
      console.error('Error deleting stage:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete stage')
      return false
    }
  }, [fetchPipelines])

  const reorderStages = useCallback(async (
    _pipelineId: string,
    stageIds: string[]
  ): Promise<boolean> => {
    try {
      // Update positions
      const updates = stageIds.map((id, index) =>
        supabase
          .from('deal_stages')
          .update({ position: index })
          .eq('id', id)
      )

      await Promise.all(updates)
      await fetchPipelines()
      return true
    } catch (err) {
      console.error('Error reordering stages:', err)
      setError(err instanceof Error ? err.message : 'Failed to reorder stages')
      return false
    }
  }, [fetchPipelines])

  const getAnalytics = useCallback(async (
    pipelineId: string
  ): Promise<PipelineAnalytics | null> => {
    if (!user?.tenantId) return null

    try {
      const pipeline = pipelines.find(p => p.id === pipelineId)
      if (!pipeline) return null

      const stageIds = pipeline.stages.map(s => s.id)
      if (stageIds.length === 0) {
        return {
          pipelineId,
          totalDeals: 0,
          totalValue: 0,
          weightedValue: 0,
          avgDealSize: 0,
          stageMetrics: [],
        }
      }

      // Fetch deals for this pipeline's stages
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id, value, stage_id, created_at')
        .eq('tenant_id', user.tenantId)
        .in('stage_id', stageIds)

      if (dealsError) throw dealsError

      // Fetch stage history for time in stage calculations
      const { data: history, error: historyError } = await supabase
        .from('deal_stage_history')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .in('to_stage_id', stageIds)

      if (historyError) throw historyError

      // Calculate metrics
      const totalDeals = deals?.length || 0
      const totalValue = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0

      // Weighted value (probability * value)
      const weightedValue = deals?.reduce((sum, d) => {
        const stage = pipeline.stages.find(s => s.id === d.stage_id)
        const probability = (stage?.probability || 0) / 100
        return sum + (d.value || 0) * probability
      }, 0) || 0

      const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0

      // Stage metrics
      const stageMetrics = pipeline.stages.map(stage => {
        const stageDeals = deals?.filter(d => d.stage_id === stage.id) || []
        const stageHistory = history?.filter(h => h.to_stage_id === stage.id) || []

        // Calculate average time in stage (in days)
        let avgTimeInStage: number | null = null
        if (stageHistory.length > 0) {
          const totalTime = stageHistory.reduce((sum, h) => {
            if (h.time_in_previous_stage) {
              // Parse PostgreSQL interval to seconds
              const match = h.time_in_previous_stage.match(/(\d+):(\d+):(\d+)/)
              if (match) {
                const hours = parseInt(match[1]) + parseInt(match[2]) / 60 + parseInt(match[3]) / 3600
                return sum + hours / 24 // Convert to days
              }
            }
            return sum
          }, 0)
          avgTimeInStage = totalTime / stageHistory.length
        }

        // Calculate conversion rate (deals that moved from this stage to the next)
        const nextStage = pipeline.stages.find(s => s.position === stage.position + 1)
        let conversionRate = 0
        if (nextStage) {
          const movedToNext = history?.filter(h =>
            h.from_stage_id === stage.id && h.to_stage_id === nextStage.id
          ).length || 0
          const totalEntered = history?.filter(h => h.to_stage_id === stage.id).length || 0
          conversionRate = totalEntered > 0 ? (movedToNext / totalEntered) * 100 : 0
        }

        return {
          stageId: stage.id,
          stageName: stage.name,
          dealCount: stageDeals.length,
          totalValue: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
          avgTimeInStage,
          conversionRate,
        }
      })

      return {
        pipelineId,
        totalDeals,
        totalValue,
        weightedValue,
        avgDealSize,
        stageMetrics,
      }
    } catch (err) {
      console.error('Error getting analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to get analytics')
      return null
    }
  }, [user?.tenantId, pipelines])

  const refresh = useCallback(async () => {
    await fetchPipelines()
  }, [fetchPipelines])

  // Initial fetch
  useEffect(() => {
    fetchPipelines()
  }, [fetchPipelines])

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || null

  return {
    pipelines,
    loading,
    error,
    selectedPipelineId,
    selectedPipeline,
    setSelectedPipelineId,
    createPipeline,
    updatePipeline,
    deletePipeline,
    setDefaultPipeline,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    getAnalytics,
    refresh,
  }
}
