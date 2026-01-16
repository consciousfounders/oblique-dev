import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { useLinkedInProfile } from '@/lib/hooks/useLinkedIn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline, ActivityForm } from '@/components/activity'
import { NotesPanel } from '@/components/notes'
import { AttachmentsPanel } from '@/components/attachments'
import { LinkedInProfilePanel, InMailDialog } from '@/components/linkedin'
import { ArrowLeft, Phone, Mail, Building2, Briefcase, Smartphone, FileText, Tag } from 'lucide-react'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  secondary_email: string | null
  phone: string | null
  mobile_phone: string | null
  title: string | null
  department: string | null
  account_id: string | null
  lead_source: string | null
  notes: string | null
  accounts: { id: string; name: string } | null
  created_at: string
  updated_at: string
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInMailDialog, setShowInMailDialog] = useState(false)

  // LinkedIn profile hook
  const { profile: linkedInProfile } = useLinkedInProfile({
    entityType: 'contact',
    entityId: id || '',
  })

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchContact()
    } else {
      setLoading(false)
    }
  }, [id, user?.tenantId])

  async function fetchContact() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, accounts(id, name)')
        .eq('id', id)
        .single()

      if (error) throw error
      setContact(data)
    } catch (error) {
      console.error('Error fetching contact:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="space-y-4">
        <Link to="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contacts
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contact not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {contact.first_name} {contact.last_name}
                  </CardTitle>
                  {contact.lead_source && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                      <Tag className="w-3 h-3" />
                      {contact.lead_source}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job Info */}
              {(contact.title || contact.department) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>
                    {contact.title}
                    {contact.title && contact.department && ' - '}
                    {contact.department}
                  </span>
                </div>
              )}

              {/* Account */}
              {contact.accounts && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <Link
                    to={`/accounts/${contact.accounts.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {contact.accounts.name}
                  </Link>
                </div>
              )}

              {/* Primary Email */}
              {contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                    {contact.email}
                  </a>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Primary</span>
                </div>
              )}

              {/* Secondary Email */}
              {contact.secondary_email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${contact.secondary_email}`} className="hover:text-primary transition-colors">
                    {contact.secondary_email}
                  </a>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Secondary</span>
                </div>
              )}

              {/* Work Phone */}
              {contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">
                    {contact.phone}
                  </a>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Work</span>
                </div>
              )}

              {/* Mobile Phone */}
              {contact.mobile_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Smartphone className="w-4 h-4" />
                  <a href={`tel:${contact.mobile_phone}`} className="hover:text-primary transition-colors">
                    {contact.mobile_phone}
                  </a>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Mobile</span>
                </div>
              )}

              {/* Contact Notes */}
              {contact.notes && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <FileText className="w-4 h-4" />
                    Notes
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                Created {new Date(contact.created_at).toLocaleDateString()}
                {contact.updated_at !== contact.created_at && (
                  <> · Updated {new Date(contact.updated_at).toLocaleDateString()}</>
                )}
              </div>
            </CardContent>
          </Card>

          <NotesPanel entityType="contact" entityId={contact.id} />
          <AttachmentsPanel entityType="contact" entityId={contact.id} />
        </div>

        <div className="space-y-6">
          <LinkedInProfilePanel
            entityType="contact"
            entityId={contact.id}
            contactName={`${contact.first_name} ${contact.last_name || ''}`.trim()}
            contactEmail={contact.email || undefined}
            contactCompany={contact.accounts?.name}
            contactTitle={contact.title || undefined}
            onSendInMail={linkedInProfile ? () => setShowInMailDialog(true) : undefined}
          />
          <ActivityForm entityType="contact" entityId={contact.id} />
          <ActivityTimeline
            entityType="contact"
            entityId={contact.id}
            title="Activity"
            maxHeight="500px"
          />
        </div>
      </div>

      {/* InMail Dialog */}
      {linkedInProfile && (
        <InMailDialog
          open={showInMailDialog}
          onOpenChange={setShowInMailDialog}
          linkedinProfile={linkedInProfile}
          contactName={`${contact.first_name} ${contact.last_name || ''}`.trim()}
          contactCompany={contact.accounts?.name}
        />
      )}
    </div>
  )
}
