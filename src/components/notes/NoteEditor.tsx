import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, List, ListOrdered, Link, Code, Quote, Heading2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoteEditorProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  placeholder?: string
  submitLabel?: string
  submitting?: boolean
  autoFocus?: boolean
}

export function NoteEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = 'Write a note... (Markdown supported)',
  submitLabel = 'Add Note',
  submitting = false,
  autoFocus = false,
}: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isPreview, setIsPreview] = useState(false)

  const insertMarkdown = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newValue =
      value.substring(0, start) +
      prefix + textToInsert + suffix +
      value.substring(end)

    onChange(newValue)

    // Set cursor position after insert
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + textToInsert.length
      )
    }, 0)
  }, [value, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
    }
  }

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**', 'bold'), title: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('*', '*', 'italic'), title: 'Italic' },
    { icon: Heading2, action: () => insertMarkdown('## ', '', 'Heading'), title: 'Heading' },
    { icon: List, action: () => insertMarkdown('- ', '', 'item'), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertMarkdown('1. ', '', 'item'), title: 'Numbered List' },
    { icon: Quote, action: () => insertMarkdown('> ', '', 'quote'), title: 'Quote' },
    { icon: Code, action: () => insertMarkdown('`', '`', 'code'), title: 'Code' },
    { icon: Link, action: () => insertMarkdown('[', '](url)', 'link text'), title: 'Link' },
  ]

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        {toolbarButtons.map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            type="button"
            onClick={action}
            title={title}
            disabled={isPreview}
            className={cn(
              "p-1.5 rounded hover:bg-muted transition-colors",
              isPreview && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            isPreview
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          {isPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Editor / Preview */}
      {isPreview ? (
        <div
          className="min-h-[120px] p-3 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full min-h-[120px] p-3 text-sm bg-transparent resize-none focus:outline-none"
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t bg-muted/30">
        <span className="text-xs text-muted-foreground">
          Markdown supported. Press Cmd+Enter to submit.
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={submitting || !value.trim()}
          >
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  if (!markdown) return '<p class="text-muted-foreground">Nothing to preview</p>'

  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Lists
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>'
  }

  return html
}

// Export for use in other components
export { markdownToHtml }
