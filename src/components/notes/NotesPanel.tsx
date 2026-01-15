import { useState } from 'react'
import { useNotes } from '@/lib/hooks/useNotes'
import { type EntityType } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NoteEditor } from './NoteEditor'
import { NoteCard } from './NoteCard'
import { Plus, StickyNote, Loader2 } from 'lucide-react'

interface NotesPanelProps {
  entityType: EntityType
  entityId: string
  title?: string
}

export function NotesPanel({ entityType, entityId, title = 'Notes' }: NotesPanelProps) {
  const [showEditor, setShowEditor] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    notes,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
  } = useNotes({ entityType, entityId })

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return
    setIsSubmitting(true)
    try {
      const result = await addNote(newNoteContent)
      if (result) {
        setNewNoteContent('')
        setShowEditor(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateNote = async (noteId: string, content: string) => {
    await updateNote(noteId, { content })
  }

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId)
  }

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    await togglePin(noteId, isPinned)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="w-4 h-4" />
          {title}
          {notes.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({notes.length})
            </span>
          )}
        </CardTitle>
        {!showEditor && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditor(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Note
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Note Editor */}
        {showEditor && (
          <NoteEditor
            value={newNoteContent}
            onChange={setNewNoteContent}
            onSubmit={handleAddNote}
            onCancel={() => {
              setShowEditor(false)
              setNewNoteContent('')
            }}
            submitting={isSubmitting}
            autoFocus
          />
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
        {!loading && !error && notes.length === 0 && !showEditor && (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Click "Add Note" to create one</p>
          </div>
        )}

        {/* Notes List */}
        {!loading && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && notes.length > 0 && (
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
  )
}
