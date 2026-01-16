// Import dialog component with file upload, preview, and field mapping

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, FileText, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react'
import { FieldMapper } from './FieldMapper'
import { useDataImport } from '@/lib/hooks/useDataImport'
import type { DataEntityType, ImportConfig } from '@/lib/data-management/types'
import { formatFileSize } from '@/lib/data-management/csv-parser'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: DataEntityType
  onSuccess?: () => void
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'

export function ImportDialog({
  open,
  onOpenChange,
  entityType,
  onSuccess,
}: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    file,
    preview,
    config,
    isLoading,
    progress,
    result,
    error,
    setFile,
    updateFieldMappings,
    setDuplicateHandling,
    executeImport,
    reset,
  } = useDataImport()

  const handleClose = () => {
    reset()
    setStep('upload')
    onOpenChange(false)
  }

  const handleFileSelect = async (selectedFile: File) => {
    await setFile(selectedFile, entityType)
    setStep('mapping')
  }

  const handleNext = () => {
    if (step === 'mapping') {
      setStep('preview')
    } else if (step === 'preview') {
      handleImport()
    }
  }

  const handleBack = () => {
    if (step === 'mapping') {
      reset()
      setStep('upload')
    } else if (step === 'preview') {
      setStep('mapping')
    }
  }

  const handleImport = async () => {
    setStep('importing')
    const importResult = await executeImport()
    if (importResult) {
      setStep('complete')
      onSuccess?.()
    } else {
      setStep('preview')
    }
  }

  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Import {entityLabel}
            {step !== 'upload' && step !== 'complete' && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Step {step === 'mapping' ? 1 : step === 'preview' ? 2 : 3} of 3
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to import records.'}
            {step === 'mapping' && 'Map your CSV columns to CRM fields.'}
            {step === 'preview' && 'Review and confirm the import.'}
            {step === 'importing' && 'Importing records...'}
            {step === 'complete' && 'Import complete.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: File Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) handleFileSelect(selectedFile)
                }}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Click to select a CSV file</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or drag and drop
                </p>
              </div>

              <div className="p-4 bg-muted rounded-md text-sm">
                <p className="font-medium mb-2">CSV Format Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>First row must contain column headers</li>
                  <li>Use comma (,) as delimiter</li>
                  <li>Enclose fields with commas or quotes in double quotes</li>
                  <li>UTF-8 encoding recommended</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 'mapping' && file && preview && config && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} · {preview.totalRows} rows detected
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                >
                  Change
                </Button>
              </div>

              <FieldMapper
                sourceFields={preview.headers}
                entityType={entityType}
                mappings={config.fieldMappings}
                onMappingsChange={updateFieldMappings}
              />

              {/* Duplicate handling */}
              <div className="p-4 bg-muted rounded-md">
                <p className="font-medium mb-3">Duplicate Handling</p>
                <div className="space-y-2">
                  {[
                    { value: 'skip', label: 'Skip duplicates', desc: 'Keep existing records, ignore new' },
                    { value: 'update', label: 'Update duplicates', desc: 'Update existing records with new data' },
                    { value: 'create_new', label: 'Create all', desc: 'Create new records even if duplicates exist' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="duplicateHandling"
                        value={option.value}
                        checked={config.duplicateHandling === option.value}
                        onChange={() => setDuplicateHandling(option.value as ImportConfig['duplicateHandling'])}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {preview.validRows}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">Valid rows</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {preview.duplicateRows}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Potential duplicates</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {preview.errorRows}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">Errors</p>
                </div>
              </div>

              {/* Preview table */}
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Row</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Data Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 20).map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-t ${
                            row.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="px-3 py-2 font-mono">{row.rowNumber}</td>
                          <td className="px-3 py-2">
                            {row.errors.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                <AlertCircle className="w-4 h-4" />
                                Error
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-4 h-4" />
                                Valid
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="truncate max-w-md" title={JSON.stringify(row.data)}>
                              {Object.entries(row.data).slice(0, 3).map(([k, v]) => (
                                <span key={k} className="mr-2">
                                  <span className="text-muted-foreground">{k}:</span> {v}
                                </span>
                              ))}
                            </div>
                            {row.errors.length > 0 && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {row.errors.join(', ')}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 20 && (
                  <div className="px-3 py-2 bg-muted text-sm text-muted-foreground text-center">
                    Showing 20 of {preview.totalRows} rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
              <p className="text-center text-lg font-medium">{progress.status}</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {progress.current} / {progress.total} rows processed
              </p>
            </div>
          )}

          {/* Complete */}
          {step === 'complete' && result && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-center text-lg font-medium">Import Complete</p>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.success}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">Imported</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {result.duplicates}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Skipped (duplicates)</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {result.failed}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">Failed</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-muted rounded-md">
                  <p className="font-medium mb-2">Errors ({result.errors.length})</p>
                  <div className="max-h-[150px] overflow-auto text-sm space-y-1">
                    {result.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="text-red-600 dark:text-red-400">
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-muted-foreground">
                        ... and {result.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {(step === 'mapping' || step === 'preview') && (
            <>
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={isLoading}>
                {step === 'preview' ? 'Start Import' : 'Next'}
                {step !== 'preview' && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </>
          )}

          {step === 'importing' && (
            <Button variant="outline" disabled>
              Importing...
            </Button>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
