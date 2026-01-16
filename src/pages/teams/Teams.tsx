import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Team, TeamLevel } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Users, ChevronRight, Crown, Building2, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface TeamWithDetails extends Team {
  manager?: { full_name: string | null } | null
  parent_team?: { name: string } | null
  member_count?: number
}

interface TeamMemberWithUser {
  id: string
  user_id: string
  is_lead: boolean
  users: { id: string; full_name: string | null; email: string; role: string }
}

interface User {
  id: string
  full_name: string | null
  email: string
  role: string
}

const TEAM_LEVELS: { value: TeamLevel; label: string; icon: typeof Building2 }[] = [
  { value: 'organization', label: 'Organization', icon: Building2 },
  { value: 'region', label: 'Region', icon: MapPin },
  { value: 'team', label: 'Team', icon: Users },
]

export function TeamsPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const canManageTeams = hasPermission('teams.create') || hasPermission('teams.update')
  const [teams, setTeams] = useState<TeamWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamWithDetails | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithUser[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    level: 'team' as TeamLevel,
    parent_team_id: '',
    manager_id: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchTeams()
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchTeams() {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          manager:users!teams_manager_id_fkey(full_name),
          parent_team:teams!teams_parent_team_id_fkey(name)
        `)
        .order('level', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      // Get member counts
      const teamsWithCounts = await Promise.all(
        (data || []).map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          return { ...team, member_count: count || 0 }
        })
      )

      setTeams(teamsWithCounts)
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true })

      if (error) throw error
      setAvailableUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  async function fetchTeamMembers(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          is_lead,
          users:users!team_members_user_id_fkey(id, full_name, email, role)
        `)
        .eq('team_id', teamId)

      if (error) throw error
      setTeamMembers((data || []) as unknown as TeamMemberWithUser[])
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to load team members')
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      const { error } = await supabase.from('teams').insert({
        tenant_id: user.tenantId,
        name: newTeam.name,
        description: newTeam.description || null,
        level: newTeam.level,
        parent_team_id: newTeam.parent_team_id || null,
        manager_id: newTeam.manager_id || null,
      })

      if (error) throw error

      toast.success('Team created successfully')
      setShowCreate(false)
      setNewTeam({ name: '', description: '', level: 'team', parent_team_id: '', manager_id: '' })
      fetchTeams()
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error('Failed to create team')
    }
  }

  async function addMember(userId: string) {
    if (!selectedTeam) return

    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: selectedTeam.id,
        user_id: userId,
      })

      if (error) throw error

      toast.success('Member added to team')
      fetchTeamMembers(selectedTeam.id)
      fetchTeams()
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error('Failed to add member')
    }
  }

  async function removeMember(memberId: string) {
    if (!selectedTeam) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Member removed from team')
      fetchTeamMembers(selectedTeam.id)
      fetchTeams()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  async function toggleLead(memberId: string, currentIsLead: boolean) {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_lead: !currentIsLead })
        .eq('id', memberId)

      if (error) throw error

      toast.success(currentIsLead ? 'Lead status removed' : 'Set as team lead')
      if (selectedTeam) fetchTeamMembers(selectedTeam.id)
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast.error('Failed to update lead status')
    }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      toast.success('Team deleted')
      setSelectedTeam(null)
      fetchTeams()
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Failed to delete team')
    }
  }

  const filteredTeams = teams.filter((team) => {
    const searchLower = search.toLowerCase()
    return (
      team.name.toLowerCase().includes(searchLower) ||
      team.description?.toLowerCase().includes(searchLower) ||
      team.level.toLowerCase().includes(searchLower)
    )
  })

  const groupedTeams = TEAM_LEVELS.map((level) => ({
    ...level,
    teams: filteredTeams.filter((t) => t.level === level.value),
  }))

  const parentTeamOptions = teams.filter(
    (t) => t.level === 'organization' || t.level === 'region'
  )

  const nonMemberUsers = availableUsers.filter(
    (u) => !teamMembers.some((m) => m.user_id === u.id)
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
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground">{teams.length} total teams</p>
        </div>
        {canManageTeams && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {groupedTeams.map((group) => {
            const Icon = group.icon
            if (group.teams.length === 0) return null

            return (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">{group.label}s</h2>
                  <span className="text-sm text-muted-foreground">({group.teams.length})</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.teams.map((team) => (
                    <Card
                      key={team.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTeam(team)
                        fetchTeamMembers(team.id)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{team.name}</h3>
                            {team.description && (
                              <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {team.member_count} members
                          </span>
                          {team.manager?.full_name && (
                            <span className="flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              {team.manager.full_name}
                            </span>
                          )}
                        </div>
                        {team.parent_team?.name && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Part of: {team.parent_team.name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {search ? 'No teams match your search' : 'No teams yet. Create your first team!'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Team Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={createTeam} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="Team name"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Team description"
                value={newTeam.description}
                onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Level</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newTeam.level}
                onChange={(e) => setNewTeam({ ...newTeam, level: e.target.value as TeamLevel })}
              >
                {TEAM_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            {newTeam.level !== 'organization' && parentTeamOptions.length > 0 && (
              <div>
                <label className="text-sm font-medium">Parent Team</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  value={newTeam.parent_team_id}
                  onChange={(e) => setNewTeam({ ...newTeam, parent_team_id: e.target.value })}
                >
                  <option value="">None</option>
                  {parentTeamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Manager</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                value={newTeam.manager_id}
                onChange={(e) => setNewTeam({ ...newTeam, manager_id: e.target.value })}
              >
                <option value="">Select manager</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Team</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Detail Dialog */}
      <Dialog open={!!selectedTeam} onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedTeam?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedTeam && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Level:</span>
                  <span className="ml-2 capitalize">{selectedTeam.level}</span>
                </div>
                {selectedTeam.manager?.full_name && (
                  <div>
                    <span className="text-muted-foreground">Manager:</span>
                    <span className="ml-2">{selectedTeam.manager.full_name}</span>
                  </div>
                )}
                {selectedTeam.parent_team?.name && (
                  <div>
                    <span className="text-muted-foreground">Parent:</span>
                    <span className="ml-2">{selectedTeam.parent_team.name}</span>
                  </div>
                )}
                {selectedTeam.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="ml-2">{selectedTeam.description}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Team Members ({teamMembers.length})</h3>
                  {canManageTeams && nonMemberUsers.length > 0 && (
                    <select
                      className="px-3 py-1 text-sm border rounded-md bg-background"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) addMember(e.target.value)
                      }}
                    >
                      <option value="">Add member...</option>
                      {nonMemberUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No members in this team yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {member.is_lead ? (
                              <Crown className="w-4 h-4 text-primary" />
                            ) : (
                              <Users className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {member.users?.full_name || member.users?.email}
                              {member.is_lead && (
                                <span className="ml-2 text-xs text-primary">(Lead)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {member.users?.role}
                            </p>
                          </div>
                        </div>
                        {canManageTeams && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLead(member.id, member.is_lead)}
                            >
                              {member.is_lead ? 'Remove Lead' : 'Make Lead'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeMember(member.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canManageTeams && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => deleteTeam(selectedTeam.id)}
                  >
                    Delete Team
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
