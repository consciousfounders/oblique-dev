import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Globe, Users } from 'lucide-react'

interface Account {
  id: string
  name: string
  domain: string | null
  industry: string | null
  employee_count: string | null
  created_at: string
}

export function AccountsPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newAccount, setNewAccount] = useState({
    name: '',
    domain: '',
    industry: '',
    employee_count: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchAccounts()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      const { error } = await supabase.from('accounts').insert({
        tenant_id: user.tenantId,
        name: newAccount.name,
        domain: newAccount.domain || null,
        industry: newAccount.industry || null,
        employee_count: newAccount.employee_count || null,
        owner_id: user.id,
      })

      if (error) throw error

      setShowCreate(false)
      setNewAccount({ name: '', domain: '', industry: '', employee_count: '' })
      fetchAccounts()
    } catch (error) {
      console.error('Error creating account:', error)
    }
  }

  const filteredAccounts = accounts.filter((account) => {
    const searchLower = search.toLowerCase()
    return (
      account.name.toLowerCase().includes(searchLower) ||
      account.domain?.toLowerCase().includes(searchLower) ||
      account.industry?.toLowerCase().includes(searchLower)
    )
  })

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
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">{accounts.length} total accounts</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAccount} className="space-y-4">
              <Input
                placeholder="Company name *"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                required
              />
              <Input
                placeholder="Domain (e.g., example.com)"
                value={newAccount.domain}
                onChange={(e) => setNewAccount({ ...newAccount, domain: e.target.value })}
              />
              <Input
                placeholder="Industry"
                value={newAccount.industry}
                onChange={(e) => setNewAccount({ ...newAccount, industry: e.target.value })}
              />
              <Input
                placeholder="Employee count"
                value={newAccount.employee_count}
                onChange={(e) => setNewAccount({ ...newAccount, employee_count: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit">Create Account</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search ? 'No accounts match your search' : 'No accounts yet. Add your first account!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((account) => (
            <Link key={account.id} to={`/accounts/${account.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <h3 className="font-medium">{account.name}</h3>
                  {account.industry && (
                    <p className="text-sm text-muted-foreground">{account.industry}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {account.domain && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {account.domain}
                      </span>
                    )}
                    {account.employee_count && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {account.employee_count}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
