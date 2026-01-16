import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Campaign, CampaignType, CampaignStatus } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Plus,
  Search,
  Megaphone,
  Users,
  DollarSign,
  TrendingUp,
  MoreVertical,
  Copy,
  Trash2,
  Pause,
  Play,
  Calendar,
  Target,
  BarChart3,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface CampaignWithMetrics extends Campaign {
  owner?: { full_name: string | null } | null
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

export function CampaignsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'email' as CampaignType,
    budget: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchCampaigns()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchCampaigns() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, owner:users!campaigns_owner_id_fkey(full_name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          tenant_id: user.tenantId,
          name: newCampaign.name,
          description: newCampaign.description || null,
          campaign_type: newCampaign.campaign_type,
          budget: newCampaign.budget ? parseFloat(newCampaign.budget) : null,
          start_date: newCampaign.start_date || null,
          end_date: newCampaign.end_date || null,
          owner_id: user.id,
          status: 'planned',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Campaign created successfully')
      setShowCreate(false)
      setNewCampaign({
        name: '',
        description: '',
        campaign_type: 'email',
        budget: '',
        start_date: '',
        end_date: '',
      })
      fetchCampaigns()
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create campaign')
    }
  }

  async function updateCampaignStatus(campaignId: string, status: CampaignStatus) {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaignId)

      if (error) throw error

      setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, status } : c))
      toast.success(`Campaign ${status === 'active' ? 'activated' : status === 'paused' ? 'paused' : 'updated'}`)
    } catch (error) {
      console.error('Error updating campaign status:', error)
      toast.error('Failed to update campaign status')
    }
  }

  async function duplicateCampaign(campaign: CampaignWithMetrics) {
    if (!user?.tenantId) return

    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          tenant_id: user.tenantId,
          name: `${campaign.name} (Copy)`,
          description: campaign.description,
          campaign_type: campaign.campaign_type,
          status: 'planned',
          budget: campaign.budget,
          expected_response_rate: campaign.expected_response_rate,
          expected_revenue: campaign.expected_revenue,
          utm_source: campaign.utm_source,
          utm_medium: campaign.utm_medium,
          utm_campaign: campaign.utm_campaign,
          utm_term: campaign.utm_term,
          utm_content: campaign.utm_content,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Campaign duplicated successfully')
      fetchCampaigns()
    } catch (error) {
      console.error('Error duplicating campaign:', error)
      toast.error('Failed to duplicate campaign')
    }
  }

  async function deleteCampaign(campaignId: string) {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)

      if (error) throw error

      setCampaigns(campaigns.filter(c => c.id !== campaignId))
      toast.success('Campaign deleted successfully')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Failed to delete campaign')
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchLower) ||
      campaign.description?.toLowerCase().includes(searchLower)
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    const matchesType = typeFilter === 'all' || campaign.campaign_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const statusColors: Record<CampaignStatus, string> = {
    planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
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

  function formatDate(date: string | null): string {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function calculateROI(campaign: Campaign): string {
    if (!campaign.actual_cost || campaign.actual_cost === 0) return '-'
    if (!campaign.total_revenue) return '-'
    const roi = ((campaign.total_revenue - campaign.actual_cost) / campaign.actual_cost) * 100
    return `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`
  }

  function calculateConversionRate(campaign: Campaign): string {
    const totalMembers = campaign.total_leads + campaign.total_contacts
    if (totalMembers === 0) return '0%'
    return `${((campaign.total_converted / totalMembers) * 100).toFixed(1)}%`
  }

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Track marketing campaigns and measure ROI</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Types</option>
          {CAMPAIGN_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
            <CardDescription>
              Set up a marketing campaign to track leads and measure effectiveness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createCampaign} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="Campaign name *"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                />
                <select
                  value={newCampaign.campaign_type}
                  onChange={(e) => setNewCampaign({ ...newCampaign, campaign_type: e.target.value as CampaignType })}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CAMPAIGN_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="Description (optional)"
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-muted-foreground">Budget</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCampaign.budget}
                    onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={newCampaign.start_date}
                    onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">End Date</label>
                  <Input
                    type="date"
                    value={newCampaign.end_date}
                    onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Campaign</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No campaigns match your filters'
              : 'No campaigns yet. Create your first campaign!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link to={`/campaigns/${campaign.id}`} className="hover:underline">
                        <h3 className="text-lg font-semibold truncate">{campaign.name}</h3>
                      </Link>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                        {campaign.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {CAMPAIGN_TYPES.find(t => t.value === campaign.campaign_type)?.label}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                        {campaign.description}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Timeline
                        </span>
                        <span className="font-medium">
                          {campaign.start_date
                            ? `${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`
                            : 'Not set'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Budget
                        </span>
                        <span className="font-medium">{formatCurrency(campaign.budget)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Leads
                        </span>
                        <span className="font-medium">{campaign.total_leads}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Converted
                        </span>
                        <span className="font-medium">{campaign.total_converted}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          Conv. Rate
                        </span>
                        <span className="font-medium">{calculateConversionRate(campaign)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          ROI
                        </span>
                        <span className={`font-medium ${
                          campaign.total_revenue && campaign.actual_cost &&
                          campaign.total_revenue > campaign.actual_cost
                            ? 'text-green-600 dark:text-green-400'
                            : ''
                        }`}>
                          {calculateROI(campaign)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                        <Megaphone className="mr-2 h-4 w-4" />
                        View Campaign
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(campaign.status === 'planned' || campaign.status === 'paused') && (
                        <DropdownMenuItem onClick={() => updateCampaignStatus(campaign.id, 'active')}>
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      {campaign.status === 'active' && (
                        <>
                          <DropdownMenuItem onClick={() => updateCampaignStatus(campaign.id, 'paused')}>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateCampaignStatus(campaign.id, 'completed')}>
                            <Target className="mr-2 h-4 w-4" />
                            Mark Complete
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => duplicateCampaign(campaign)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteCampaign(campaign.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
