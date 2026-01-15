import { useState } from 'react'
import { useAttachments } from '@/lib/hooks/useAttachments'
import { type EntityType } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FileDropzone } from './FileDropzone'
import { AttachmentCard } from './AttachmentCard'
import { Paperclip, Plus, Link as LinkIcon, Loader2 } from 'lucide-react'

interface AttachmentsPanelProps {
  entityType: EntityType
  entityId: string
  title?: string
}

export function AttachmentsPanel({ entityType, entityId, title = 'Attachments' }: AttachmentsPanelProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [isLinking, setIsLinking] = useState(false)

  const {
    attachments,
    loading,
    loadingMore,
    hasMore,
    error,
    uploading,
    uploadProgress,
    loadMore,
    uploadFile,
    linkExternalUrl,
    deleteAttachment,
    getDownloadUrl,
  } = useAttachments({ entityType, entityId })

  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      await uploadFile(file)
    }
    setShowUploadDialog(false)
  }

  const handleLinkExternal = async () => {
    if (!linkUrl.trim() || !linkName.trim()) return

    setIsLinking(true)
    try {
      await linkExternalUrl(linkUrl.trim(), linkName.trim(), linkDescription.trim() || undefined)
      setLinkUrl('')
      setLinkName('')
      setLinkDescription('')
      setShowLinkDialog(false)
    } finally {
      setIsLinking(false)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    await deleteAttachment(attachmentId)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            {title}
            {attachments.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({attachments.length})
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinkDialog(true)}
            >
              <LinkIcon className="w-4 h-4 mr-1" />
              Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Upload Progress */}
          {uploading && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="text-sm font-medium">Uploading...</div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-sm text-destructive py-4 text-center">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && attachments.length === 0 && !uploading && (
            <div className="text-center py-8 text-muted-foreground">
              <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No attachments yet</p>
              <p className="text-xs mt-1">Upload files or link external documents</p>
            </div>
          )}

          {/* Attachments List */}
          {!loading && attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  onDelete={handleDelete}
                  onGetDownloadUrl={getDownloadUrl}
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && attachments.length > 0 && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            disabled={uploading}
            className="min-h-[200px]"
          />
        </DialogContent>
      </Dialog>

      {/* Link External URL Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link External File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL *</label>
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="Document name"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Optional description"
                value={linkDescription}
                onChange={(e) => setLinkDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkExternal}
              disabled={isLinking || !linkUrl.trim() || !linkName.trim()}
            >
              {isLinking ? 'Linking...' : 'Link File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
