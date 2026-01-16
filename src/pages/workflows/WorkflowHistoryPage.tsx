// WorkflowHistoryPage
// Page for viewing workflow execution history

import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkflowExecutionHistory } from '@/components/workflows'

export function WorkflowHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Workflow History</h1>
          <p className="text-muted-foreground">
            View execution history for this workflow
          </p>
        </div>
      </div>

      {/* Execution History */}
      <WorkflowExecutionHistory workflowId={id} />
    </div>
  )
}

export default WorkflowHistoryPage
