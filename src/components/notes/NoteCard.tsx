import { useState } from 'react'
import { type Note } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Pin, PinOff, Pencil, Trash2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NoteEditor, markdownToHtml } from './NoteEditor'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface NoteCardProps {
  note: Note
  onUpdate: (noteId: string, content: string) => Promise<void>
  onDelete: (noteId: string) => Promise<void>
  onTogglePin: (noteId: string, isPinned: boolean) => Promise<void>
}

export function NoteCard({ note, onUpdate, onDelete, onTogglePin }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    if (!editContent.trim()) return
    setIsUpdating(true)
    try {
      await onUpdate(note.id, editContent)
      setIsEditing(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(note.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTogglePin = async () => {
    await onTogglePin(note.id, !note.is_pinned)
  }

  const handleCancel = () => {
    setEditContent(note.content)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={cn(
        "rounded-lg border",
        note.is_pinned && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
      )}>
        <NoteEditor
          value={editContent}
          onChange={setEditContent}
          onSubmit={handleUpdate}
          onCancel={handleCancel}
          submitLabel="Save"
          submitting={isUpdating}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group rounded-lg border p-4 transition-colors hover:bg-muted/30",
        note.is_pinned && "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {note.is_pinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          )}
          <span className="font-medium text-foreground">
            {note.users?.full_name || 'Unknown'}
          </span>
          <span>·</span>
          <span title={new Date(note.created_at).toLocaleString()}>
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </span>
          {note.updated_at !== note.created_at && (
            <>
              <span>·</span>
              <span className="text-xs">(edited)</span>
            </>
          )}
        </div>

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
            <DropdownMenuItem onClick={handleTogglePin}>
              {note.is_pinned ? (
                <>
                  <PinOff className="w-4 h-4 mr-2" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 mr-2" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
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

      {/* Content */}
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(note.content) }}
      />
    </div>
  )
}
