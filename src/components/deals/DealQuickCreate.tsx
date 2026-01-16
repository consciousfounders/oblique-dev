import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AccountCombobox } from '@/components/contacts/AccountCombobox'
import { ContactCombobox } from './ContactCombobox'
import { UserCombobox } from './UserCombobox'
import { toast } from 'sonner'
import type { DealType } from '@/lib/supabase'

interface DealStage {
  id: string
  name: string
  position: number
  probability: number
}

interface DealQuickCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (dealId: string) => void
  defaultAccountId?: string | null
  defaultContactId?: string | null
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

export function DealQuickCreate({
  open,
  onOpenChange,
  onSuccess,
  defaultAccountId,
  defaultContactId,
}: DealQuickCreateProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stages, setStages] = useState<DealStage[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    value: '',
    stage_id: '',
    account_id: defaultAccountId || null as string | null,
    contact_id: defaultContactId || null as string | null,
    owner_id: null as string | null,
    expected_close_date: '',
    lead_source: '',
    deal_type: 'new_business' as DealType,
    next_step: '',
    description: '',
  })

  useEffect(() => {
    if (open && user?.tenantId) {
      fetchStages()
      // Reset form when opening
      setFormData({
        name: '',
        value: '',
        stage_id: '',
        account_id: defaultAccountId || null,
        contact_id: defaultContactId || null,
        owner_id: user.id,
        expected_close_date: '',
        lead_source: '',
        deal_type: 'new_business',
        next_step: '',
        description: '',
      })
    }
  }, [open, user?.tenantId, defaultAccountId, defaultContactId])

  async function fetchStages() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('deal_stages')
        .select('*')
        .order('position')

      if (error) throw error
      setStages(data || [])
      if (data?.length && !formData.stage_id) {
        setFormData(prev => ({ ...prev, stage_id: data[0].id }))
      }
    } catch (error) {
      console.error('Error fetching stages:', error)
      toast.error('Failed to load deal stages')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!user?.tenantId) {
      toast.error('No tenant assigned')
      return
    }

    if (!formData.name.trim()) {
      toast.error('Deal name is required')
      return
    }

    if (!formData.account_id) {
      toast.error('Account is required')
      return
    }

    if (!formData.stage_id) {
      toast.error('Stage is required')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('deals')
        .insert({
          tenant_id: user.tenantId,
          name: formData.name.trim(),
          value: formData.value ? parseFloat(formData.value) : null,
          stage_id: formData.stage_id,
          account_id: formData.account_id,
          contact_id: formData.contact_id,
          owner_id: formData.owner_id || user.id,
          expected_close_date: formData.expected_close_date || null,
          lead_source: formData.lead_source || null,
          deal_type: formData.deal_type,
          next_step: formData.next_step.trim() || null,
          description: formData.description.trim() || null,
        })
        .select('id')
        .single()

      if (error) throw error

      toast.success('Deal created successfully')
      onOpenChange(false)

      if (onSuccess) {
        onSuccess(data.id)
      } else {
        navigate(`/deals/${data.id}`)
      }
    } catch (error) {
      console.error('Error creating deal:', error)
      toast.error('Failed to create deal')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Deal Name */}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">
                Deal Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Enter deal name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Account */}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">
                Account <span className="text-destructive">*</span>
              </label>
              <AccountCombobox
                value={formData.account_id}
                onChange={(id) => setFormData({ ...formData, account_id: id, contact_id: null })}
                required
                placeholder="Select account..."
              />
            </div>

            {/* Primary Contact */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Primary Contact</label>
              <ContactCombobox
                value={formData.contact_id}
                onChange={(id) => setFormData({ ...formData, contact_id: id })}
                accountId={formData.account_id}
                placeholder="Select contact..."
              />
            </div>

            {/* Deal Owner */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Deal Owner</label>
              <UserCombobox
                value={formData.owner_id}
                onChange={(id) => setFormData({ ...formData, owner_id: id })}
                placeholder="Select owner..."
              />
            </div>

            {/* Value */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount/Value</label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                step="0.01"
                min="0"
              />
            </div>

            {/* Expected Close Date */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Expected Close Date</label>
              <Input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>

            {/* Stage */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Stage <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.stage_id}
                onChange={(e) => setFormData({ ...formData, stage_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
                disabled={loading}
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
                value={formData.deal_type}
                onChange={(e) => setFormData({ ...formData, deal_type: e.target.value as DealType })}
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
                value={formData.lead_source}
                onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
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
                value={formData.next_step}
                onChange={(e) => setFormData({ ...formData, next_step: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                placeholder="Deal description or notes"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || loading}>
              {creating ? 'Creating...' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
