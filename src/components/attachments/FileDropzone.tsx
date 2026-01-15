import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number // in bytes
  maxFiles?: number
  disabled?: boolean
  className?: string
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024 // 50MB

export function FileDropzone({
  onFilesSelected,
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = 10,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = []
    const errors: string[] = []

    for (const file of files.slice(0, maxFiles)) {
      if (file.size > maxSize) {
        errors.push(`${file.name} exceeds ${formatSize(maxSize)} limit`)
        continue
      }

      if (accept) {
        const acceptedTypes = accept.split(',').map(t => t.trim())
        const fileType = file.type
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExtension === type.toLowerCase()
          }
          if (type.endsWith('/*')) {
            return fileType.startsWith(type.slice(0, -1))
          }
          return fileType === type
        })

        if (!isAccepted) {
          errors.push(`${file.name} is not an accepted file type`)
          continue
        }
      }

      valid.push(file)
    }

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`)
    }

    return { valid, errors }
  }, [accept, maxSize, maxFiles])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setError(null)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    const { valid, errors } = validateFiles(files)

    if (errors.length > 0) {
      setError(errors.join(', '))
    }

    if (valid.length > 0) {
      onFilesSelected(valid)
    }
  }, [disabled, validateFiles, onFilesSelected])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files ? Array.from(e.target.files) : []
    const { valid, errors } = validateFiles(files)

    if (errors.length > 0) {
      setError(errors.join(', '))
    }

    if (valid.length > 0) {
      onFilesSelected(valid)
    }

    // Reset input
    e.target.value = ''
  }, [validateFiles, onFilesSelected])

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-6 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input
        type="file"
        onChange={handleChange}
        accept={accept}
        multiple={maxFiles > 1}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex flex-col items-center text-center">
        <Upload className={cn(
          "w-8 h-8 mb-2",
          isDragging ? "text-primary" : "text-muted-foreground"
        )} />
        <p className="text-sm font-medium">
          {isDragging ? 'Drop files here' : 'Drag and drop files'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Max {formatSize(maxSize)} per file
        </p>
        {error && (
          <p className="text-xs text-destructive mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return Math.round(bytes / (1024 * 1024)) + ' MB'
}
