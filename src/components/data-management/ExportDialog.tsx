// Export dialog component with field selection and format options

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { useDataExport } from '@/lib/hooks/useDataExport'
import type { DataEntityType, ExportConfig } from '@/lib/data-management/types'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: DataEntityType
}

export function ExportDialog({
  open,
  onOpenChange,
  entityType,
}: ExportDialogProps) {
  const {
    isExporting,
    progress,
    error,
    executeExport,
    getRecordCount,
    getAvailableExportFields,
    reset,
  } = useDataExport()

  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [recordCount, setRecordCount] = useState<number>(0)
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [exportComplete, setExportComplete] = useState(false)

  const availableFields = getAvailableExportFields(entityType)

  // Initialize with all fields selected
  useEffect(() => {
    if (open) {
      setSelectedFields(availableFields.map(f => f.name))
      setExportComplete(false)
      getRecordCount(entityType).then(setRecordCount)
    }
  }, [open, entityType])

  const handleClose = () => {
    reset()
    setExportComplete(false)
    onOpenChange(false)
  }

  const handleExport = async () => {
    const config: ExportConfig = {
      entityType,
      fields: selectedFields,
      format: 'csv',
      includeHeaders,
    }

    const success = await executeExport(config)
    if (success) {
      setExportComplete(true)
    }
  }

  const toggleField = (fieldName: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    )
  }

  const selectAll = () => {
    setSelectedFields(availableFields.map(f => f.name))
  }

  const deselectAll = () => {
    setSelectedFields([])
  }

  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export {entityLabel}</DialogTitle>
          <DialogDescription>
            Select fields and format to export your data.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!exportComplete ? (
            <>
              {/* Record count */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{recordCount.toLocaleString()} records</p>
                  <p className="text-sm text-muted-foreground">will be exported</p>
                </div>
              </div>

              {/* Field selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">Select Fields</p>
                  <div className="space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAll}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAll}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-3 bg-muted rounded-md">
                  {availableFields.map(field => (
                    <label
                      key={field.name}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.name)}
                        onChange={() => toggleField(field.name)}
                        className="rounded"
                      />
                      <span className="text-sm">{field.label}</span>
                    </label>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground mt-2">
                  {selectedFields.length} of {availableFields.length} fields selected
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include column headers</span>
                </label>
              </div>

              {/* Progress */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${progress.current}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {progress.status}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </div>
              )}
            </>
          ) : (
            /* Export complete */
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-center text-lg font-medium">Export Complete</p>
              <p className="text-center text-sm text-muted-foreground">
                {recordCount.toLocaleString()} records exported with {selectedFields.length} fields.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {!exportComplete ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || selectedFields.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
