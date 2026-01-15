import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { DriveService, type ParsedDriveFile, MIME_TYPES } from '@/lib/services/driveService'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'

export function DrivePage() {
  const { session } = useAuth()
  const [files, setFiles] = useState<ParsedDriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false)
  const [search, setSearch] = useState('')
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    checkGoogleAuth()
  }, [session])

  async function checkGoogleAuth() {
    try {
      if (session?.provider_token) {
        await GoogleTokenService.initialize(session)
        setHasGoogleAuth(true)
        fetchFiles()
      } else {
        setHasGoogleAuth(false)
        setLoading(false)
      }
    } catch {
      setHasGoogleAuth(false)
      setLoading(false)
    }
  }

  async function fetchFiles() {
    setLoading(true)
    setError(null)
    try {
      const { files: fetchedFiles } = await DriveService.listFiles({
        folderId: currentFolder || undefined,
      })
      setFiles(fetchedFiles)
    } catch (err) {
      console.error('Failed to fetch files:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasGoogleAuth) {
      fetchFiles()
    }
  }, [currentFolder, hasGoogleAuth])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) {
      fetchFiles()
      return
    }

    setLoading(true)
    try {
      const results = await DriveService.search(search)
      setFiles(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return

    setCreating(true)
    try {
      await DriveService.createFolder(newFolderName, currentFolder || undefined)
      setNewFolderName('')
      setShowNewFolder(false)
      fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setCreating(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await DriveService.uploadFile(file, {
        parentId: currentFolder || undefined,
      })
      fetchFiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function navigateToFolder(file: ParsedDriveFile) {
    setFolderPath([...folderPath, { id: file.id, name: file.name }])
    setCurrentFolder(file.id)
    setSearch('')
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

  function formatSize(bytes: number): string {
    if (bytes === 0) return '-'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

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
          <Button variant="outline" size="icon" onClick={fetchFiles} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* File List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No files found</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {currentFolder && (
                <button
                  onClick={navigateBack}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                  <span>Back</span>
                </button>
              )}
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType)
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    {file.isFolder ? (
                      <button
                        onClick={() => navigateToFolder(file)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ) : (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                      </a>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="hidden sm:block">{formatSize(file.size)}</span>
                      <span className="hidden md:block">
                        {file.modifiedAt.toLocaleDateString()}
                      </span>
                      {file.isStarred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                      {!file.isFolder && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
