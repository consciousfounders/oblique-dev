import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline, ActivityForm } from '@/components/activity'
import { NotesPanel } from '@/components/notes'
import { AttachmentsPanel } from '@/components/attachments'
import { ArrowLeft, Phone, Mail, Building2, Briefcase } from 'lucide-react'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  account_id: string | null
  accounts: { id: string; name: string } | null
  created_at: string
  updated_at: string
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

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
              <CardTitle className="text-2xl">
                {contact.first_name} {contact.last_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.title && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>{contact.title}</span>
                </div>
              )}
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
              {contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">
                    {contact.phone}
                  </a>
                </div>
              )}
              <div className="pt-4 border-t text-xs text-muted-foreground">
                Created {new Date(contact.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <NotesPanel entityType="contact" entityId={contact.id} />
          <AttachmentsPanel entityType="contact" entityId={contact.id} />
        </div>

        <div className="space-y-6">
          <ActivityForm entityType="contact" entityId={contact.id} />
          <ActivityTimeline
            entityType="contact"
            entityId={contact.id}
            title="Activity"
            maxHeight="500px"
          />
        </div>
      </div>
    </div>
  )
}
