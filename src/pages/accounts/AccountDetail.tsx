import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline, ActivityForm } from '@/components/activity'
import { ArrowLeft, Globe, Users, Building, DollarSign } from 'lucide-react'

interface Account {
  id: string
  name: string
  domain: string | null
  industry: string | null
  employee_count: string | null
  annual_revenue: string | null
  created_at: string
  updated_at: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  title: string | null
}

interface Deal {
  id: string
  name: string
  value: number | null
  stage_id: string
  deal_stages: { name: string } | null
}

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
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
      const [accountResult, contactsResult, dealsResult] = await Promise.all([
        supabase.from('accounts').select('*').eq('id', id).single(),
        supabase.from('contacts').select('id, first_name, last_name, email, title').eq('account_id', id),
        supabase.from('deals').select('id, name, value, stage_id, deal_stages(name)').eq('account_id', id),
      ])

      if (accountResult.error) throw accountResult.error
      setAccount(accountResult.data)
      setContacts(contactsResult.data || [])
      // Transform deal_stages from array to single object (Supabase returns array for joins)
      const transformedDeals = (dealsResult.data || []).map(deal => ({
        ...deal,
        deal_stages: Array.isArray(deal.deal_stages) ? deal.deal_stages[0] || null : deal.deal_stages
      })) as Deal[]
      setDeals(transformedDeals)
    } catch (error) {
      console.error('Error fetching account:', error)
    } finally {
      setLoading(false)
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

  if (!account) {
    return (
      <div className="space-y-4">
        <Link to="/accounts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Accounts
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Account not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/accounts">
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
              <CardTitle className="text-2xl">{account.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {account.industry && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="w-4 h-4" />
                  <span>{account.industry}</span>
                </div>
              )}
              {account.domain && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <a
                    href={`https://${account.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {account.domain}
                  </a>
                </div>
              )}
              {account.employee_count && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{account.employee_count} employees</span>
                </div>
              )}
              {account.annual_revenue && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>{account.annual_revenue} annual revenue</span>
                </div>
              )}
              <div className="pt-4 border-t text-xs text-muted-foreground">
                Created {new Date(account.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contacts ({contacts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      to={`/contacts/${contact.id}`}
                      className="block p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </div>
                      {contact.title && (
                        <div className="text-sm text-muted-foreground">{contact.title}</div>
                      )}
                      {contact.email && (
                        <div className="text-sm text-muted-foreground">{contact.email}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {deals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deals ({deals.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deals.map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/deals/${deal.id}`}
                      className="block p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{deal.name}</div>
                          {deal.deal_stages && (
                            <div className="text-sm text-muted-foreground">
                              {deal.deal_stages.name}
                            </div>
                          )}
                        </div>
                        {deal.value && (
                          <div className="text-sm font-medium">{formatCurrency(deal.value)}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <ActivityForm entityType="account" entityId={account.id} />
          <ActivityTimeline
            entityType="account"
            entityId={account.id}
            title="Activity"
            maxHeight="500px"
          />
        </div>
      </div>
    </div>
  )
}
