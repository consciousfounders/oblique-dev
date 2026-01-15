import { useState } from 'react'
import { type Attachment } from '@/lib/supabase'
import { formatFileSize, getFileTypeIcon, canPreviewFile } from '@/lib/hooks/useAttachments'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  File,
  FileText,
  Image,
  Film,
  Music,
  Table,
  Presentation,
  Archive,
  MoreVertical,
  Download,
  ExternalLink,
  Trash2,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const FILE_ICONS: Record<string, React.ElementType> = {
  'file': File,
  'file-text': FileText,
  'image': Image,
  'video': Film,
  'audio': Music,
  'table': Table,
  'presentation': Presentation,
  'archive': Archive,
}

interface AttachmentCardProps {
  attachment: Attachment
  onDelete: (id: string) => Promise<void>
  onGetDownloadUrl: (attachment: Attachment) => Promise<string | null>
}

export function AttachmentCard({ attachment, onDelete, onGetDownloadUrl }: AttachmentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const iconType = getFileTypeIcon(attachment.file_mime_type)
  const Icon = FILE_ICONS[iconType] || File
  const canPreview = canPreviewFile(attachment.file_mime_type)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(attachment.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = async () => {
    const url = await onGetDownloadUrl(attachment)
    if (url) {
      window.open(url, '_blank')
    }
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    try {
      const url = await onGetDownloadUrl(attachment)
      setPreviewUrl(url)
      setShowPreview(true)
    } finally {
      setLoadingPreview(false)
    }
  }

  const getStorageTypeLabel = () => {
    switch (attachment.storage_type) {
      case 'google_drive':
        return 'Google Drive'
      case 'external':
        return 'External Link'
      default:
        return null
    }
  }

  const storageLabel = getStorageTypeLabel()

  return (
    <>
      <div className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
        {/* File Icon */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          iconType === 'image' ? "bg-green-500/10 text-green-600" :
          iconType === 'video' ? "bg-purple-500/10 text-purple-600" :
          iconType === 'file-text' ? "bg-blue-500/10 text-blue-600" :
          "bg-muted text-muted-foreground"
        )}>
          <Icon className="w-5 h-5" />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={attachment.file_name}>
            {attachment.file_name}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {attachment.file_size && (
              <span>{formatFileSize(attachment.file_size)}</span>
            )}
            {storageLabel && (
              <>
                <span>·</span>
                <span>{storageLabel}</span>
              </>
            )}
            <span>·</span>
            <span title={new Date(attachment.created_at).toLocaleString()}>
              {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
            </span>
          </div>
          {attachment.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {attachment.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canPreview && (
              <DropdownMenuItem onClick={handlePreview} disabled={loadingPreview}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDownload}>
              {attachment.storage_type === 'external' || attachment.storage_type === 'google_drive' ? (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate">{attachment.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px] overflow-auto">
            {previewUrl && attachment.file_mime_type?.startsWith('image/') && (
              <img
                src={previewUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
            {previewUrl && attachment.file_mime_type === 'application/pdf' && (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh]"
                title={attachment.file_name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
