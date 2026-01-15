import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDriveFiles, useCreateFolder, useToggleStar } from '@/lib/hooks/useDrive'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { type ParsedDriveFile, MIME_TYPES } from '@/lib/services/driveService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VirtualList } from '@/components/ui/virtual-list'
import { FileUploadDialog } from '@/components/drive/FileUploadDialog'
import { FilePreviewDialog } from '@/components/drive/FilePreviewDialog'
import {
  HardDrive,
  Folder,
  FileText,
  Image,
  Video,
  Music,
  File,
  Table,
  Presentation,
  Search,
  RefreshCw,
  Upload,
  FolderPlus,
  ChevronRight,
  Star,
  ExternalLink,
  ArrowLeft,
  RotateCcw,
  Eye,
} from 'lucide-react'

export function DrivePage() {
  const { session, signInWithGoogle } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [previewFile, setPreviewFile] = useState<ParsedDriveFile | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)

  // Initialize Google Token Service
  const hasGoogleAuth = !!session?.provider_token
  if (hasGoogleAuth && session) {
    GoogleTokenService.initialize(session)
  }

  // Use React Query hooks for data fetching with pagination
  const {
    files,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error: filesError,
  } = useDriveFiles({
    folderId: currentFolder || undefined,
    search: search || undefined,
    pageSize: 50,
    enabled: hasGoogleAuth,
  })

  // Mutations
  const createFolder = useCreateFolder()
  const toggleStar = useToggleStar()

  const error = filesError?.message || createFolder.error?.message || null

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return

    try {
      await createFolder.mutateAsync({
        name: newFolderName,
        parentId: currentFolder || undefined,
      })
      setNewFolderName('')
      setShowNewFolder(false)
    } catch (err) {
      console.error('Failed to create folder:', err)
    }
  }

  function navigateToFolder(file: ParsedDriveFile) {
    setFolderPath([...folderPath, { id: file.id, name: file.name }])
    setCurrentFolder(file.id)
    setSearch('')
    setSearchInput('')
  }

  function navigateBack() {
    if (folderPath.length === 0) return
    const newPath = folderPath.slice(0, -1)
    setFolderPath(newPath)
    setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1].id : null)
  }

  function navigateToPathItem(index: number) {
    if (index === -1) {
      setFolderPath([])
      setCurrentFolder(null)
    } else {
      setFolderPath(folderPath.slice(0, index + 1))
      setCurrentFolder(folderPath[index].id)
    }
  }

  function getFileIcon(mimeType: string) {
    if (mimeType === MIME_TYPES.FOLDER) return Folder
    if (mimeType === MIME_TYPES.DOCUMENT) return FileText
    if (mimeType === MIME_TYPES.SPREADSHEET) return Table
    if (mimeType === MIME_TYPES.PRESENTATION) return Presentation
    if (mimeType.startsWith('image/')) return Image
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    return File
  }

  function handlePreviewFile(file: ParsedDriveFile) {
    setPreviewFile(file)
    setShowPreviewDialog(true)
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '-'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Render file item for virtual list
  const renderFileItem = useCallback(
    (file: ParsedDriveFile) => {
      const Icon = getFileIcon(file.mimeType)
      return (
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b">
          {file.isFolder ? (
            <button
              onClick={() => navigateToFolder(file)}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="truncate">{file.name}</span>
            </button>
          ) : (
            <button
              onClick={() => handlePreviewFile(file)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <Icon className="w-5 h-5 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
            </button>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="hidden sm:block">{formatSize(file.size)}</span>
            <span className="hidden md:block">
              {file.modifiedAt.toLocaleDateString()}
            </span>
            <button
              onClick={() => toggleStar.mutate({ fileId: file.id, starred: !file.isStarred })}
              className="hover:text-foreground"
            >
              <Star
                className={`w-4 h-4 ${
                  file.isStarred ? 'text-yellow-500 fill-yellow-500' : ''
                }`}
              />
            </button>
            {!file.isFolder && (
              <>
                <button
                  onClick={() => handlePreviewFile(file)}
                  className="hover:text-foreground"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                  title="Open in Google Drive"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            )}
          </div>
        </div>
      )
    },
    [toggleStar]
  )

  // Not connected to Google
  if (!hasGoogleAuth) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <HardDrive className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Connect Your Google Drive</h2>
            <p className="text-muted-foreground">
              Sign in with Google to browse and manage your Drive files.
            </p>
            <Button onClick={signInWithGoogle} className="w-full">
              Connect with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drive</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => navigateToPathItem(-1)}
          className="hover:text-primary transition-colors"
        >
          My Drive
        </button>
        {folderPath.map((folder, index) => (
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

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {/* New Folder Dialog */}
      {showNewFolder && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateFolder} className="flex gap-2">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
              <Button type="submit" disabled={createFolder.isPending}>
                {createFolder.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-2 text-destructive hover:text-destructive">
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* File List with Virtual Scrolling */}
      <Card>
        <CardContent className="p-0">
          {currentFolder && (
            <button
              onClick={navigateBack}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              <span>Back</span>
            </button>
          )}
          <VirtualList
            items={files}
            estimatedItemHeight={52}
            getItemKey={(file) => file.id}
            renderItem={renderFileItem}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            isLoading={isLoading}
            maxHeight="calc(100vh - 340px)"
            emptyState={
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No files found</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        currentFolderId={currentFolder}
        currentFolderPath={folderPath}
      />

      {/* Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
      />
    </div>
  )
}
