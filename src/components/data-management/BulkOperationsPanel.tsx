// Bulk operations panel component for batch data operations

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Trash2,
  UserPlus,
  GitMerge,
  Edit,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useBulkOperations } from '@/lib/hooks/useBulkOperations'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { DataEntityType } from '@/lib/data-management/types'

interface BulkOperationsPanelProps {
  entityType: DataEntityType
  selectedIds: string[]
  onOperationComplete: () => void
  onClearSelection: () => void
}

type OperationType = 'update' | 'delete' | 'reassign' | 'merge' | null

interface TeamMember {
  id: string
  email: string
  full_name: string | null
}

export function BulkOperationsPanel({
  entityType,
  selectedIds,
  onOperationComplete,
  onClearSelection,
}: BulkOperationsPanelProps) {
  const { user } = useAuth()
  const {
    isProcessing,
    progress,
    result,
    error,
    bulkUpdate,
    bulkDelete,
    bulkReassign,
    mergeRecords,
    reset,
  } = useBulkOperations()

  const [activeOperation, setActiveOperation] = useState<OperationType>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedOwner, setSelectedOwner] = useState('')
  const [updateField, setUpdateField] = useState('')
  const [updateValue, setUpdateValue] = useState('')
  const [primaryRecordId, setPrimaryRecordId] = useState('')

  // Fetch team members for reassignment
  useEffect(() => {
    if (user?.tenantId) {
      supabase
        .from('users')
        .select('id, email, full_name')
        .eq('tenant_id', user.tenantId)
        .then(({ data }) => {
          if (data) setTeamMembers(data)
        })
    }
  }, [user?.tenantId])

  const handleOperationClick = (operation: OperationType) => {
    setActiveOperation(operation)
    setShowConfirmDialog(true)
    reset()
  }

  const handleConfirm = async () => {
    if (!activeOperation) return

    let operationResult

    switch (activeOperation) {
      case 'update':
        if (updateField && updateValue) {
          operationResult = await bulkUpdate(entityType, selectedIds, {
            [updateField]: updateValue,
          })
        }
        break
      case 'delete':
        operationResult = await bulkDelete(entityType, selectedIds)
        break
      case 'reassign':
        if (selectedOwner) {
          operationResult = await bulkReassign(entityType, selectedIds, selectedOwner)
        }
        break
      case 'merge':
        if (primaryRecordId) {
          const duplicateIds = selectedIds.filter(id => id !== primaryRecordId)
          operationResult = await mergeRecords(entityType, primaryRecordId, duplicateIds)
        }
        break
    }

    if (operationResult) {
      onOperationComplete()
    }
  }

  const handleCloseDialog = () => {
    setShowConfirmDialog(false)
    setActiveOperation(null)
    setSelectedOwner('')
    setUpdateField('')
    setUpdateValue('')
    setPrimaryRecordId('')
    reset()
  }

  const isOperationComplete = result !== null

  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <>
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {selectedIds.length} {selectedIds.length === 1 ? entityType.slice(0, -1) : entityType} selected
              </CardTitle>
              <CardDescription>
                Choose a bulk operation to perform
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Clear selection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperationClick('update')}
            >
              <Edit className="w-4 h-4 mr-2" />
              Bulk Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperationClick('reassign')}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Reassign Owner
            </Button>
            {selectedIds.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOperationClick('merge')}
              >
                <GitMerge className="w-4 h-4 mr-2" />
                Merge Duplicates
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => handleOperationClick('delete')}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeOperation === 'update' && 'Bulk Update'}
              {activeOperation === 'delete' && 'Confirm Deletion'}
              {activeOperation === 'reassign' && 'Reassign Owner'}
              {activeOperation === 'merge' && 'Merge Records'}
            </DialogTitle>
            <DialogDescription>
              {activeOperation === 'update' && `Update ${selectedIds.length} ${entityLabel.toLowerCase()}`}
              {activeOperation === 'delete' && `This will permanently delete ${selectedIds.length} ${entityLabel.toLowerCase()}`}
              {activeOperation === 'reassign' && `Reassign ${selectedIds.length} ${entityLabel.toLowerCase()} to a new owner`}
              {activeOperation === 'merge' && `Merge ${selectedIds.length} ${entityLabel.toLowerCase()} into one record`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!isProcessing && !isOperationComplete && (
              <>
                {/* Update form */}
                {activeOperation === 'update' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Field to Update</label>
                      <select
                        value={updateField}
                        onChange={(e) => setUpdateField(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select field...</option>
                        {entityType === 'leads' && (
                          <>
                            <option value="status">Status</option>
                            <option value="source">Lead Source</option>
                          </>
                        )}
                        {entityType === 'contacts' && (
                          <>
                            <option value="title">Job Title</option>
                          </>
                        )}
                        {entityType === 'accounts' && (
                          <>
                            <option value="industry">Industry</option>
                          </>
                        )}
                        {entityType === 'deals' && (
                          <>
                            <option value="stage_id">Stage</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">New Value</label>
                      <Input
                        value={updateValue}
                        onChange={(e) => setUpdateValue(e.target.value)}
                        placeholder="Enter new value"
                      />
                    </div>
                  </div>
                )}

                {/* Delete warning */}
                {activeOperation === 'delete' && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        This action cannot be undone
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {selectedIds.length} {entityLabel.toLowerCase()} will be permanently deleted along with their associated data.
                      </p>
                    </div>
                  </div>
                )}

                {/* Reassign form */}
                {activeOperation === 'reassign' && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">New Owner</label>
                    <select
                      value={selectedOwner}
                      onChange={(e) => setSelectedOwner(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select owner...</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Merge form */}
                {activeOperation === 'merge' && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Primary Record (keep this one)</label>
                    <select
                      value={primaryRecordId}
                      onChange={(e) => setPrimaryRecordId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select primary record...</option>
                      {selectedIds.map(id => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Other records will be merged into the primary record and deleted.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Processing */}
            {isProcessing && (
              <div className="flex flex-col items-center py-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="font-medium">{progress.status}</p>
                <div className="w-full bg-muted rounded-full h-2 mt-4">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {progress.current} / {progress.total} processed
                </p>
              </div>
            )}

            {/* Complete */}
            {isOperationComplete && result && (
              <div className="flex flex-col items-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-medium">Operation Complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.success_count} succeeded, {result.failure_count} failed
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-4 w-full p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      Errors:
                    </p>
                    {result.errors.slice(0, 3).map((err, idx) => (
                      <p key={idx} className="text-sm text-red-600 dark:text-red-400">
                        {err.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && !isProcessing && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isProcessing && !isOperationComplete && (
              <>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  variant={activeOperation === 'delete' ? 'destructive' : 'default'}
                  disabled={
                    (activeOperation === 'update' && (!updateField || !updateValue)) ||
                    (activeOperation === 'reassign' && !selectedOwner) ||
                    (activeOperation === 'merge' && !primaryRecordId)
                  }
                >
                  {activeOperation === 'delete' ? 'Delete' : 'Confirm'}
                </Button>
              </>
            )}
            {(isProcessing || isOperationComplete) && (
              <Button onClick={handleCloseDialog}>
                {isOperationComplete ? 'Done' : 'Processing...'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
