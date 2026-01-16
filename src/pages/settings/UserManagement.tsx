import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, type UserRole } from '@/lib/hooks/useAuth'
import { usePermissions, ROLES, getRoleInfo } from '@/lib/hooks/usePermissions'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Search, Shield, UserCog, ChevronDown, X } from 'lucide-react'

interface TenantUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  team_id: string | null
  created_at: string
  updated_at: string
}

interface Team {
  id: string
  name: string
}

export function UserManagementPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Check if user has permission to manage users
  const canManageUsers = hasPermission('users.update') || hasPermission('users.assign_role')
  const canViewUsers = hasPermission('users.view')

  useEffect(() => {
    if (user?.tenantId && canViewUsers) {
      fetchUsers()
      fetchTeams()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId, canViewUsers])

  // Redirect if no access
  if (!canViewUsers && !user?.isSuperAdmin) {
    return <Navigate to="/settings" replace />
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', user?.tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchTeams() {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('tenant_id', user?.tenantId)
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  async function updateUserRole(userId: string, newRole: UserRole) {
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setEditingUser(null)
      setMessage({ type: 'success', text: 'User role updated successfully' })
    } catch (error) {
      console.error('Error updating user role:', error)
      setMessage({ type: 'error', text: 'Failed to update user role' })
    } finally {
      setSaving(false)
    }
  }

  async function updateUserTeam(userId: string, teamId: string | null) {
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({ team_id: teamId })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u => u.id === userId ? { ...u, team_id: teamId } : u))
      setMessage({ type: 'success', text: 'User team updated successfully' })
    } catch (error) {
      console.error('Error updating user team:', error)
      setMessage({ type: 'error', text: 'Failed to update user team' })
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-600 dark:text-red-400'
      case 'sales_manager':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      case 'ae':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      case 'am':
        return 'bg-green-500/10 text-green-600 dark:text-green-400'
      case 'sdr':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCog className="w-6 h-6" />
          User Management
        </h1>
        <p className="text-muted-foreground">Manage user roles and team assignments</p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md border text-sm ${
            message.type === 'success'
              ? 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Role Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5" />
            Role Permissions
          </CardTitle>
          <CardDescription>Overview of role capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map(role => (
              <div
                key={role.id}
                className={`p-3 rounded-lg border ${getRoleBadgeColor(role.id)} border-current/20`}
              >
                <p className="font-medium">{role.label}</p>
                <p className="text-xs opacity-80 mt-1">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? 'No users found matching your search' : 'No users in your organization'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(u => (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.full_name || 'Unnamed User'}</p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    {u.id === user?.id && (
                      <span className="text-xs text-primary">(You)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Team Badge */}
                    {canManageUsers ? (
                      <select
                        className="h-8 px-2 text-xs rounded-md border border-input bg-background"
                        value={u.team_id || ''}
                        onChange={(e) => updateUserTeam(u.id, e.target.value || null)}
                        disabled={saving}
                      >
                        <option value="">No Team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    ) : u.team_id ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {teams.find(t => t.id === u.team_id)?.name || 'Team'}
                      </span>
                    ) : null}

                    {/* Role Badge / Selector */}
                    {editingUser === u.id && canManageUsers ? (
                      <div className="flex items-center gap-1">
                        <select
                          className="h-8 px-2 text-xs rounded-md border border-input bg-background"
                          value={u.role}
                          onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                          disabled={saving}
                        >
                          {ROLES.map(role => (
                            <option key={role.id} value={role.id}>{role.label}</option>
                          ))}
                        </select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingUser(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => canManageUsers && setEditingUser(u.id)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${getRoleBadgeColor(u.role)} ${canManageUsers ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        disabled={!canManageUsers}
                      >
                        {getRoleInfo(u.role)?.label || u.role}
                        {canManageUsers && <ChevronDown className="w-3 h-3 inline ml-1" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
