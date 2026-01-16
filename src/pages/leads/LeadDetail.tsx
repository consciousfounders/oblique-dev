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
import { LeadScoringPanel, LeadQualificationPanel, LeadScoreBadge } from '@/components/leads'
import { ArrowLeft, Phone, Mail, Building2, Briefcase, Tag, Factory, Users, DollarSign } from 'lucide-react'

interface Lead {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
  source: string | null
  status: string
  converted_contact_id: string | null
  converted_account_id: string | null
  converted_at: string | null
  // Scoring fields
  score: number | null
  score_label: string | null
  demographic_score: number | null
  behavioral_score: number | null
  engagement_score: number | null
  fit_score: number | null
  qualification_status: string | null
  qualification_checklist: Record<string, boolean> | null
  industry: string | null
  company_size: string | null
  annual_revenue: string | null
  created_at: string
  updated_at: string
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  qualified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  unqualified: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInMailDialog, setShowInMailDialog] = useState(false)

  // LinkedIn profile hook
  const { profile: linkedInProfile } = useLinkedInProfile({
    entityType: 'lead',
    entityId: id || '',
  })

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchLead()
    } else {
      setLoading(false)
    }
  }, [id, user?.tenantId])

  async function fetchLead() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setLead(data)
    } catch (error) {
      console.error('Error fetching lead:', error)
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

  if (!lead) {
    return (
      <div className="space-y-4">
        <Link to="/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Lead not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/leads">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">
                  {lead.first_name} {lead.last_name}
                </CardTitle>
                <LeadScoreBadge score={lead.score} label={lead.score_label} />
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status] || statusColors.new}`}>
                {lead.status}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.title && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>{lead.title}</span>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{lead.company}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${lead.email}`} className="hover:text-primary transition-colors">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${lead.phone}`} className="hover:text-primary transition-colors">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  <span>Source: {lead.source}</span>
                </div>
              )}
              {lead.industry && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Factory className="w-4 h-4" />
                  <span>Industry: {lead.industry}</span>
                </div>
              )}
              {lead.company_size && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Company Size: {lead.company_size}</span>
                </div>
              )}
              {lead.annual_revenue && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>Annual Revenue: {lead.annual_revenue}</span>
                </div>
              )}

              {lead.status === 'converted' && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Converted on {new Date(lead.converted_at!).toLocaleDateString()}
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    {lead.converted_contact_id && (
                      <Link
                        to={`/contacts/${lead.converted_contact_id}`}
                        className="text-purple-600 dark:text-purple-400 hover:underline block"
                      >
                        View Contact →
                      </Link>
                    )}
                    {lead.converted_account_id && (
                      <Link
                        to={`/accounts/${lead.converted_account_id}`}
                        className="text-purple-600 dark:text-purple-400 hover:underline block"
                      >
                        View Account →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                Created {new Date(lead.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <NotesPanel entityType="lead" entityId={lead.id} />
          <AttachmentsPanel entityType="lead" entityId={lead.id} />
        </div>

        <div className="space-y-6">
          <LeadScoringPanel
            leadId={lead.id}
            onScoreUpdate={(score, label) => {
              setLead(prev => prev ? { ...prev, score, score_label: label } : null)
            }}
          />
          <LeadQualificationPanel
            leadId={lead.id}
            initialChecklist={lead.qualification_checklist}
            initialStatus={lead.qualification_status}
            onStatusChange={(status, checklist) => {
              setLead(prev => prev ? { ...prev, qualification_status: status, qualification_checklist: checklist } : null)
            }}
          />
          <LinkedInProfilePanel
            entityType="lead"
            entityId={lead.id}
            contactName={`${lead.first_name} ${lead.last_name || ''}`.trim()}
            contactEmail={lead.email || undefined}
            contactCompany={lead.company || undefined}
            contactTitle={lead.title || undefined}
            onSendInMail={linkedInProfile ? () => setShowInMailDialog(true) : undefined}
          />
          <ActivityForm entityType="lead" entityId={lead.id} />
          <ActivityTimeline
            entityType="lead"
            entityId={lead.id}
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
          contactName={`${lead.first_name} ${lead.last_name || ''}`.trim()}
          contactCompany={lead.company || undefined}
        />
      )}
    </div>
  )
}
