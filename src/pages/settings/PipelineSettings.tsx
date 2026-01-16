import { useState } from 'react'
import { usePipelines, PIPELINE_TYPES, STAGE_TYPES, STAGE_COLORS } from '@/lib/hooks/usePipelines'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Check,
  X,
  Star,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PipelineType, StageType } from '@/lib/supabase'

export function PipelineSettings() {
  const {
    pipelines,
    loading,
    createPipeline,
    updatePipeline,
    deletePipeline,
    setDefaultPipeline,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  } = usePipelines()

  const [showCreatePipeline, setShowCreatePipeline] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState('')
  const [newPipelineType, setNewPipelineType] = useState<PipelineType>('sales')
  const [newPipelineDescription, setNewPipelineDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [editPipelineName, setEditPipelineName] = useState('')

  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set())

  const [showCreateStage, setShowCreateStage] = useState<string | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [newStageProbability, setNewStageProbability] = useState('50')
  const [newStageType, setNewStageType] = useState<StageType>('open')
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0])
  const [creatingStage, setCreatingStage] = useState(false)

  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editStageName, setEditStageName] = useState('')
  const [editStageProbability, setEditStageProbability] = useState('')
  const [editStageType, setEditStageType] = useState<StageType>('open')
  const [editStageColor, setEditStageColor] = useState('')

  const [draggedStageId, setDraggedStageId] = useState<string | null>(null)

  const togglePipeline = (pipelineId: string) => {
    setExpandedPipelines(prev => {
      const next = new Set(prev)
      if (next.has(pipelineId)) {
        next.delete(pipelineId)
      } else {
        next.add(pipelineId)
      }
      return next
    })
  }

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) {
      toast.error('Pipeline name is required')
      return
    }

    setCreating(true)
    const result = await createPipeline({
      name: newPipelineName.trim(),
      pipeline_type: newPipelineType,
      description: newPipelineDescription.trim() || null,
    })

    if (result) {
      toast.success('Pipeline created successfully')
      setShowCreatePipeline(false)
      setNewPipelineName('')
      setNewPipelineType('sales')
      setNewPipelineDescription('')
      setExpandedPipelines(prev => new Set(prev).add(result.id))
    } else {
      toast.error('Failed to create pipeline')
    }
    setCreating(false)
  }

  const handleUpdatePipeline = async (id: string) => {
    if (!editPipelineName.trim()) {
      toast.error('Pipeline name is required')
      return
    }

    const success = await updatePipeline(id, { name: editPipelineName.trim() })
    if (success) {
      toast.success('Pipeline updated')
      setEditingPipelineId(null)
    } else {
      toast.error('Failed to update pipeline')
    }
  }

  const handleDeletePipeline = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pipeline? All stages will be removed.')) {
      return
    }

    const success = await deletePipeline(id)
    if (success) {
      toast.success('Pipeline deleted')
    } else {
      toast.error('Failed to delete pipeline')
    }
  }

  const handleSetDefault = async (id: string) => {
    const success = await setDefaultPipeline(id)
    if (success) {
      toast.success('Default pipeline updated')
    } else {
      toast.error('Failed to set default pipeline')
    }
  }

  const handleCreateStage = async (pipelineId: string) => {
    if (!newStageName.trim()) {
      toast.error('Stage name is required')
      return
    }

    setCreatingStage(true)
    const result = await createStage(pipelineId, {
      name: newStageName.trim(),
      probability: parseInt(newStageProbability) || 0,
      stage_type: newStageType,
      color: newStageColor,
    })

    if (result) {
      toast.success('Stage created successfully')
      setShowCreateStage(null)
      setNewStageName('')
      setNewStageProbability('50')
      setNewStageType('open')
      setNewStageColor(STAGE_COLORS[0])
    } else {
      toast.error('Failed to create stage')
    }
    setCreatingStage(false)
  }

  const handleUpdateStage = async (id: string) => {
    if (!editStageName.trim()) {
      toast.error('Stage name is required')
      return
    }

    const success = await updateStage(id, {
      name: editStageName.trim(),
      probability: parseInt(editStageProbability) || 0,
      stage_type: editStageType,
      color: editStageColor,
    })

    if (success) {
      toast.success('Stage updated')
      setEditingStageId(null)
    } else {
      toast.error('Failed to update stage')
    }
  }

  const handleDeleteStage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stage? Deals in this stage will need to be moved.')) {
      return
    }

    const success = await deleteStage(id)
    if (success) {
      toast.success('Stage deleted')
    } else {
      toast.error('Failed to delete stage')
    }
  }

  const handleDragStart = (stageId: string) => {
    setDraggedStageId(stageId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (pipelineId: string, targetStageId: string) => {
    if (!draggedStageId || draggedStageId === targetStageId) {
      setDraggedStageId(null)
      return
    }

    const pipeline = pipelines.find(p => p.id === pipelineId)
    if (!pipeline) {
      setDraggedStageId(null)
      return
    }

    const stages = [...pipeline.stages]
    const draggedIndex = stages.findIndex(s => s.id === draggedStageId)
    const targetIndex = stages.findIndex(s => s.id === targetStageId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStageId(null)
      return
    }

    // Reorder
    const [removed] = stages.splice(draggedIndex, 1)
    stages.splice(targetIndex, 0, removed)

    const success = await reorderStages(pipelineId, stages.map(s => s.id))
    if (success) {
      toast.success('Stages reordered')
    } else {
      toast.error('Failed to reorder stages')
    }

    setDraggedStageId(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Settings</h1>
          <p className="text-muted-foreground">Configure your sales pipelines and stages</p>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Settings</h1>
          <p className="text-muted-foreground">Configure your sales pipelines and stages</p>
        </div>
        <Button onClick={() => setShowCreatePipeline(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Pipeline
        </Button>
      </div>

      {/* Create Pipeline Form */}
      {showCreatePipeline && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Pipeline</CardTitle>
            <CardDescription>Set up a new sales pipeline for your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Pipeline Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., Enterprise Sales"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Pipeline Type</label>
                <select
                  value={newPipelineType}
                  onChange={(e) => setNewPipelineType(e.target.value as PipelineType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {PIPELINE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Input
                placeholder="Optional description"
                value={newPipelineDescription}
                onChange={(e) => setNewPipelineDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreatePipeline} disabled={creating}>
                {creating ? 'Creating...' : 'Create Pipeline'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreatePipeline(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline List */}
      {pipelines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No pipelines configured yet</p>
            <Button onClick={() => setShowCreatePipeline(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Pipeline
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pipelines.map(pipeline => (
            <Card key={pipeline.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePipeline(pipeline.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {expandedPipelines.has(pipeline.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    {editingPipelineId === pipeline.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editPipelineName}
                          onChange={(e) => setEditPipelineName(e.target.value)}
                          className="w-48"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdatePipeline(pipeline.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPipelineId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                        {pipeline.is_default && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                            <Star className="w-3 h-3" />
                            Default
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {PIPELINE_TYPES.find(t => t.value === pipeline.pipeline_type)?.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!pipeline.is_default && pipeline.id !== 'default' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetDefault(pipeline.id)}
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingPipelineId(pipeline.id)
                        setEditPipelineName(pipeline.name)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {pipeline.id !== 'default' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeletePipeline(pipeline.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {pipeline.description && (
                  <CardDescription className="ml-10">{pipeline.description}</CardDescription>
                )}
              </CardHeader>

              {expandedPipelines.has(pipeline.id) && (
                <CardContent className="pt-0">
                  <div className="ml-10 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">
                        {pipeline.stages.length} stage{pipeline.stages.length !== 1 ? 's' : ''}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCreateStage(pipeline.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Stage
                      </Button>
                    </div>

                    {/* Create Stage Form */}
                    {showCreateStage === pipeline.id && (
                      <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="sm:col-span-2">
                            <label className="text-xs font-medium mb-1 block">Stage Name</label>
                            <Input
                              placeholder="e.g., Discovery"
                              value={newStageName}
                              onChange={(e) => setNewStageName(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Probability %</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={newStageProbability}
                              onChange={(e) => setNewStageProbability(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Type</label>
                            <select
                              value={newStageType}
                              onChange={(e) => setNewStageType(e.target.value as StageType)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              {STAGE_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Color</label>
                          <div className="flex gap-2">
                            {STAGE_COLORS.map(color => (
                              <button
                                key={color}
                                onClick={() => setNewStageColor(color)}
                                className={`w-6 h-6 rounded-full border-2 ${
                                  newStageColor === color
                                    ? 'border-foreground'
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCreateStage(pipeline.id)}
                            disabled={creatingStage}
                          >
                            {creatingStage ? 'Creating...' : 'Add Stage'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCreateStage(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Stages List */}
                    {pipeline.stages.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No stages configured. Add stages to start using this pipeline.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {pipeline.stages.map((stage, index) => (
                          <div
                            key={stage.id}
                            draggable
                            onDragStart={() => handleDragStart(stage.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(pipeline.id, stage.id)}
                            className={`flex items-center gap-3 p-3 border rounded-lg bg-background ${
                              draggedStageId === stage.id ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="cursor-grab text-muted-foreground hover:text-foreground">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: stage.color || '#6b7280' }}
                            />
                            <span className="text-xs text-muted-foreground w-6">{index + 1}</span>

                            {editingStageId === stage.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <Input
                                  value={editStageName}
                                  onChange={(e) => setEditStageName(e.target.value)}
                                  className="h-8 flex-1"
                                />
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editStageProbability}
                                  onChange={(e) => setEditStageProbability(e.target.value)}
                                  className="h-8 w-20"
                                />
                                <select
                                  value={editStageType}
                                  onChange={(e) => setEditStageType(e.target.value as StageType)}
                                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                >
                                  {STAGE_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                  ))}
                                </select>
                                <div className="flex gap-1">
                                  {STAGE_COLORS.map(color => (
                                    <button
                                      key={color}
                                      onClick={() => setEditStageColor(color)}
                                      className={`w-5 h-5 rounded-full border ${
                                        editStageColor === color
                                          ? 'border-foreground'
                                          : 'border-transparent'
                                      }`}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateStage(stage.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingStageId(null)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 font-medium text-sm">{stage.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {stage.probability}%
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  stage.stage_type === 'won'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : stage.stage_type === 'lost'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {STAGE_TYPES.find(t => t.value === stage.stage_type)?.label}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStageId(stage.id)
                                    setEditStageName(stage.name)
                                    setEditStageProbability(String(stage.probability))
                                    setEditStageType(stage.stage_type)
                                    setEditStageColor(stage.color || '#6b7280')
                                  }}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteStage(stage.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
