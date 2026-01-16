import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountCombobox } from '@/components/contacts/AccountCombobox'
import { ContactCombobox, UserCombobox, DealQuickCreate } from '@/components/deals'
import { Plus, DollarSign, Building2, Calendar, Search, User } from 'lucide-react'
import { toast } from 'sonner'
import type { DealType } from '@/lib/supabase'
import { CustomFieldRenderer } from '@/components/custom-fields'
import { useCustomFields } from '@/lib/hooks/useCustomFields'

interface DealStage {
  id: string
  name: string
  position: number
  probability: number
}

interface Deal {
  id: string
  name: string
  value: number | null
  stage_id: string
  account_id: string | null
  accounts: { name: string } | null
  contact_id: string | null
  contacts: { first_name: string; last_name: string | null } | null
  owner_id: string | null
  users: { full_name: string | null } | null
  expected_close_date: string | null
  deal_type: DealType
  lead_source: string | null
  created_at: string
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

export function DealsPage() {
  const { user } = useAuth()
  const [stages, setStages] = useState<DealStage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [newDeal, setNewDeal] = useState({
    name: '',
    value: '',
    stage_id: '',
    account_id: null as string | null,
    contact_id: null as string | null,
    owner_id: null as string | null,
    expected_close_date: '',
    lead_source: '',
    deal_type: 'new_business' as DealType,
    next_step: '',
    description: '',
  })
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({})
  const { fields: customFields } = useCustomFields({ module: 'deals' })

  useEffect(() => {
    if (user?.tenantId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchData() {
    try {
      const [stagesResult, dealsResult] = await Promise.all([
        supabase.from('deal_stages').select('*').order('position'),
        supabase
          .from('deals')
          .select('*, accounts(name), contacts(first_name, last_name), users:owner_id(full_name)')
          .order('created_at', { ascending: false }),
      ])

      if (stagesResult.error) throw stagesResult.error
      if (dealsResult.error) throw dealsResult.error

      setStages(stagesResult.data || [])
      setDeals(dealsResult.data || [])

      // Set default stage
      if (stagesResult.data?.length && !newDeal.stage_id) {
        setNewDeal(prev => ({ ...prev, stage_id: stagesResult.data[0].id }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) {
      toast.error('No tenant assigned')
      return
    }

    if (!newDeal.account_id) {
      toast.error('Account is required')
      return
    }

    if (!newDeal.stage_id) {
      toast.error('Stage is required')
      return
    }

    try {
      const { data: newDealData, error } = await supabase.from('deals').insert({
        tenant_id: user.tenantId,
        name: newDeal.name.trim(),
        value: newDeal.value ? parseFloat(newDeal.value) : null,
        stage_id: newDeal.stage_id,
        account_id: newDeal.account_id,
        contact_id: newDeal.contact_id,
        owner_id: newDeal.owner_id || user.id,
        expected_close_date: newDeal.expected_close_date || null,
        lead_source: newDeal.lead_source || null,
        deal_type: newDeal.deal_type,
        next_step: newDeal.next_step.trim() || null,
        description: newDeal.description.trim() || null,
      }).select('id').single()

      if (error) throw error

      // Save custom field values if any
      if (newDealData && Object.keys(customFieldValues).length > 0) {
        const fieldValuePairs = Object.entries(customFieldValues)
          .filter(([fieldName]) => customFields.find(f => f.name === fieldName))
          .map(([fieldName, value]) => {
            const field = customFields.find(f => f.name === fieldName)
            return {
              tenant_id: user.tenantId,
              field_id: field!.id,
              entity_id: newDealData.id,
              module: 'deals' as const,
              value: value,
            }
          })

        if (fieldValuePairs.length > 0) {
          await supabase.from('custom_field_values').insert(fieldValuePairs)
        }
      }

      toast.success('Deal created successfully')
      setShowCreate(false)
      setNewDeal({
        name: '',
        value: '',
        stage_id: stages[0]?.id || '',
        account_id: null,
        contact_id: null,
        owner_id: user.id,
        expected_close_date: '',
        lead_source: '',
        deal_type: 'new_business',
        next_step: '',
        description: '',
      })
      setCustomFieldValues({})
      fetchData()
    } catch (error) {
      console.error('Error creating deal:', error)
      toast.error('Failed to create deal')
    }
  }

  async function moveDeal(dealId: string, newStageId: string) {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', dealId)

      if (error) throw error

      setDeals(prev =>
        prev.map(d => d.id === dealId ? { ...d, stage_id: newStageId } : d)
      )
      toast.success('Deal moved successfully')
    } catch (error) {
      console.error('Error moving deal:', error)
      toast.error('Failed to move deal')
    }
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getPipelineValue = (stageId: string) => {
    return filteredDeals
      .filter(d => d.stage_id === stageId)
      .reduce((sum, d) => sum + (d.value || 0), 0)
  }

  // Filter deals by search
  const filteredDeals = deals.filter((deal) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      deal.name.toLowerCase().includes(searchLower) ||
      deal.accounts?.name.toLowerCase().includes(searchLower) ||
      deal.contacts?.first_name.toLowerCase().includes(searchLower) ||
      deal.contacts?.last_name?.toLowerCase().includes(searchLower) ||
      deal.lead_source?.toLowerCase().includes(searchLower)
    )
  })

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            {filteredDeals.length} deals worth {formatCurrency(filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0))}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowQuickCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Quick Add
          </Button>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-2" />
            {showCreate ? 'Cancel' : 'Add Deal'}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deals by name, account, contact, or source..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createDeal} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Deal Name */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium mb-1.5 block">
                    Deal Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Enter deal name"
                    value={newDeal.name}
                    onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                    required
                  />
                </div>

                {/* Account */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Account <span className="text-destructive">*</span>
                  </label>
                  <AccountCombobox
                    value={newDeal.account_id}
                    onChange={(id) => setNewDeal({ ...newDeal, account_id: id, contact_id: null })}
                    required
                    placeholder="Select account..."
                  />
                </div>

                {/* Primary Contact */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Primary Contact</label>
                  <ContactCombobox
                    value={newDeal.contact_id}
                    onChange={(id) => setNewDeal({ ...newDeal, contact_id: id })}
                    accountId={newDeal.account_id}
                    placeholder="Select contact..."
                  />
                </div>

                {/* Deal Owner */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Deal Owner</label>
                  <UserCombobox
                    value={newDeal.owner_id}
                    onChange={(id) => setNewDeal({ ...newDeal, owner_id: id })}
                    placeholder="Select owner..."
                  />
                </div>

                {/* Value */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Amount/Value</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newDeal.value}
                    onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                    step="0.01"
                    min="0"
                  />
                </div>

                {/* Expected Close Date */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Expected Close Date</label>
                  <Input
                    type="date"
                    value={newDeal.expected_close_date}
                    onChange={(e) => setNewDeal({ ...newDeal, expected_close_date: e.target.value })}
                  />
                </div>

                {/* Stage */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Stage <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={newDeal.stage_id}
                    onChange={(e) => setNewDeal({ ...newDeal, stage_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required
                  >
                    {stages.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name} ({stage.probability}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deal Type */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Deal Type</label>
                  <select
                    value={newDeal.deal_type}
                    onChange={(e) => setNewDeal({ ...newDeal, deal_type: e.target.value as DealType })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {DEAL_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Source */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Lead Source</label>
                  <select
                    value={newDeal.lead_source}
                    onChange={(e) => setNewDeal({ ...newDeal, lead_source: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select source...</option>
                    {LEAD_SOURCES.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                {/* Next Step */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Next Step</label>
                  <Input
                    placeholder="Next action to take"
                    value={newDeal.next_step}
                    onChange={(e) => setNewDeal({ ...newDeal, next_step: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea
                    placeholder="Deal description or notes"
                    value={newDeal.description}
                    onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    rows={3}
                  />
                </div>
              </div>

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <CustomFieldRenderer
                  module="deals"
                  values={customFieldValues}
                  onChange={setCustomFieldValues}
                />
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit">Create Deal</Button>
                <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setCustomFieldValues({}); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      {stages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No pipeline stages configured yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage_id === stage.id)
              const stageValue = getPipelineValue(stage.id)

              return (
                <div
                  key={stage.id}
                  className="w-72 flex-shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const dealId = e.dataTransfer.getData('dealId')
                    if (dealId) moveDeal(dealId, stage.id)
                  }}
                >
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-sm">{stage.name}</h3>
                        <span className="text-xs text-muted-foreground">{stage.probability}% probability</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {stageDeals.length} - {formatCurrency(stageValue)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {stageDeals.map(deal => (
                        <Link key={deal.id} to={`/deals/${deal.id}`}>
                          <Card
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('dealId', deal.id)
                            }}
                            className="cursor-grab active:cursor-grabbing hover:bg-card/80 transition-colors"
                          >
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm">{deal.name}</h4>
                              <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                                {deal.value && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {formatCurrency(deal.value)}
                                  </span>
                                )}
                                {deal.accounts && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {deal.accounts.name}
                                  </span>
                                )}
                                {deal.contacts && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {deal.contacts.first_name} {deal.contacts.last_name}
                                  </span>
                                )}
                                {deal.expected_close_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(deal.expected_close_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}

                      {stageDeals.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Drop deals here
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Create Modal */}
      <DealQuickCreate
        open={showQuickCreate}
        onOpenChange={setShowQuickCreate}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
