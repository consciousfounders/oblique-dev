import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Building2, Users, Trash2 } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  created_at: string
  user_count?: number
}

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  tenant_id: string
}

export function SuperAdminPage() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTenant, setShowCreateTenant] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [newTenant, setNewTenant] = useState({ name: '', slug: '' })
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'sdr', tenant_id: '' })

  useEffect(() => {
    if (user?.isSuperAdmin) {
      fetchTenants()
    }
  }, [user?.isSuperAdmin])

  useEffect(() => {
    if (selectedTenant) {
      fetchUsers(selectedTenant)
    }
  }, [selectedTenant])

  if (!user?.isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  async function fetchTenants() {
    try {
      // Note: This would need service role access in production
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenants(data || [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers(tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  async function createTenant(e: React.FormEvent) {
    e.preventDefault()

    try {
      const { error } = await supabase.from('tenants').insert({
        name: newTenant.name,
        slug: newTenant.slug.toLowerCase().replace(/\s+/g, '-'),
      })

      if (error) throw error

      setShowCreateTenant(false)
      setNewTenant({ name: '', slug: '' })
      fetchTenants()
    } catch (error) {
      console.error('Error creating tenant:', error)
    }
  }

  async function deleteTenant(id: string) {
    if (!confirm('Are you sure? This will delete all data for this tenant.')) return

    try {
      const { error } = await supabase.from('tenants').delete().eq('id', id)
      if (error) throw error
      fetchTenants()
      if (selectedTenant === id) {
        setSelectedTenant(null)
        setUsers([])
      }
    } catch (error) {
      console.error('Error deleting tenant:', error)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTenant) return

    try {
      // Note: In production, you'd invite users via Supabase auth
      // This creates a user record that will be linked when they sign up
      const { error } = await supabase.from('users').insert({
        id: crypto.randomUUID(), // Temporary ID until user signs up
        email: newUser.email,
        full_name: newUser.full_name || null,
        role: newUser.role,
        tenant_id: selectedTenant,
      })

      if (error) throw error

      setShowCreateUser(false)
      setNewUser({ email: '', full_name: '', role: 'sdr', tenant_id: '' })
      fetchUsers(selectedTenant)
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground">Manage tenants and users</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Tenants
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreateTenant(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            {showCreateTenant && (
              <form onSubmit={createTenant} className="space-y-3 mb-4 p-3 bg-muted/50 rounded-lg">
                <Input
                  placeholder="Tenant name *"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  required
                />
                <Input
                  placeholder="Slug (e.g., acme-corp) *"
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Create</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowCreateTenant(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tenants yet
              </p>
            ) : (
              <div className="space-y-2">
                {tenants.map(tenant => (
                  <div
                    key={tenant.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTenant === tenant.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTenant(tenant.id)}
                  >
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTenant(tenant.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users
              {selectedTenant && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({tenants.find(t => t.id === selectedTenant)?.name})
                </span>
              )}
            </CardTitle>
            {selectedTenant && (
              <Button size="sm" onClick={() => setShowCreateUser(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showCreateUser && selectedTenant && (
              <form onSubmit={createUser} className="space-y-3 mb-4 p-3 bg-muted/50 rounded-lg">
                <Input
                  placeholder="Email *"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
                <Input
                  placeholder="Full name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                />
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="ae">Account Executive (AE)</option>
                  <option value="am">Account Manager (AM)</option>
                  <option value="sdr">SDR</option>
                </select>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Create</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowCreateUser(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {!selectedTenant ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a tenant to view users
              </p>
            ) : users.length === 0 && !showCreateUser ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No users in this tenant
              </p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
