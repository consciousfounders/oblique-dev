import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Territory, TerritoryCriteriaType } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, MapPin, Building2, ChevronRight, Filter, Users, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface TerritoryWithDetails extends Territory {
  team?: { name: string } | null
  owner?: { full_name: string | null } | null
  account_count?: number
  lead_count?: number
}

interface TerritoryCriteriaRow {
  id: string
  criteria_type: TerritoryCriteriaType
  field_name: string
  operator: string
  field_value: string
}

interface TerritoryAccountRow {
  id: string
  account_id: string
  accounts: { id: string; name: string }
}

interface Team {
  id: string
  name: string
}

interface User {
  id: string
  full_name: string | null
  email: string
}

interface Account {
  id: string
  name: string
}

const CRITERIA_TYPES: { value: TerritoryCriteriaType; label: string }[] = [
  { value: 'geographic', label: 'Geographic' },
  { value: 'industry', label: 'Industry' },
  { value: 'company_size', label: 'Company Size' },
  { value: 'named_accounts', label: 'Named Accounts' },
]

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
]

const FIELD_OPTIONS: Record<TerritoryCriteriaType, { value: string; label: string }[]> = {
  geographic: [
    { value: 'country', label: 'Country' },
    { value: 'state', label: 'State/Province' },
    { value: 'city', label: 'City' },
    { value: 'zip', label: 'Zip/Postal Code' },
  ],
  industry: [
    { value: 'industry', label: 'Industry' },
  ],
  company_size: [
    { value: 'employee_count', label: 'Employee Count' },
    { value: 'annual_revenue', label: 'Annual Revenue' },
  ],
  named_accounts: [],
}

export function TerritoriesPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const canManageTerritories = hasPermission('territories.create') || hasPermission('territories.update')
  const [territories, setTerritories] = useState<TerritoryWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryWithDetails | null>(null)
  const [criteria, setCriteria] = useState<TerritoryCriteriaRow[]>([])
  const [namedAccounts, setNamedAccounts] = useState<TerritoryAccountRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [allAccounts, setAllAccounts] = useState<Account[]>([])
  const [newTerritory, setNewTerritory] = useState({
    name: '',
    description: '',
    team_id: '',
    owner_id: '',
    auto_assign: false,
    priority: 0,
  })
  const [newCriteria, setNewCriteria] = useState({
    criteria_type: 'industry' as TerritoryCriteriaType,
    field_name: 'industry',
    operator: 'equals',
    field_value: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchTerritories()
      fetchTeams()
      fetchUsers()
      fetchAccounts()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchTerritories() {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select(`
          *,
          team:teams(name),
          owner:users!territories_owner_id_fkey(full_name)
        `)
        .order('priority', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      // Get counts
      const territoriesWithCounts = await Promise.all(
        (data || []).map(async (territory) => {
          const [accountResult, leadResult] = await Promise.all([
            supabase
              .from('accounts')
              .select('*', { count: 'exact', head: true })
              .eq('territory_id', territory.id),
            supabase
              .from('leads')
              .select('*', { count: 'exact', head: true })
              .eq('territory_id', territory.id),
          ])

          return {
            ...territory,
            account_count: accountResult.count || 0,
            lead_count: leadResult.count || 0,
          }
        })
      )

      setTerritories(territoriesWithCounts)
    } catch (error) {
      console.error('Error fetching territories:', error)
      toast.error('Failed to load territories')
    } finally {
      setLoading(false)
    }
  }

  async function fetchTeams() {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name')

      if (error) throw error
      setAllAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  async function fetchTerritoryCriteria(territoryId: string) {
    try {
      const { data, error } = await supabase
        .from('territory_criteria')
        .select('*')
        .eq('territory_id', territoryId)

      if (error) throw error
      setCriteria(data || [])
    } catch (error) {
      console.error('Error fetching criteria:', error)
    }
  }

  async function fetchTerritoryAccounts(territoryId: string) {
    try {
      const { data, error } = await supabase
        .from('territory_accounts')
        .select(`
          id,
          account_id,
          accounts(id, name)
        `)
        .eq('territory_id', territoryId)

      if (error) throw error
      setNamedAccounts((data || []) as unknown as TerritoryAccountRow[])
    } catch (error) {
      console.error('Error fetching named accounts:', error)
    }
  }

  async function createTerritory(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      const { error } = await supabase.from('territories').insert({
        tenant_id: user.tenantId,
        name: newTerritory.name,
        description: newTerritory.description || null,
        team_id: newTerritory.team_id || null,
        owner_id: newTerritory.owner_id || null,
        auto_assign: newTerritory.auto_assign,
        priority: newTerritory.priority,
      })

      if (error) throw error

      toast.success('Territory created successfully')
      setShowCreate(false)
      setNewTerritory({
        name: '',
        description: '',
        team_id: '',
        owner_id: '',
        auto_assign: false,
        priority: 0,
      })
      fetchTerritories()
    } catch (error) {
      console.error('Error creating territory:', error)
      toast.error('Failed to create territory')
    }
  }

  async function addCriteria() {
    if (!selectedTerritory || !newCriteria.field_value) return

    try {
      const { error } = await supabase.from('territory_criteria').insert({
        territory_id: selectedTerritory.id,
        criteria_type: newCriteria.criteria_type,
        field_name: newCriteria.field_name,
        operator: newCriteria.operator,
        field_value: newCriteria.field_value,
      })

      if (error) throw error

      toast.success('Criteria added')
      setNewCriteria({
        criteria_type: 'industry',
        field_name: 'industry',
        operator: 'equals',
        field_value: '',
      })
      fetchTerritoryCriteria(selectedTerritory.id)
    } catch (error) {
      console.error('Error adding criteria:', error)
      toast.error('Failed to add criteria')
    }
  }

  async function removeCriteria(criteriaId: string) {
    if (!selectedTerritory) return

    try {
      const { error } = await supabase
        .from('territory_criteria')
        .delete()
        .eq('id', criteriaId)

      if (error) throw error

      toast.success('Criteria removed')
      fetchTerritoryCriteria(selectedTerritory.id)
    } catch (error) {
      console.error('Error removing criteria:', error)
      toast.error('Failed to remove criteria')
    }
  }

  async function addNamedAccount(accountId: string) {
    if (!selectedTerritory) return

    try {
      const { error } = await supabase.from('territory_accounts').insert({
        territory_id: selectedTerritory.id,
        account_id: accountId,
      })

      if (error) throw error

      toast.success('Account added to territory')
      fetchTerritoryAccounts(selectedTerritory.id)
    } catch (error) {
      console.error('Error adding account:', error)
      toast.error('Failed to add account')
    }
  }

  async function removeNamedAccount(territoryAccountId: string) {
    if (!selectedTerritory) return

    try {
      const { error } = await supabase
        .from('territory_accounts')
        .delete()
        .eq('id', territoryAccountId)

      if (error) throw error

      toast.success('Account removed from territory')
      fetchTerritoryAccounts(selectedTerritory.id)
    } catch (error) {
      console.error('Error removing account:', error)
      toast.error('Failed to remove account')
    }
  }

  async function deleteTerritory(territoryId: string) {
    if (!confirm('Are you sure you want to delete this territory? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('territories')
        .delete()
        .eq('id', territoryId)

      if (error) throw error

      toast.success('Territory deleted')
      setSelectedTerritory(null)
      fetchTerritories()
    } catch (error) {
      console.error('Error deleting territory:', error)
      toast.error('Failed to delete territory')
    }
  }

  const filteredTerritories = territories.filter((territory) => {
    const searchLower = search.toLowerCase()
    return (
      territory.name.toLowerCase().includes(searchLower) ||
      territory.description?.toLowerCase().includes(searchLower)
    )
  })

  const availableAccountsForTerritory = allAccounts.filter(
    (a) => !namedAccounts.some((na) => na.account_id === a.id)
  )

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
          <h1 className="text-2xl font-bold">Territories</h1>
          <p className="text-muted-foreground">{territories.length} total territories</p>
        </div>
        {canManageTerritories && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Territory
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search territories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredTerritories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search ? 'No territories match your search' : 'No territories yet. Create your first territory!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTerritories.map((territory) => (
            <Card
              key={territory.id}
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedTerritory(territory)
                fetchTerritoryCriteria(territory.id)
                fetchTerritoryAccounts(territory.id)
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">{territory.name}</h3>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                {territory.description && (
                  <p className="text-sm text-muted-foreground mt-2">{territory.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {territory.account_count} accounts
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {territory.lead_count} leads
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {territory.auto_assign && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Auto-assign
                    </span>
                  )}
                  {territory.team?.name && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {territory.team.name}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Territory Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Territory</DialogTitle>
          </DialogHeader>
          <form onSubmit={createTerritory} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="Territory name"
                value={newTerritory.name}
                onChange={(e) => setNewTerritory({ ...newTerritory, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Territory description"
                value={newTerritory.description}
                onChange={(e) => setNewTerritory({ ...newTerritory, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Team</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newTerritory.team_id}
                onChange={(e) => setNewTerritory({ ...newTerritory, team_id: e.target.value })}
              >
                <option value="">None</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newTerritory.owner_id}
                onChange={(e) => setNewTerritory({ ...newTerritory, owner_id: e.target.value })}
              >
                <option value="">None</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Input
                type="number"
                placeholder="0"
                value={newTerritory.priority}
                onChange={(e) => setNewTerritory({ ...newTerritory, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Higher priority territories are checked first</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_assign"
                checked={newTerritory.auto_assign}
                onChange={(e) => setNewTerritory({ ...newTerritory, auto_assign: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="auto_assign" className="text-sm">
                Auto-assign new leads/accounts to this territory
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Territory</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Territory Detail Dialog */}
      <Dialog open={!!selectedTerritory} onOpenChange={(open) => !open && setSelectedTerritory(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {selectedTerritory?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedTerritory && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedTerritory.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="ml-2">{selectedTerritory.description}</span>
                  </div>
                )}
                {selectedTerritory.team?.name && (
                  <div>
                    <span className="text-muted-foreground">Team:</span>
                    <span className="ml-2">{selectedTerritory.team.name}</span>
                  </div>
                )}
                {selectedTerritory.owner?.full_name && (
                  <div>
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="ml-2">{selectedTerritory.owner.full_name}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Auto-assign:</span>
                  <span className="ml-2">{selectedTerritory.auto_assign ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="ml-2">{selectedTerritory.priority}</span>
                </div>
              </div>

              {/* Criteria Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Matching Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {criteria.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No criteria defined</p>
                  ) : (
                    <div className="space-y-2">
                      {criteria.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm">
                            <span className="capitalize">{c.criteria_type}</span>: {c.field_name}{' '}
                            <span className="text-muted-foreground">{c.operator}</span> "{c.field_value}"
                          </span>
                          {canManageTerritories && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCriteria(c.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canManageTerritories && (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium">Add Criteria</p>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="px-3 py-2 text-sm border rounded-md bg-background"
                          value={newCriteria.criteria_type}
                          onChange={(e) => {
                            const type = e.target.value as TerritoryCriteriaType
                            const fields = FIELD_OPTIONS[type]
                            setNewCriteria({
                              ...newCriteria,
                              criteria_type: type,
                              field_name: fields[0]?.value || '',
                            })
                          }}
                        >
                          {CRITERIA_TYPES.filter((t) => t.value !== 'named_accounts').map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="px-3 py-2 text-sm border rounded-md bg-background"
                          value={newCriteria.field_name}
                          onChange={(e) => setNewCriteria({ ...newCriteria, field_name: e.target.value })}
                        >
                          {FIELD_OPTIONS[newCriteria.criteria_type].map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="px-3 py-2 text-sm border rounded-md bg-background"
                          value={newCriteria.operator}
                          onChange={(e) => setNewCriteria({ ...newCriteria, operator: e.target.value })}
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Value"
                            value={newCriteria.field_value}
                            onChange={(e) => setNewCriteria({ ...newCriteria, field_value: e.target.value })}
                            className="flex-1"
                          />
                          <Button type="button" size="sm" onClick={addCriteria}>
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Named Accounts Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Named Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {namedAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No named accounts</p>
                  ) : (
                    <div className="space-y-2">
                      {namedAccounts.map((na) => (
                        <div key={na.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm">{na.accounts?.name}</span>
                          {canManageTerritories && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNamedAccount(na.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canManageTerritories && availableAccountsForTerritory.length > 0 && (
                    <div className="border-t pt-4">
                      <select
                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) addNamedAccount(e.target.value)
                        }}
                      >
                        <option value="">Add named account...</option>
                        {availableAccountsForTerritory.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {canManageTerritories && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => deleteTerritory(selectedTerritory.id)}
                  >
                    Delete Territory
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
