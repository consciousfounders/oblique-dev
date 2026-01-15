import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGoogleApi } from '@/lib/hooks/useGoogleApi'
import { useDriveFiles } from '@/lib/hooks/useDrive'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { type ParsedDriveFile, MIME_TYPES } from '@/lib/services/driveService'
import { queryKeys } from '@/lib/hooks/useQueryClient'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Upload,
  X,
  File,
  Folder,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// File validation configuration
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME_TYPES: string[] = [] // Empty means all types allowed

interface FileWithStatus {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled'
  progress: number
  error?: string
  abortController?: AbortController
}

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFolderId: string | null
  currentFolderPath: Array<{ id: string; name: string }>
}

export function FileUploadDialog({
  open,
  onOpenChange,
  currentFolderId,
  currentFolderPath,
}: FileUploadDialogProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [folderPickerPath, setFolderPickerPath] = useState<Array<{ id: string; name: string }>>(currentFolderPath)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const queryClient = useQueryClient()
  // Using executeWithRetry could be added for retry logic if needed
  useGoogleApi()

  // Sync selected folder with current folder when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFolderId(currentFolderId)
      setFolderPickerPath(currentFolderPath)
    }
  }, [open, currentFolderId, currentFolderPath])

  // Fetch folders for the picker
  const { files: folders, isLoading: foldersLoading } = useDriveFiles({
    folderId: showFolderPicker ? (folderPickerPath.length > 0 ? folderPickerPath[folderPickerPath.length - 1].id : undefined) : undefined,
    enabled: showFolderPicker,
    pageSize: 100,
  })

  const folderList = folders.filter(f => f.isFolder)

  // Upload mutation with progress tracking
  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileId }: { file: File; fileId: string }) => {
      const abortController = new AbortController()

      // Store abort controller for cancellation
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, abortController, status: 'uploading' as const } : f
      ))

      const accessToken = await GoogleTokenService.getAccessToken()
      const boundary = '-------' + Date.now().toString(16)

      const metadata: Record<string, unknown> = { name: file.name }
      if (selectedFolderId) {
        metadata.parents = [selectedFolderId]
      }

      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })

      const body = new Blob([
        `--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadataBlob,
        `\r\n--${boundary}\r\n`,
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
        file,
        `\r\n--${boundary}--`,
      ])

      // Use XMLHttpRequest for progress tracking
      return new Promise<ParsedDriveFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Handle abort
        abortController.signal.addEventListener('abort', () => {
          xhr.abort()
          reject(new Error('Upload cancelled'))
        })

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, progress } : f
            ))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText)
            resolve(parseFile(response))
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        }

        xhr.onerror = () => reject(new Error('Network error'))
        xhr.onabort = () => reject(new Error('Upload cancelled'))

        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart')
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
        xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`)
        xhr.send(body)
      })
    },
    onSuccess: (_data, { fileId }) => {
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'completed' as const, progress: 100 } : f
      ))
    },
    onError: (error, { fileId }) => {
      const message = error instanceof Error ? error.message : 'Upload failed'
      const isCancelled = message === 'Upload cancelled'
      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: isCancelled ? 'cancelled' as const : 'error' as const,
          error: isCancelled ? undefined : message
        } : f
      ))
    },
  })

  // Parse Drive API response
  function parseFile(file: Record<string, unknown>): ParsedDriveFile {
    return {
      id: file.id as string,
      name: file.name as string,
      mimeType: file.mimeType as string,
      size: parseInt(file.size as string || '0'),
      createdAt: new Date(file.createdTime as string),
      modifiedAt: new Date(file.modifiedTime as string),
      parentId: (file.parents as string[])?.[0] || null,
      webViewLink: file.webViewLink as string || '',
      downloadLink: file.webContentLink as string || null,
      iconLink: file.iconLink as string || '',
      thumbnailLink: file.thumbnailLink as string || null,
      owner: ((file.owners as Array<{ displayName: string }>)?.[0])?.displayName || '',
      isFolder: file.mimeType === MIME_TYPES.FOLDER,
      isShared: file.shared as boolean,
      isStarred: file.starred as boolean,
    }
  }

  // Validate file
  function validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${formatSize(MAX_FILE_SIZE)}`
    }
    if (ALLOWED_MIME_TYPES.length > 0 && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'File type not allowed'
    }
    return null
  }

  // Format file size
  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Add files to the list
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: FileWithStatus[] = Array.from(fileList).map(file => {
      const error = validateFile(file)
      return {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: error ? 'error' as const : 'pending' as const,
        progress: 0,
        error: error || undefined,
      }
    })
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
    }
    e.target.value = ''
  }, [addFiles])

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  // Remove file from list
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.abortController) {
        file.abortController.abort()
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.abortController) {
        file.abortController.abort()
      }
      return prev.map(f =>
        f.id === fileId ? { ...f, status: 'cancelled' as const } : f
      )
    })
  }, [])

  // Start uploads
  const startUploads = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')

    // Upload files sequentially to avoid rate limits
    for (const fileWithStatus of pendingFiles) {
      if (fileWithStatus.status === 'pending') {
        await uploadMutation.mutateAsync({
          file: fileWithStatus.file,
          fileId: fileWithStatus.id,
        }).catch(() => {
          // Error handled in mutation callbacks
        })
      }
    }

    // Invalidate queries to refresh file list
    queryClient.invalidateQueries({ queryKey: queryKeys.drive.files(selectedFolderId || undefined) })
  }, [files, selectedFolderId, uploadMutation, queryClient])

  // Close dialog and reset state
  const handleClose = useCallback(() => {
    // Cancel any ongoing uploads
    files.forEach(f => {
      if (f.status === 'uploading' && f.abortController) {
        f.abortController.abort()
      }
    })
    setFiles([])
    setShowFolderPicker(false)
    onOpenChange(false)
  }, [files, onOpenChange])

  // Navigate folder picker
  const navigateToFolder = useCallback((folder: ParsedDriveFile) => {
    setFolderPickerPath(prev => [...prev, { id: folder.id, name: folder.name }])
  }, [])

  const navigateToPathItem = useCallback((index: number) => {
    if (index === -1) {
      setFolderPickerPath([])
    } else {
      setFolderPickerPath(prev => prev.slice(0, index + 1))
    }
  }, [])

  const selectFolder = useCallback(() => {
    const lastFolder = folderPickerPath.length > 0 ? folderPickerPath[folderPickerPath.length - 1] : null
    setSelectedFolderId(lastFolder?.id || null)
    setShowFolderPicker(false)
  }, [folderPickerPath])

  // Computed states
  const pendingCount = files.filter(f => f.status === 'pending').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const completedCount = files.filter(f => f.status === 'completed').length
  const isUploading = uploadingCount > 0
  const canUpload = pendingCount > 0 && !isUploading
  const allCompleted = files.length > 0 && pendingCount === 0 && uploadingCount === 0

  // Destination folder name
  const destinationName = selectedFolderId
    ? (currentFolderPath.find(f => f.id === selectedFolderId)?.name ||
       folderPickerPath.find(f => f.id === selectedFolderId)?.name ||
       'Selected Folder')
    : 'My Drive'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files to Drive
          </DialogTitle>
          <DialogDescription>
            Drag and drop files or click to browse. Files will be uploaded to {destinationName}.
          </DialogDescription>
        </DialogHeader>

        {/* Folder Picker */}
        {showFolderPicker ? (
          <div className="space-y-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <button
                onClick={() => navigateToPathItem(-1)}
                className="hover:text-primary transition-colors"
              >
                My Drive
              </button>
              {folderPickerPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <button
                    onClick={() => navigateToPathItem(index)}
                    className="hover:text-primary transition-colors"
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Folder List */}
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {foldersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : folderList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No folders found
                </div>
              ) : (
                folderList.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => navigateToFolder(folder)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Folder className="w-4 h-4 text-primary" />
                    <span className="truncate">{folder.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </button>
                ))
              )}
            </div>

            {/* Folder Picker Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFolderPicker(false)}>
                Cancel
              </Button>
              <Button onClick={selectFolder}>
                Select This Folder
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Destination Selector */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Upload to:</span>
              <button
                onClick={() => setShowFolderPicker(true)}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Folder className="w-4 h-4" />
                <span>{destinationName}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className={cn(
                'w-10 h-10 mx-auto mb-3 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )} />
              <p className="text-sm font-medium">
                {isDragging ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse (max {formatSize(MAX_FILE_SIZE)} per file)
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{files.length} file(s) selected</span>
                  {completedCount > 0 && (
                    <span className="text-green-600">
                      {completedCount} completed
                    </span>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {files.map(fileWithStatus => (
                    <div
                      key={fileWithStatus.id}
                      className="flex items-center gap-3 p-2 rounded-md border bg-muted/30"
                    >
                      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{fileWithStatus.file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatSize(fileWithStatus.file.size)}</span>
                          {fileWithStatus.status === 'uploading' && (
                            <span className="text-primary">{fileWithStatus.progress}%</span>
                          )}
                          {fileWithStatus.status === 'completed' && (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          )}
                          {fileWithStatus.status === 'error' && (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fileWithStatus.error}
                            </span>
                          )}
                          {fileWithStatus.status === 'cancelled' && (
                            <span className="text-muted-foreground">Cancelled</span>
                          )}
                        </div>
                        {/* Progress Bar */}
                        {fileWithStatus.status === 'uploading' && (
                          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${fileWithStatus.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Action Button */}
                      {fileWithStatus.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(fileWithStatus.id)
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {fileWithStatus.status === 'uploading' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            cancelUpload(fileWithStatus.id)
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {(fileWithStatus.status === 'completed' || fileWithStatus.status === 'error' || fileWithStatus.status === 'cancelled') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(fileWithStatus.id)
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        {!showFolderPicker && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              {allCompleted ? 'Done' : 'Cancel'}
            </Button>
            {!allCompleted && (
              <Button
                onClick={startUploads}
                disabled={!canUpload}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading ({uploadingCount}/{files.length})
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {pendingCount > 0 ? `(${pendingCount})` : ''}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
