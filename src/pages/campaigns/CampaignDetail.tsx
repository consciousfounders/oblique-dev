import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type {
  Campaign,
  CampaignMember,
  CampaignType,
  CampaignStatus,
  CampaignMemberStatus,
} from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowLeft,
  Save,
  Trash2,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  UserPlus,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'

interface CampaignMemberWithDetails extends CampaignMember {
  lead?: { id: string; first_name: string; last_name: string | null; email: string | null; company: string | null } | null
  contact?: { id: string; first_name: string; last_name: string | null; email: string | null } | null
}

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'event', label: 'Event' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'ads', label: 'Ads' },
  { value: 'content', label: 'Content' },
  { value: 'social', label: 'Social Media' },
  { value: 'direct_mail', label: 'Direct Mail' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const MEMBER_STATUS_OPTIONS: { value: CampaignMemberStatus; label: string }[] = [
  { value: 'added', label: 'Added' },
  { value: 'sent', label: 'Sent' },
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'responded', label: 'Responded' },
  { value: 'converted', label: 'Converted' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
]

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [members, setMembers] = useState<CampaignMemberWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Leads/Contacts for adding to campaign
  const [availableLeads, setAvailableLeads] = useState<{ id: string; first_name: string; last_name: string | null; email: string | null }[]>([])
  const [availableContacts, setAvailableContacts] = useState<{ id: string; first_name: string; last_name: string | null; email: string | null }[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberType, setMemberType] = useState<'lead' | 'contact'>('lead')
  const [selectedMemberId, setSelectedMemberId] = useState('')

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchCampaign()
      fetchMembers()
    }
  }, [id, user?.tenantId])

  async function fetchCampaign() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      console.error('Error fetching campaign:', error)
      toast.error('Failed to load campaign')
      navigate('/campaigns')
    } finally {
      setLoading(false)
    }
  }

  async function fetchMembers() {
    try {
      const { data, error } = await supabase
        .from('campaign_members')
        .select(`
          *,
          lead:leads(id, first_name, last_name, email, company),
          contact:contacts(id, first_name, last_name, email)
        `)
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching campaign members:', error)
    }
  }

  async function fetchAvailableLeadsAndContacts() {
    // Get existing member IDs to exclude
    const existingLeadIds = members.filter(m => m.lead_id).map(m => m.lead_id)
    const existingContactIds = members.filter(m => m.contact_id).map(m => m.contact_id)

    // Fetch leads not in campaign
    const { data: leads } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email')
      .not('id', 'in', existingLeadIds.length > 0 ? `(${existingLeadIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
      .order('first_name')
      .limit(100)

    // Fetch contacts not in campaign
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .not('id', 'in', existingContactIds.length > 0 ? `(${existingContactIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
      .order('first_name')
      .limit(100)

    setAvailableLeads(leads || [])
    setAvailableContacts(contacts || [])
  }

  async function saveCampaign() {
    if (!campaign) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name: campaign.name,
          description: campaign.description,
          campaign_type: campaign.campaign_type,
          status: campaign.status,
          budget: campaign.budget,
          actual_cost: campaign.actual_cost,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          utm_source: campaign.utm_source,
          utm_medium: campaign.utm_medium,
          utm_campaign: campaign.utm_campaign,
          utm_term: campaign.utm_term,
          utm_content: campaign.utm_content,
          expected_response_rate: campaign.expected_response_rate,
          expected_revenue: campaign.expected_revenue,
        })
        .eq('id', campaign.id)

      if (error) throw error
      toast.success('Campaign saved successfully')
    } catch (error) {
      console.error('Error saving campaign:', error)
      toast.error('Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  async function addMember() {
    if (!user?.tenantId || !selectedMemberId) return

    try {
      const memberData: Record<string, unknown> = {
        campaign_id: id,
        tenant_id: user.tenantId,
        is_primary_source: true,
      }

      if (memberType === 'lead') {
        memberData.lead_id = selectedMemberId
      } else {
        memberData.contact_id = selectedMemberId
      }

      const { error } = await supabase
        .from('campaign_members')
        .insert(memberData)

      if (error) throw error

      toast.success(`${memberType === 'lead' ? 'Lead' : 'Contact'} added to campaign`)
      setShowAddMember(false)
      setSelectedMemberId('')
      fetchMembers()
      fetchCampaign() // Refresh metrics
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error('Failed to add member')
    }
  }

  async function updateMemberStatus(memberId: string, status: CampaignMemberStatus) {
    try {
      const updates: Record<string, unknown> = { status }
      if (status === 'responded') {
        updates.responded_at = new Date().toISOString()
      } else if (status === 'converted') {
        updates.converted_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('campaign_members')
        .update(updates)
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.map(m => m.id === memberId ? { ...m, status, ...updates } as CampaignMemberWithDetails : m))
      toast.success('Member status updated')
      fetchCampaign() // Refresh metrics
    } catch (error) {
      console.error('Error updating member status:', error)
      toast.error('Failed to update status')
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this member from the campaign?')) return

    try {
      const { error } = await supabase
        .from('campaign_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.filter(m => m.id !== memberId))
      toast.success('Member removed')
      fetchCampaign() // Refresh metrics
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  async function deleteCampaign() {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Campaign deleted')
      navigate('/campaigns')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Failed to delete campaign')
    }
  }

  function formatCurrency(value: number | null): string {
    if (value === null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  function getMemberName(member: CampaignMemberWithDetails): string {
    if (member.lead) {
      return `${member.lead.first_name} ${member.lead.last_name || ''}`.trim()
    }
    if (member.contact) {
      return `${member.contact.first_name} ${member.contact.last_name || ''}`.trim()
    }
    return 'Unknown'
  }

  function getMemberEmail(member: CampaignMemberWithDetails): string | null {
    return member.lead?.email || member.contact?.email || null
  }

  const statusColors: Record<CampaignMemberStatus, string> = {
    added: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    opened: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    clicked: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    responded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    converted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    unsubscribed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    bounced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campaign not found</p>
        <Button onClick={() => navigate('/campaigns')} className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    )
  }

  // Calculate metrics
  const totalMembers = campaign.total_leads + campaign.total_contacts
  const conversionRate = totalMembers > 0 ? (campaign.total_converted / totalMembers) * 100 : 0
  const roi = campaign.actual_cost && campaign.actual_cost > 0 && campaign.total_revenue
    ? ((campaign.total_revenue - campaign.actual_cost) / campaign.actual_cost) * 100
    : null
  const costPerLead = campaign.actual_cost && campaign.total_leads > 0
    ? campaign.actual_cost / campaign.total_leads
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">
              {CAMPAIGN_TYPES.find(t => t.value === campaign.campaign_type)?.label} Campaign
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveCampaign} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="destructive" size="icon" onClick={deleteCampaign}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {campaign.total_leads} leads, {campaign.total_contacts} contacts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {campaign.total_converted} converted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className={`text-2xl font-bold ${roi && roi > 0 ? 'text-green-600' : ''}`}>
                  {roi !== null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : '-'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Revenue: {formatCurrency(campaign.total_revenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cost per Lead</p>
                <p className="text-2xl font-bold">
                  {costPerLead !== null ? formatCurrency(costPerLead) : '-'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Spent: {formatCurrency(campaign.actual_cost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Members ({totalMembers})
          </button>
          <button
            onClick={() => setActiveTab('utm')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === 'utm'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            UTM Tracking
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={campaign.name}
                  onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  value={campaign.campaign_type}
                  onChange={(e) => setCampaign({ ...campaign, campaign_type: e.target.value as CampaignType })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={campaign.description || ''}
                onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={campaign.status}
                  onChange={(e) => setCampaign({ ...campaign, status: e.target.value as CampaignStatus })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={campaign.start_date || ''}
                  onChange={(e) => setCampaign({ ...campaign, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={campaign.end_date || ''}
                  onChange={(e) => setCampaign({ ...campaign, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Budget</label>
                <Input
                  type="number"
                  step="0.01"
                  value={campaign.budget || ''}
                  onChange={(e) => setCampaign({ ...campaign, budget: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Actual Cost</label>
                <Input
                  type="number"
                  step="0.01"
                  value={campaign.actual_cost || ''}
                  onChange={(e) => setCampaign({ ...campaign, actual_cost: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Expected Response Rate (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={campaign.expected_response_rate || ''}
                  onChange={(e) => setCampaign({ ...campaign, expected_response_rate: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Expected Revenue</label>
                <Input
                  type="number"
                  step="0.01"
                  value={campaign.expected_revenue || ''}
                  onChange={(e) => setCampaign({ ...campaign, expected_revenue: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'members' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign Members</CardTitle>
                <CardDescription>Leads and contacts associated with this campaign</CardDescription>
              </div>
              <Button onClick={() => {
                setShowAddMember(true)
                fetchAvailableLeadsAndContacts()
              }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddMember && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex gap-4 items-end flex-wrap">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={memberType}
                      onChange={(e) => setMemberType(e.target.value as 'lead' | 'contact')}
                      className="w-[120px] h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="lead">Lead</option>
                      <option value="contact">Contact</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium">
                      {memberType === 'lead' ? 'Select Lead' : 'Select Contact'}
                    </label>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Choose a {memberType}...</option>
                      {(memberType === 'lead' ? availableLeads : availableContacts).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.first_name} {item.last_name} {item.email ? `(${item.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={addMember} disabled={!selectedMemberId}>Add</Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddMember(false)
                    setSelectedMemberId('')
                  }}>Cancel</Button>
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No members yet. Add leads or contacts to this campaign.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium">Name</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Type</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Email</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Primary</th>
                      <th className="text-left py-3 px-2 text-sm font-medium">Added</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 px-2">
                          <Link
                            to={member.lead_id ? `/leads/${member.lead_id}` : `/contacts/${member.contact_id}`}
                            className="font-medium hover:underline"
                          >
                            {getMemberName(member)}
                          </Link>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            {member.lead_id ? 'Lead' : 'Contact'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {getMemberEmail(member) || '-'}
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={member.status}
                            onChange={(e) => updateMemberStatus(member.id, e.target.value as CampaignMemberStatus)}
                            className={`h-7 rounded border-0 px-2 text-xs ${statusColors[member.status]}`}
                          >
                            {MEMBER_STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          {member.is_primary_source ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-sm">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMember(member.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'utm' && (
        <Card>
          <CardHeader>
            <CardTitle>UTM Parameters</CardTitle>
            <CardDescription>
              Configure UTM tracking parameters for campaign attribution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">UTM Source</label>
                <Input
                  placeholder="e.g., google, facebook, newsletter"
                  value={campaign.utm_source || ''}
                  onChange={(e) => setCampaign({ ...campaign, utm_source: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identifies which site sent the traffic
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">UTM Medium</label>
                <Input
                  placeholder="e.g., cpc, email, social"
                  value={campaign.utm_medium || ''}
                  onChange={(e) => setCampaign({ ...campaign, utm_medium: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identifies what type of link was used
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">UTM Campaign</label>
                <Input
                  placeholder="e.g., spring_sale, product_launch"
                  value={campaign.utm_campaign || ''}
                  onChange={(e) => setCampaign({ ...campaign, utm_campaign: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identifies a specific product promotion or campaign
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">UTM Term</label>
                <Input
                  placeholder="e.g., running+shoes"
                  value={campaign.utm_term || ''}
                  onChange={(e) => setCampaign({ ...campaign, utm_term: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identifies search terms (for paid search)
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">UTM Content</label>
              <Input
                placeholder="e.g., logolink, textlink"
                value={campaign.utm_content || ''}
                onChange={(e) => setCampaign({ ...campaign, utm_content: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Identifies what specifically was clicked to bring the user to the site
              </p>
            </div>

            {(campaign.utm_source || campaign.utm_medium || campaign.utm_campaign) && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Example URL Parameters
                </p>
                <code className="text-xs text-muted-foreground break-all">
                  ?utm_source={campaign.utm_source || 'source'}
                  &utm_medium={campaign.utm_medium || 'medium'}
                  &utm_campaign={campaign.utm_campaign || 'campaign'}
                  {campaign.utm_term && `&utm_term=${campaign.utm_term}`}
                  {campaign.utm_content && `&utm_content=${campaign.utm_content}`}
                </code>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
