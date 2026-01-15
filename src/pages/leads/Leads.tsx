import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Phone, Mail } from 'lucide-react'

interface Lead {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  company: string | null
  status: string
  created_at: string
}

export function LeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchLeads()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      const { error } = await supabase.from('leads').insert({
        tenant_id: user.tenantId,
        first_name: newLead.first_name,
        last_name: newLead.last_name || null,
        email: newLead.email || null,
        phone: newLead.phone || null,
        company: newLead.company || null,
        owner_id: user.id,
      })

      if (error) throw error

      setShowCreate(false)
      setNewLead({ first_name: '', last_name: '', email: '', phone: '', company: '' })
      fetchLeads()
    } catch (error) {
      console.error('Error creating lead:', error)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const searchLower = search.toLowerCase()
    return (
      lead.first_name.toLowerCase().includes(searchLower) ||
      lead.last_name?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.company?.toLowerCase().includes(searchLower)
    )
  })

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    qualified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    unqualified: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
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
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="First name *"
                  value={newLead.first_name}
                  onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                  required
                />
                <Input
                  placeholder="Last name"
                  value={newLead.last_name}
                  onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                />
              </div>
              <Input
                type="email"
                placeholder="Email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
              <Input
                placeholder="Company"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit">Create Lead</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leads List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search ? 'No leads match your search' : 'No leads yet. Add your first lead!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredLeads.map((lead) => (
            <Link key={lead.id} to={`/leads/${lead.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </h3>
                      {lead.company && (
                        <p className="text-sm text-muted-foreground">{lead.company}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || statusColors.new}`}>
                      {lead.status}
                    </span>
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
