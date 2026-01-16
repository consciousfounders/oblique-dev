import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, FileText, MoreHorizontal, Pencil, Trash2, Send, CheckCircle, XCircle, Clock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { QuoteStatus } from '@/lib/supabase'

interface Quote {
  id: string
  quote_number: string
  name: string
  status: QuoteStatus
  total_amount: number
  expires_at: string | null
  created_at: string
  deals: { id: string; name: string } | null
  accounts: { id: string; name: string } | null
  contacts: { first_name: string; last_name: string | null } | null
}

const QUOTE_STATUSES: { value: QuoteStatus; label: string; icon: typeof FileText }[] = [
  { value: 'draft', label: 'Draft', icon: FileText },
  { value: 'sent', label: 'Sent', icon: Send },
  { value: 'accepted', label: 'Accepted', icon: CheckCircle },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
  { value: 'expired', label: 'Expired', icon: Clock },
]

export function QuotesPage() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | ''>('')
  const [newQuote, setNewQuote] = useState({
    name: '',
    expires_at: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchQuotes()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchQuotes() {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, deals(id, name), accounts(id, name), contacts(first_name, last_name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (error) {
      console.error('Error fetching quotes:', error)
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  async function createQuote(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) {
      toast.error('No tenant assigned')
      return
    }

    if (!newQuote.name.trim()) {
      toast.error('Quote name is required')
      return
    }

    try {
      // Generate quote number
      const { data: countData } = await supabase
        .from('quotes')
        .select('id', { count: 'exact' })

      const quoteNumber = `Q-${String((countData?.length || 0) + 1).padStart(5, '0')}`

      const { data, error } = await supabase.from('quotes').insert({
        tenant_id: user.tenantId,
        quote_number: quoteNumber,
        name: newQuote.name.trim(),
        status: 'draft',
        expires_at: newQuote.expires_at || null,
        owner_id: user.id,
      }).select().single()

      if (error) throw error

      toast.success('Quote created successfully')
      setShowCreate(false)
      setNewQuote({ name: '', expires_at: '' })

      // Redirect to the new quote for editing
      window.location.href = `/quotes/${data.id}`
    } catch (error) {
      console.error('Error creating quote:', error)
      toast.error('Failed to create quote')
    }
  }

  async function deleteQuote(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id)
      if (error) throw error
      toast.success('Quote deleted')
      setQuotes(prev => prev.filter(q => q.id !== id))
    } catch (error) {
      console.error('Error deleting quote:', error)
      toast.error('Failed to delete quote')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'expired':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const filteredQuotes = quotes.filter((quote) => {
    if (filterStatus && quote.status !== filterStatus) return false
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      quote.name.toLowerCase().includes(searchLower) ||
      quote.quote_number.toLowerCase().includes(searchLower) ||
      quote.deals?.name.toLowerCase().includes(searchLower) ||
      quote.accounts?.name.toLowerCase().includes(searchLower)
    )
  })

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
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">
            {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-2" />
          {showCreate ? 'Cancel' : 'New Quote'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as QuoteStatus | '')}
          className="flex h-10 w-full sm:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          {QUOTE_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Quote</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createQuote} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Quote Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Enter quote name"
                    value={newQuote.name}
                    onChange={(e) => setNewQuote({ ...newQuote, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Expiration Date</label>
                  <Input
                    type="date"
                    value={newQuote.expires_at}
                    onChange={(e) => setNewQuote({ ...newQuote, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Quote</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {search || filterStatus
              ? 'No quotes match your filters'
              : 'No quotes yet. Create your first quote to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map(quote => (
            <Card key={quote.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link to={`/quotes/${quote.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{quote.name}</h3>
                          <span className="text-xs text-muted-foreground">{quote.quote_number}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {quote.accounts && <span>{quote.accounts.name}</span>}
                          {quote.deals && <span>Deal: {quote.deals.name}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(quote.total_amount)}</span>
                      <span className={`block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {QUOTE_STATUSES.find(s => s.value === quote.status)?.label || quote.status}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/quotes/${quote.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteQuote(quote.id, quote.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {quote.expires_at && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Expires: {new Date(quote.expires_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
