import { useState, useCallback } from 'react'
import { type ParsedDriveFile, MIME_TYPES } from '@/lib/services/driveService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Download,
  Maximize2,
  Minimize2,
  ExternalLink,
  FileText,
  Table,
  Presentation,
  Image,
  FileVideo,
  File,
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilePreviewDialogProps {
  file: ParsedDriveFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewType = 'google-workspace' | 'image' | 'pdf' | 'video' | 'unsupported'

function getPreviewType(mimeType: string): PreviewType {
  // Google Workspace files
  if (
    mimeType === MIME_TYPES.DOCUMENT ||
    mimeType === MIME_TYPES.SPREADSHEET ||
    mimeType === MIME_TYPES.PRESENTATION ||
    mimeType === MIME_TYPES.FORM ||
    mimeType === MIME_TYPES.DRAWING
  ) {
    return 'google-workspace'
  }

  // PDF
  if (mimeType === MIME_TYPES.PDF) {
    return 'pdf'
  }

  // Images
  if (mimeType.startsWith('image/')) {
    const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
    if (supportedFormats.includes(mimeType) || mimeType.startsWith('image/')) {
      return 'image'
    }
  }

  // Videos
  if (mimeType.startsWith('video/')) {
    return 'video'
  }

  return 'unsupported'
}

function getFileTypeIcon(mimeType: string) {
  if (mimeType === MIME_TYPES.DOCUMENT) return FileText
  if (mimeType === MIME_TYPES.SPREADSHEET) return Table
  if (mimeType === MIME_TYPES.PRESENTATION) return Presentation
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return FileVideo
  return File
}

function getGoogleEmbedUrl(file: ParsedDriveFile): string {
  // Use Google's preview URL for workspace files
  // Format: https://drive.google.com/file/d/{fileId}/preview
  return `https://drive.google.com/file/d/${file.id}/preview`
}

function getImagePreviewUrl(file: ParsedDriveFile): string {
  // Use thumbnail with larger size, or direct content link
  if (file.thumbnailLink) {
    // Increase thumbnail size by modifying the URL
    return file.thumbnailLink.replace(/=s\d+/, '=s1600')
  }
  // For images, we can try the webContentLink directly
  if (file.downloadLink) {
    return file.downloadLink
  }
  // Fallback to Google Drive preview
  return `https://drive.google.com/file/d/${file.id}/preview`
}

export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
}: FilePreviewDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const handleClose = useCallback(() => {
    setIsFullscreen(false)
    setIsLoading(true)
    setImageError(false)
    onOpenChange(false)
  }, [onOpenChange])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
    setIsLoading(false)
  }, [])

  const handleDownload = useCallback(() => {
    if (!file) return
    // If downloadLink is available, use it; otherwise open webViewLink
    const downloadUrl = file.downloadLink || file.webViewLink
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }, [file])

  const handleOpenExternal = useCallback(() => {
    if (!file?.webViewLink) return
    window.open(file.webViewLink, '_blank')
  }, [file])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  if (!file) return null

  const previewType = getPreviewType(file.mimeType)
  const Icon = getFileTypeIcon(file.mimeType)

  const renderPreviewContent = () => {
    switch (previewType) {
      case 'google-workspace':
      case 'pdf':
        return (
          <div className="relative w-full h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              src={getGoogleEmbedUrl(file)}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              allow="autoplay"
              title={file.name}
            />
          </div>
        )

      case 'image':
        if (imageError) {
          return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <Image className="w-16 h-16" />
              <p>Unable to load image preview</p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download to view
              </Button>
            </div>
          )
        }
        return (
          <div className="relative w-full h-full flex items-center justify-center bg-black/5">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={getImagePreviewUrl(file)}
              alt={file.name}
              className={cn(
                'max-w-full max-h-full object-contain',
                isLoading && 'opacity-0'
              )}
              onLoad={handleLoad}
              onError={handleImageError}
            />
          </div>
        )

      case 'video':
        return (
          <div className="relative w-full h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              src={getGoogleEmbedUrl(file)}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              allow="autoplay"
              title={file.name}
            />
          </div>
        )

      case 'unsupported':
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Icon className="w-16 h-16" />
            <p className="text-lg font-medium">{file.name}</p>
            <p className="text-sm">Preview not available for this file type</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleOpenExternal}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Google Drive
              </Button>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )
    }
  }

  // Fullscreen mode renders outside dialog
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleOpenExternal} title="Open in Google Drive">
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Exit fullscreen">
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Fullscreen Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-4xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0',
          '[&>button]:hidden' // Hide default close button, we have custom controls
        )}
      >
        {/* Dialog Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b space-y-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <DialogTitle className="truncate">{file.name}</DialogTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={handleOpenExternal} title="Open in Google Drive">
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Fullscreen">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
