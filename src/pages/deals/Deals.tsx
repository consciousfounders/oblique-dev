import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, DollarSign, Building2 } from 'lucide-react'

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
  expected_close_date: string | null
  created_at: string
}

export function DealsPage() {
  const { user } = useAuth()
  const [stages, setStages] = useState<DealStage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newDeal, setNewDeal] = useState({
    name: '',
    value: '',
    stage_id: '',
  })

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
        supabase.from('deals').select('*, accounts(name)').order('created_at', { ascending: false }),
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
    } finally {
      setLoading(false)
    }
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId || !newDeal.stage_id) return

    try {
      const { error } = await supabase.from('deals').insert({
        tenant_id: user.tenantId,
        name: newDeal.name,
        value: newDeal.value ? parseFloat(newDeal.value) : null,
        stage_id: newDeal.stage_id,
        owner_id: user.id,
      })

      if (error) throw error

      setShowCreate(false)
      setNewDeal({ name: '', value: '', stage_id: stages[0]?.id || '' })
      fetchData()
    } catch (error) {
      console.error('Error creating deal:', error)
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
    } catch (error) {
      console.error('Error moving deal:', error)
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
    return deals
      .filter(d => d.stage_id === stageId)
      .reduce((sum, d) => sum + (d.value || 0), 0)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            {deals.length} deals worth {formatCurrency(deals.reduce((sum, d) => sum + (d.value || 0), 0))}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Deal
        </Button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createDeal} className="space-y-4">
              <Input
                placeholder="Deal name *"
                value={newDeal.name}
                onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                required
              />
              <Input
                type="number"
                placeholder="Value"
                value={newDeal.value}
                onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
              />
              <select
                value={newDeal.stage_id}
                onChange={(e) => setNewDeal({ ...newDeal, stage_id: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button type="submit">Create Deal</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
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
              const stageDeals = deals.filter(d => d.stage_id === stage.id)
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
                      <h3 className="font-medium text-sm">{stage.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {stageDeals.length} - {formatCurrency(stageValue)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {stageDeals.map(deal => (
                        <Card
                          key={deal.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('dealId', deal.id)
                          }}
                          className="cursor-grab active:cursor-grabbing hover:bg-card/80"
                        >
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm">{deal.name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
                            </div>
                          </CardContent>
                        </Card>
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
    </div>
  )
}
