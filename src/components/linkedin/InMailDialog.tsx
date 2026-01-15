import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useInMailTemplates, useLinkedInActivities } from '@/lib/hooks/useLinkedIn'
import { linkedinService } from '@/lib/services/linkedinService'
import type { LinkedInProfile, LinkedInInMailTemplate } from '@/lib/supabase'
import {
  Send,
  FileText,
  Loader2,
  ChevronDown,
  ExternalLink,
  Save,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface InMailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  linkedinProfile: LinkedInProfile
  contactName?: string
  contactCompany?: string
}

export function InMailDialog({
  open,
  onOpenChange,
  linkedinProfile,
  contactName = '',
  contactCompany = '',
}: InMailDialogProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const { templates, addTemplate, deleteTemplate } = useInMailTemplates()
  const { logActivity } = useLinkedInActivities({ linkedinProfileId: linkedinProfile.id })

  // Template variables available for substitution
  const templateVariables: Record<string, string> = {
    first_name: contactName.split(' ')[0] || '',
    last_name: contactName.split(' ').slice(1).join(' ') || '',
    full_name: contactName,
    company: contactCompany || linkedinProfile.current_company || '',
    title: linkedinProfile.current_title || '',
  }

  // Apply template
  const handleApplyTemplate = (template: LinkedInInMailTemplate) => {
    const parsedSubject = linkedinService.parseTemplateVariables(template.subject, templateVariables)
    const parsedBody = linkedinService.parseTemplateVariables(template.body, templateVariables)
    setSubject(parsedSubject)
    setBody(parsedBody)
    setSelectedTemplateId(template.id)
  }

  // Send InMail (opens LinkedIn with pre-filled message)
  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return
    setIsSending(true)

    try {
      // Log the activity
      await logActivity('inmail_sent', {
        subject: subject,
        inmailSubject: subject,
        inmailBody: body,
      })

      // Open LinkedIn messaging
      if (linkedinProfile.public_identifier) {
        const inmailUrl = linkedinService.generateInMailUrl(linkedinProfile.public_identifier)
        window.open(inmailUrl, '_blank')
      }

      // Close dialog
      onOpenChange(false)
      resetForm()
    } finally {
      setIsSending(false)
    }
  }

  // Save as template
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !subject.trim() || !body.trim()) return

    await addTemplate({
      name: templateName,
      subject: subject,
      body: body,
    })

    setShowSaveTemplate(false)
    setTemplateName('')
  }

  // Delete template
  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteTemplate(templateId)
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null)
    }
  }

  const resetForm = () => {
    setSubject('')
    setBody('')
    setSelectedTemplateId(null)
    setShowSaveTemplate(false)
    setTemplateName('')
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#0A66C2]" />
            Send InMail to {contactName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template selector */}
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  {selectedTemplateId
                    ? templates.find(t => t.id === selectedTemplateId)?.name || 'Template'
                    : 'Use Template'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>InMail Templates</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {templates.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No templates yet
                  </div>
                ) : (
                  templates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => handleApplyTemplate(template)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1 truncate">
                        <div className="font-medium truncate">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.subject}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-2"
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveTemplate(!showSaveTemplate)}
              disabled={!subject.trim() || !body.trim()}
            >
              <Save className="w-4 h-4 mr-1" />
              Save as Template
            </Button>
          </div>

          {/* Save template input */}
          {showSaveTemplate && (
            <div className="flex gap-2 p-3 bg-muted rounded-md">
              <Input
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
              >
                Save
              </Button>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="Enter subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              className="w-full min-h-[200px] px-3 py-2 border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Template variables hint */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Available variables:</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(templateVariables).map((key) => (
                <code key={key} className="px-1 py-0.5 bg-muted rounded">
                  {`{{${key}}}`}
                </code>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!subject.trim() || !body.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Open in LinkedIn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
