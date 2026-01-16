// WorkflowExecutionHistory Component
// Displays execution history for workflows

import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/lib/hooks/useAuth'
import { WorkflowService } from '@/lib/services/workflows'
import type { WorkflowExecution, WorkflowActionLog, WorkflowExecutionStatus } from '@/lib/supabase'
import { WORKFLOW_EXECUTION_STATUS_COLORS, WORKFLOW_ACTION_TYPES } from '@/lib/supabase'

interface WorkflowExecutionHistoryProps {
  workflowId?: string
}

export function WorkflowExecutionHistory({ workflowId }: WorkflowExecutionHistoryProps) {
  const { user } = useAuth()
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLogs, setActionLogs] = useState<WorkflowActionLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (user?.tenantId) {
      loadExecutions()
    }
  }, [user?.tenantId, workflowId])

  const loadExecutions = async () => {
    if (!user?.tenantId) return

    setLoading(true)
    try {
      const service = new WorkflowService(user.tenantId)
      const data = await service.getExecutions(workflowId, 100)
      setExecutions(data)
    } catch (err) {
      console.error('Error loading executions:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadExecutionDetails = async (executionId: string) => {
    if (!user?.tenantId) return

    setLoadingLogs(true)
    try {
      const service = new WorkflowService(user.tenantId)
      const details = await service.getExecutionDetails(executionId)
      if (details) {
        setActionLogs(details.actionLogs)
      }
    } catch (err) {
      console.error('Error loading execution details:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleExpand = async (executionId: string) => {
    if (expandedId === executionId) {
      setExpandedId(null)
      setActionLogs([])
    } else {
      setExpandedId(executionId)
      await loadExecutionDetails(executionId)
    }
  }

  const getStatusIcon = (status: WorkflowExecutionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: WorkflowExecutionStatus) => {
    const colors = WORKFLOW_EXECUTION_STATUS_COLORS[status]
    return (
      <Badge variant="outline" className={`${colors.bg} ${colors.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getActionLabel = (type: string) => {
    return WORKFLOW_ACTION_TYPES.find(a => a.value === type)?.label || type
  }

  const getDuration = (execution: WorkflowExecution) => {
    if (!execution.started_at) return '-'
    const start = new Date(execution.started_at)
    const end = execution.completed_at ? new Date(execution.completed_at) : new Date()
    const ms = end.getTime() - start.getTime()
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
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

  if (executions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Execution History</h3>
          <p className="text-muted-foreground">
            {workflowId
              ? 'This workflow has not been executed yet.'
              : 'No workflow executions found.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution History</CardTitle>
        <CardDescription>
          Recent workflow executions and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {executions.map(execution => (
            <Collapsible
              key={execution.id}
              open={expandedId === execution.id}
              onOpenChange={() => handleExpand(execution.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {execution.entity_type.charAt(0).toUpperCase() +
                              execution.entity_type.slice(1)}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {execution.trigger_event}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(execution.created_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {getStatusBadge(execution.status)}
                        <div className="text-xs text-muted-foreground mt-1">
                          {getDuration(execution)}
                        </div>
                      </div>
                      {expandedId === execution.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 border-t">
                    {loadingLogs ? (
                      <div className="py-4 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Execution Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Entity ID</div>
                            <div className="font-mono text-xs">{execution.entity_id}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Started At</div>
                            <div>
                              {execution.started_at
                                ? format(new Date(execution.started_at), 'PPpp')
                                : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Completed At</div>
                            <div>
                              {execution.completed_at
                                ? format(new Date(execution.completed_at), 'PPpp')
                                : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Duration</div>
                            <div>{getDuration(execution)}</div>
                          </div>
                        </div>

                        {/* Error Message */}
                        {execution.error_message && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                              Error
                            </div>
                            <div className="text-sm text-red-700 dark:text-red-300">
                              {execution.error_message}
                            </div>
                          </div>
                        )}

                        {/* Action Logs */}
                        {actionLogs.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">Actions</div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Action</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Duration</TableHead>
                                  <TableHead>Result</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {actionLogs.map(log => (
                                  <TableRow key={log.id}>
                                    <TableCell>
                                      {getActionLabel(log.action_type)}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                                    <TableCell>
                                      {log.started_at && log.completed_at
                                        ? `${new Date(log.completed_at).getTime() -
                                            new Date(log.started_at).getTime()}ms`
                                        : '-'}
                                    </TableCell>
                                    <TableCell>
                                      {log.error_message ? (
                                        <span className="text-red-600 text-sm">
                                          {log.error_message}
                                        </span>
                                      ) : log.output_data ? (
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                          {JSON.stringify(log.output_data).substring(0, 50)}
                                          {JSON.stringify(log.output_data).length > 50 && '...'}
                                        </code>
                                      ) : (
                                        '-'
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Button variant="outline" onClick={loadExecutions}>
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
