// WorkflowBuilderPage
// Page for creating and editing workflows

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { WorkflowBuilder } from '@/components/workflows'
import { useWorkflows } from '@/lib/hooks/useWorkflows'

export function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = id && id !== 'new'

  const {
    selectedWorkflow,
    loadWorkflow,
    createWorkflow,
    updateWorkflow,
  } = useWorkflows({ autoLoad: false })

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  // Load workflow if editing
  useEffect(() => {
    if (isEditing) {
      setLoading(true)
      loadWorkflow(id).finally(() => setLoading(false))
    }
  }, [id, isEditing, loadWorkflow])

  const handleSave = async (
    workflow: Parameters<typeof createWorkflow>[0],
    conditions: Parameters<typeof createWorkflow>[1],
    actions: Parameters<typeof createWorkflow>[2]
  ) => {
    setSaving(true)
    try {
      if (isEditing) {
        await updateWorkflow(id, workflow, conditions, actions)
      } else {
        const newWorkflow = await createWorkflow(workflow, conditions, actions)
        if (newWorkflow) {
          navigate(`/workflows/${newWorkflow.id}`)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <WorkflowBuilder
      workflow={isEditing ? selectedWorkflow : null}
      onSave={handleSave}
      saving={saving}
    />
  )
}

export default WorkflowBuilderPage
