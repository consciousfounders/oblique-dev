import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline, ActivityForm } from '@/components/activity'
import { NotesPanel } from '@/components/notes'
import { AttachmentsPanel } from '@/components/attachments'
import { AccountCombobox } from '@/components/contacts/AccountCombobox'
import { ContactCombobox, UserCombobox } from '@/components/deals'
import { DealProductsPanel } from '@/components/products'
import {
  ArrowLeft,
  DollarSign,
  Building2,
  User,
  Calendar,
  TrendingUp,
  Edit2,
  X,
  Check,
  Tag,
  Target,
  FileText,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { DealType } from '@/lib/supabase'

interface DealStage {
  id: string
  name: string
  probability: number
  position: number
}

interface Deal {
  id: string
  name: string
  value: number | null
  stage_id: string
  deal_stages: DealStage | null
  account_id: string | null
  accounts: { id: string; name: string } | null
  contact_id: string | null
  contacts: { id: string; first_name: string; last_name: string | null } | null
  owner_id: string | null
  users: { id: string; full_name: string | null; email: string } | null
  expected_close_date: string | null
  closed_at: string | null
  won: boolean | null
  description: string | null
  lead_source: string | null
  deal_type: DealType
  next_step: string | null
  competitors: string[] | null
  probability: number | null
  created_at: string
  updated_at: string
}

interface RelatedContact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  title: string | null
}

const LEAD_SOURCES = [
  'Website',
  'Referral',
  'LinkedIn',
  'Cold Call',
  'Trade Show',
  'Email Campaign',
  'Partner',
  'Other',
]

const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: 'new_business', label: 'New Business' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'upsell', label: 'Upsell' },
  { value: 'cross_sell', label: 'Cross-Sell' },
]

const getDealTypeLabel = (value: DealType) => {
  return DEAL_TYPES.find(t => t.value === value)?.label || value
}

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [stages, setStages] = useState<DealStage[]>([])
  const [relatedContacts, setRelatedContacts] = useState<RelatedContact[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Deal>>({})
  const [saving, setSaving] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState('')

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [id, user?.tenantId])

  async function fetchData() {
    try {
      const [dealResult, stagesResult] = await Promise.all([
        supabase
          .from('deals')
          .select(`
            *,
            deal_stages(*),
            accounts(id, name),
            contacts(id, first_name, last_name),
            users:owner_id(id, full_name, email)
          `)
          .eq('id', id)
          .single(),
        supabase.from('deal_stages').select('*').order('position'),
      ])

      if (dealResult.error) throw dealResult.error
      setDeal(dealResult.data)
      setStages(stagesResult.data || [])

      // Fetch related contacts if there's an account
      if (dealResult.data?.account_id) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, title')
          .eq('account_id', dealResult.data.account_id)
          .order('first_name')

        setRelatedContacts(contacts || [])
      }
    } catch (error) {
      console.error('Error fetching deal:', error)
      toast.error('Failed to load deal')
    } finally {
      setLoading(false)
    }
  }

  async function updateStage(newStageId: string) {
    if (!deal) return

    try {
      const stage = stages.find(s => s.id === newStageId)
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', deal.id)

      if (error) throw error

      setDeal(prev => prev ? { ...prev, stage_id: newStageId, deal_stages: stage || null } : null)
      toast.success('Stage updated')
    } catch (error) {
      console.error('Error updating stage:', error)
      toast.error('Failed to update stage')
    }
  }

  async function closeDeal(won: boolean) {
    if (!deal) return

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          won,
          closed_at: new Date().toISOString(),
        })
        .eq('id', deal.id)

      if (error) throw error

      setDeal(prev => prev ? { ...prev, won, closed_at: new Date().toISOString() } : null)
      toast.success(`Deal marked as ${won ? 'Won' : 'Lost'}`)
    } catch (error) {
      console.error('Error closing deal:', error)
      toast.error('Failed to close deal')
    }
  }

  async function reopenDeal() {
    if (!deal) return

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          won: null,
          closed_at: null,
        })
        .eq('id', deal.id)

      if (error) throw error

      setDeal(prev => prev ? { ...prev, won: null, closed_at: null } : null)
      toast.success('Deal reopened')
    } catch (error) {
      console.error('Error reopening deal:', error)
      toast.error('Failed to reopen deal')
    }
  }

  function startEditing() {
    if (!deal) return
    setEditData({
      name: deal.name,
      value: deal.value,
      account_id: deal.account_id,
      contact_id: deal.contact_id,
      owner_id: deal.owner_id,
      expected_close_date: deal.expected_close_date,
      description: deal.description,
      lead_source: deal.lead_source,
      deal_type: deal.deal_type,
      next_step: deal.next_step,
      competitors: deal.competitors || [],
      probability: deal.probability,
    })
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditData({})
    setNewCompetitor('')
  }

  async function saveChanges() {
    if (!deal) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('deals')
        .update({
          name: editData.name,
          value: editData.value,
          account_id: editData.account_id,
          contact_id: editData.contact_id,
          owner_id: editData.owner_id,
          expected_close_date: editData.expected_close_date || null,
          description: editData.description || null,
          lead_source: editData.lead_source || null,
          deal_type: editData.deal_type,
          next_step: editData.next_step || null,
          competitors: editData.competitors?.length ? editData.competitors : null,
          probability: editData.probability,
        })
        .eq('id', deal.id)

      if (error) throw error

      toast.success('Deal updated')
      setIsEditing(false)
      fetchData()
    } catch (error) {
      console.error('Error updating deal:', error)
      toast.error('Failed to update deal')
    } finally {
      setSaving(false)
    }
  }

  function addCompetitor() {
    if (!newCompetitor.trim()) return
    setEditData(prev => ({
      ...prev,
      competitors: [...(prev.competitors || []), newCompetitor.trim()],
    }))
    setNewCompetitor('')
  }

  function removeCompetitor(index: number) {
    setEditData(prev => ({
      ...prev,
      competitors: prev.competitors?.filter((_, i) => i !== index) || [],
    }))
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getProbability = () => {
    if (deal?.probability !== null && deal?.probability !== undefined) {
      return deal.probability
    }
    return deal?.deal_stages?.probability || 0
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

  if (!deal) {
    return (
      <div className="space-y-4">
        <Link to="/deals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deals
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Deal not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/deals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        {!deal.closed_at && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => closeDeal(false)}>
              Mark as Lost
            </Button>
            <Button size="sm" onClick={() => closeDeal(true)}>
              Mark as Won
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-2xl">{deal.name}</CardTitle>
              {!isEditing ? (
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveChanges} disabled={saving}>
                    <Check className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                /* Edit Mode */
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Deal Name</label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Value</label>
                    <Input
                      type="number"
                      value={editData.value || ''}
                      onChange={(e) => setEditData({ ...editData, value: e.target.value ? parseFloat(e.target.value) : null })}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Expected Close Date</label>
                    <Input
                      type="date"
                      value={editData.expected_close_date || ''}
                      onChange={(e) => setEditData({ ...editData, expected_close_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account</label>
                    <AccountCombobox
                      value={editData.account_id || null}
                      onChange={(id) => setEditData({ ...editData, account_id: id, contact_id: null })}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Primary Contact</label>
                    <ContactCombobox
                      value={editData.contact_id || null}
                      onChange={(id) => setEditData({ ...editData, contact_id: id })}
                      accountId={editData.account_id}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Deal Owner</label>
                    <UserCombobox
                      value={editData.owner_id || null}
                      onChange={(id) => setEditData({ ...editData, owner_id: id })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Deal Type</label>
                    <select
                      value={editData.deal_type || 'new_business'}
                      onChange={(e) => setEditData({ ...editData, deal_type: e.target.value as DealType })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {DEAL_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Lead Source</label>
                    <select
                      value={editData.lead_source || ''}
                      onChange={(e) => setEditData({ ...editData, lead_source: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select source...</option>
                      {LEAD_SOURCES.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Probability (%)</label>
                    <Input
                      type="number"
                      value={editData.probability ?? ''}
                      onChange={(e) => setEditData({ ...editData, probability: e.target.value ? parseInt(e.target.value) : null })}
                      min="0"
                      max="100"
                      placeholder="Auto from stage"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Next Step</label>
                    <Input
                      value={editData.next_step || ''}
                      onChange={(e) => setEditData({ ...editData, next_step: e.target.value })}
                      placeholder="Next action to take"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Competitors</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newCompetitor}
                        onChange={(e) => setNewCompetitor(e.target.value)}
                        placeholder="Add competitor"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
                      />
                      <Button type="button" variant="outline" onClick={addCompetitor}>Add</Button>
                    </div>
                    {editData.competitors && editData.competitors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editData.competitors.map((competitor, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                          >
                            {competitor}
                            <button
                              type="button"
                              onClick={() => removeCompetitor(index)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {deal.value && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <span className="text-2xl font-bold">{formatCurrency(deal.value)}</span>
                    </div>
                  )}

                  {deal.deal_stages && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>{deal.deal_stages.name} ({getProbability()}% probability)</span>
                    </div>
                  )}

                  {deal.accounts && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <Link
                        to={`/accounts/${deal.accounts.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {deal.accounts.name}
                      </Link>
                    </div>
                  )}

                  {deal.contacts && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <Link
                        to={`/contacts/${deal.contacts.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {deal.contacts.first_name} {deal.contacts.last_name}
                      </Link>
                    </div>
                  )}

                  {deal.users && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Owner: {deal.users.full_name || deal.users.email}</span>
                    </div>
                  )}

                  {deal.expected_close_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Expected close: {new Date(deal.expected_close_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {deal.deal_type && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      <span>Type: {getDealTypeLabel(deal.deal_type)}</span>
                    </div>
                  )}

                  {deal.lead_source && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span>Source: {deal.lead_source}</span>
                    </div>
                  )}

                  {deal.next_step && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Next step: {deal.next_step}</span>
                    </div>
                  )}

                  {deal.competitors && deal.competitors.length > 0 && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 mt-0.5" />
                      <div>
                        <span className="block mb-1">Competitors:</span>
                        <div className="flex flex-wrap gap-1">
                          {deal.competitors.map((competitor, index) => (
                            <span key={index} className="px-2 py-0.5 bg-muted rounded text-sm">
                              {competitor}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {deal.description && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.description}</p>
                    </div>
                  )}

                  {deal.closed_at && (
                    <div className={`mt-4 p-4 rounded-lg ${deal.won ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                      <p className={`text-sm font-medium ${deal.won ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                        {deal.won ? 'Won' : 'Lost'} on {new Date(deal.closed_at).toLocaleDateString()}
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-2"
                        onClick={reopenDeal}
                      >
                        Reopen deal
                      </Button>
                    </div>
                  )}

                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    Created {new Date(deal.created_at).toLocaleDateString()} &middot;
                    Updated {new Date(deal.updated_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Stage */}
          {stages.length > 0 && !deal.closed_at && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pipeline Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {stages.map((stage) => (
                    <Button
                      key={stage.id}
                      variant={deal.stage_id === stage.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateStage(stage.id)}
                    >
                      {stage.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Contacts */}
          {relatedContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedContacts.map((contact) => (
                    <Link
                      key={contact.id}
                      to={`/contacts/${contact.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <span className="font-medium">
                          {contact.first_name} {contact.last_name}
                          {contact.id === deal.contact_id && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </span>
                        {contact.title && (
                          <span className="block text-sm text-muted-foreground">{contact.title}</span>
                        )}
                      </div>
                      {contact.email && (
                        <span className="text-sm text-muted-foreground">{contact.email}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <DealProductsPanel dealId={deal.id} />
          <NotesPanel entityType="deal" entityId={deal.id} />
          <AttachmentsPanel entityType="deal" entityId={deal.id} />
        </div>

        <div className="space-y-6">
          <ActivityForm entityType="deal" entityId={deal.id} />
          <ActivityTimeline
            entityType="deal"
            entityId={deal.id}
            title="Activity"
            maxHeight="500px"
          />
        </div>
      </div>
    </div>
  )
}
