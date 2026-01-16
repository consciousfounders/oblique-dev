// WorkflowList Component
// Displays a list of workflows with actions

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Workflow } from '@/lib/supabase'
import {
  WORKFLOW_TRIGGER_TYPES,
  WORKFLOW_ENTITY_TYPES,
} from '@/lib/supabase'

interface WorkflowListProps {
  workflows: Workflow[]
  onToggle: (id: string, isActive: boolean) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onDuplicate: (id: string) => Promise<void>
}

export function WorkflowList({
  workflows,
  onToggle,
  onDelete,
  onDuplicate,
}: WorkflowListProps) {
  const navigate = useNavigate()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const getTriggerLabel = (type: Workflow['trigger_type']) => {
    const trigger = WORKFLOW_TRIGGER_TYPES.find(t => t.value === type)
    return trigger?.label || type
  }

  const getEntityLabel = (type: string) => {
    const entity = WORKFLOW_ENTITY_TYPES.find(e => e.value === type)
    return entity?.label || type
  }

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId)
      setDeleteId(null)
    }
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Workflows Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first workflow to automate tasks and actions in your CRM.
          </p>
          <Button onClick={() => navigate('/workflows/new')}>
            Create Workflow
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {workflows.map(workflow => (
          <Card key={workflow.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={workflow.is_active}
                    onCheckedChange={(checked) => onToggle(workflow.id, checked)}
                    aria-label={`${workflow.is_active ? 'Deactivate' : 'Activate'} workflow`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{workflow.name}</h3>
                      {workflow.is_active ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {workflow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTriggerLabel(workflow.trigger_type)}
                      </span>
                      <span>
                        {getEntityLabel(workflow.entity_type)}
                      </span>
                      {workflow.run_once_per_record && (
                        <Badge variant="secondary" className="text-xs">
                          Run Once
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/workflows/${workflow.id}`)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/workflows/${workflow.id}`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(workflow.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/workflows/${workflow.id}/history`)}>
                        <Clock className="h-4 w-4 mr-2" />
                        View History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(workflow.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
              All execution history for this workflow will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
