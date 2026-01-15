import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline, ActivityForm } from '@/components/activity'
import { ArrowLeft, DollarSign, Building2, User, Calendar, TrendingUp } from 'lucide-react'

interface DealStage {
  id: string
  name: string
  probability: number
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
  expected_close_date: string | null
  closed_at: string | null
  won: boolean | null
  created_at: string
  updated_at: string
}

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [stages, setStages] = useState<DealStage[]>([])
  const [loading, setLoading] = useState(true)

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
          .select('*, deal_stages(*), accounts(id, name), contacts(id, first_name, last_name)')
          .eq('id', id)
          .single(),
        supabase.from('deal_stages').select('*').order('position'),
      ])

      if (dealResult.error) throw dealResult.error
      setDeal(dealResult.data)
      setStages(stagesResult.data || [])
    } catch (error) {
      console.error('Error fetching deal:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStage(newStageId: string) {
    if (!deal) return

    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', deal.id)

      if (error) throw error

      const newStage = stages.find(s => s.id === newStageId)
      setDeal(prev => prev ? { ...prev, stage_id: newStageId, deal_stages: newStage || null } : null)
    } catch (error) {
      console.error('Error updating stage:', error)
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
      <div className="flex items-center gap-4">
        <Link to="/deals">
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
              <CardTitle className="text-2xl">{deal.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deal.value && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold">{formatCurrency(deal.value)}</span>
                </div>
              )}

              {deal.deal_stages && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>{deal.deal_stages.name} ({deal.deal_stages.probability}% probability)</span>
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

              {deal.expected_close_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Expected close: {new Date(deal.expected_close_date).toLocaleDateString()}</span>
                </div>
              )}

              {deal.closed_at && (
                <div className={`mt-4 p-4 rounded-lg ${deal.won ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  <p className={`text-sm font-medium ${deal.won ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {deal.won ? 'Won' : 'Lost'} on {new Date(deal.closed_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                Created {new Date(deal.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

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
