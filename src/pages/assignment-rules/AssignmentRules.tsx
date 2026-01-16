import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { AssignmentRule, AssignmentRuleType } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, RefreshCw, Scale, Target, ChevronRight, Users, Trash2, Play } from 'lucide-react'
import { toast } from 'sonner'

interface AssignmentRuleWithDetails extends AssignmentRule {
  team?: { name: string } | null
  territory?: { name: string } | null
  member_count?: number
}

interface RuleMemberWithUser {
  id: string
  user_id: string
  weight: number
  max_assignments: number | null
  current_assignments: number
  skills: string[]
  last_assigned_at: string | null
  users: { id: string; full_name: string | null; email: string }
}

interface User {
  id: string
  full_name: string | null
  email: string
}

interface Team {
  id: string
  name: string
}

interface Territory {
  id: string
  name: string
}

const RULE_TYPES: { value: AssignmentRuleType; label: string; description: string; icon: typeof RefreshCw }[] = [
  {
    value: 'round_robin',
    label: 'Round Robin',
    description: 'Assigns to each member in sequence',
    icon: RefreshCw,
  },
  {
    value: 'load_balanced',
    label: 'Load Balanced',
    description: 'Assigns based on current workload',
    icon: Scale,
  },
  {
    value: 'skill_based',
    label: 'Skill Based',
    description: 'Matches skills to requirements',
    icon: Target,
  },
]

const ENTITY_TYPES = [
  { value: 'lead', label: 'Leads' },
  { value: 'account', label: 'Accounts' },
  { value: 'deal', label: 'Deals' },
  { value: 'contact', label: 'Contacts' },
]

export function AssignmentRulesPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const canManageRules = hasPermission('assignment_rules.create') || hasPermission('assignment_rules.update')
  const [rules, setRules] = useState<AssignmentRuleWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AssignmentRuleWithDetails | null>(null)
  const [ruleMembers, setRuleMembers] = useState<RuleMemberWithUser[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rule_type: 'round_robin' as AssignmentRuleType,
    entity_type: 'lead',
    team_id: '',
    territory_id: '',
    priority: 0,
  })
  const [newMember, setNewMember] = useState({
    user_id: '',
    weight: 1,
    max_assignments: '',
    skills: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchRules()
      fetchUsers()
      fetchTeams()
      fetchTerritories()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchRules() {
    try {
      const { data, error } = await supabase
        .from('assignment_rules')
        .select(`
          *,
          team:teams(name),
          territory:territories(name)
        `)
        .order('priority', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error

      // Get member counts
      const rulesWithCounts = await Promise.all(
        (data || []).map(async (rule) => {
          const { count } = await supabase
            .from('assignment_rule_members')
            .select('*', { count: 'exact', head: true })
            .eq('rule_id', rule.id)

          return { ...rule, member_count: count || 0 }
        })
      )

      setRules(rulesWithCounts)
    } catch (error) {
      console.error('Error fetching rules:', error)
      toast.error('Failed to load assignment rules')
    } finally {
      setLoading(false)
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

  async function fetchTerritories() {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setTerritories(data || [])
    } catch (error) {
      console.error('Error fetching territories:', error)
    }
  }

  async function fetchRuleMembers(ruleId: string) {
    try {
      const { data, error } = await supabase
        .from('assignment_rule_members')
        .select(`
          *,
          users:users!assignment_rule_members_user_id_fkey(id, full_name, email)
        `)
        .eq('rule_id', ruleId)
        .order('weight', { ascending: false })

      if (error) throw error
      setRuleMembers((data || []) as unknown as RuleMemberWithUser[])
    } catch (error) {
      console.error('Error fetching rule members:', error)
      toast.error('Failed to load rule members')
    }
  }

  async function createRule(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      const { error } = await supabase.from('assignment_rules').insert({
        tenant_id: user.tenantId,
        name: newRule.name,
        description: newRule.description || null,
        rule_type: newRule.rule_type,
        entity_type: newRule.entity_type,
        team_id: newRule.team_id || null,
        territory_id: newRule.territory_id || null,
        priority: newRule.priority,
      })

      if (error) throw error

      toast.success('Assignment rule created successfully')
      setShowCreate(false)
      setNewRule({
        name: '',
        description: '',
        rule_type: 'round_robin',
        entity_type: 'lead',
        team_id: '',
        territory_id: '',
        priority: 0,
      })
      fetchRules()
    } catch (error) {
      console.error('Error creating rule:', error)
      toast.error('Failed to create assignment rule')
    }
  }

  async function addMember() {
    if (!selectedRule || !newMember.user_id) return

    try {
      const { error } = await supabase.from('assignment_rule_members').insert({
        rule_id: selectedRule.id,
        user_id: newMember.user_id,
        weight: newMember.weight,
        max_assignments: newMember.max_assignments ? parseInt(newMember.max_assignments) : null,
        skills: newMember.skills ? newMember.skills.split(',').map((s) => s.trim()) : [],
      })

      if (error) throw error

      toast.success('Member added to rule')
      setNewMember({ user_id: '', weight: 1, max_assignments: '', skills: '' })
      fetchRuleMembers(selectedRule.id)
      fetchRules()
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error('Failed to add member')
    }
  }

  async function removeMember(memberId: string) {
    if (!selectedRule) return

    try {
      const { error } = await supabase
        .from('assignment_rule_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Member removed from rule')
      fetchRuleMembers(selectedRule.id)
      fetchRules()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  async function toggleRuleActive(ruleId: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('assignment_rules')
        .update({ is_active: !currentActive })
        .eq('id', ruleId)

      if (error) throw error

      toast.success(currentActive ? 'Rule deactivated' : 'Rule activated')
      fetchRules()
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast.error('Failed to update rule')
    }
  }

  async function resetAssignmentCounts(ruleId: string) {
    try {
      const { error } = await supabase
        .from('assignment_rule_members')
        .update({ current_assignments: 0, last_assigned_at: null })
        .eq('rule_id', ruleId)

      if (error) throw error

      toast.success('Assignment counts reset')
      fetchRuleMembers(ruleId)
    } catch (error) {
      console.error('Error resetting counts:', error)
      toast.error('Failed to reset counts')
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('assignment_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      toast.success('Rule deleted')
      setSelectedRule(null)
      fetchRules()
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error('Failed to delete rule')
    }
  }

  const filteredRules = rules.filter((rule) => {
    const searchLower = search.toLowerCase()
    return (
      rule.name.toLowerCase().includes(searchLower) ||
      rule.description?.toLowerCase().includes(searchLower) ||
      rule.entity_type.toLowerCase().includes(searchLower)
    )
  })

  const nonMemberUsers = users.filter((u) => !ruleMembers.some((m) => m.user_id === u.id))

  const getRuleTypeInfo = (type: AssignmentRuleType) =>
    RULE_TYPES.find((t) => t.value === type) || RULE_TYPES[0]

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
          <h1 className="text-2xl font-bold">Assignment Rules</h1>
          <p className="text-muted-foreground">{rules.length} total rules</p>
        </div>
        {canManageRules && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search rules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search ? 'No rules match your search' : 'No assignment rules yet. Create your first rule!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRules.map((rule) => {
            const typeInfo = getRuleTypeInfo(rule.rule_type)
            const Icon = typeInfo.icon

            return (
              <Card
                key={rule.id}
                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                  !rule.is_active ? 'opacity-60' : ''
                }`}
                onClick={() => {
                  setSelectedRule(rule)
                  fetchRuleMembers(rule.id)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <h3 className="font-medium">{rule.name}</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground mt-2">{rule.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {rule.member_count} members
                    </span>
                    <span className="capitalize">{rule.entity_type}s</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {typeInfo.label}
                    </span>
                    {!rule.is_active && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">Inactive</span>
                    )}
                    {rule.team?.name && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{rule.team.name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assignment Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={createRule} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="Rule name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Rule description"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Rule Type</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newRule.rule_type}
                onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value as AssignmentRuleType })}
              >
                {RULE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Entity Type</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newRule.entity_type}
                onChange={(e) => setNewRule({ ...newRule, entity_type: e.target.value })}
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Team (optional)</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newRule.team_id}
                onChange={(e) => setNewRule({ ...newRule, team_id: e.target.value })}
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Territory (optional)</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newRule.territory_id}
                onChange={(e) => setNewRule({ ...newRule, territory_id: e.target.value })}
              >
                <option value="">All territories</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Input
                type="number"
                placeholder="0"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Higher priority rules are checked first</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rule Detail Dialog */}
      <Dialog open={!!selectedRule} onOpenChange={(open) => !open && setSelectedRule(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRule && (() => {
                const Icon = getRuleTypeInfo(selectedRule.rule_type).icon
                return <Icon className="w-5 h-5" />
              })()}
              {selectedRule?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedRule && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Rule Type:</span>
                  <span className="ml-2">{getRuleTypeInfo(selectedRule.rule_type).label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity Type:</span>
                  <span className="ml-2 capitalize">{selectedRule.entity_type}s</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2">{selectedRule.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="ml-2">{selectedRule.priority}</span>
                </div>
                {selectedRule.team?.name && (
                  <div>
                    <span className="text-muted-foreground">Team:</span>
                    <span className="ml-2">{selectedRule.team.name}</span>
                  </div>
                )}
                {selectedRule.territory?.name && (
                  <div>
                    <span className="text-muted-foreground">Territory:</span>
                    <span className="ml-2">{selectedRule.territory.name}</span>
                  </div>
                )}
                {selectedRule.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="ml-2">{selectedRule.description}</span>
                  </div>
                )}
              </div>

              {canManageRules && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleRuleActive(selectedRule.id, selectedRule.is_active)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {selectedRule.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetAssignmentCounts(selectedRule.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Counts
                  </Button>
                </div>
              )}

              {/* Rule Members Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Rule Members ({ruleMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ruleMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members in this rule</p>
                  ) : (
                    <div className="space-y-2">
                      {ruleMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium text-sm">
                              {member.users?.full_name || member.users?.email}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                              <span>Weight: {member.weight}</span>
                              <span>
                                Assignments: {member.current_assignments}
                                {member.max_assignments && ` / ${member.max_assignments}`}
                              </span>
                              {member.skills.length > 0 && (
                                <span>Skills: {member.skills.join(', ')}</span>
                              )}
                            </div>
                          </div>
                          {canManageRules && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(member.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canManageRules && nonMemberUsers.length > 0 && (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium">Add Member</p>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="px-3 py-2 text-sm border rounded-md bg-background"
                          value={newMember.user_id}
                          onChange={(e) => setNewMember({ ...newMember, user_id: e.target.value })}
                        >
                          <option value="">Select user...</option>
                          {nonMemberUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          placeholder="Weight (default: 1)"
                          value={newMember.weight}
                          onChange={(e) => setNewMember({ ...newMember, weight: parseInt(e.target.value) || 1 })}
                        />
                        <Input
                          type="number"
                          placeholder="Max assignments (optional)"
                          value={newMember.max_assignments}
                          onChange={(e) => setNewMember({ ...newMember, max_assignments: e.target.value })}
                        />
                        <Input
                          placeholder="Skills (comma separated)"
                          value={newMember.skills}
                          onChange={(e) => setNewMember({ ...newMember, skills: e.target.value })}
                        />
                      </div>
                      <Button type="button" size="sm" onClick={addMember} disabled={!newMember.user_id}>
                        Add Member
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {canManageRules && (
                <DialogFooter>
                  <Button variant="destructive" onClick={() => deleteRule(selectedRule.id)}>
                    Delete Rule
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
