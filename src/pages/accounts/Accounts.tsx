import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCombobox } from '@/components/deals'
import { AccountCombobox } from '@/components/accounts/AccountCombobox'
import {
  Plus,
  Search,
  Globe,
  Users,
  Building2,
  Phone,
  ArrowUpDown,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AccountType } from '@/lib/supabase'

interface Account {
  id: string
  name: string
  domain: string | null
  website: string | null
  industry: string | null
  employee_count: string | null
  annual_revenue: string | null
  phone: string | null
  account_type: AccountType
  owner_id: string | null
  parent_account_id: string | null
  users: { full_name: string | null; email: string } | null
  parent_account: { id: string; name: string } | null
  created_at: string
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'other', label: 'Other' },
]

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Energy',
  'Transportation',
  'Media & Entertainment',
  'Professional Services',
  'Telecommunications',
  'Other',
]

const EMPLOYEE_COUNTS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001-10000',
  '10000+',
]

type SortField = 'name' | 'created_at' | 'industry' | 'account_type'
type SortDirection = 'asc' | 'desc'

const initialFormState = {
  name: '',
  domain: '',
  website: '',
  industry: '',
  employee_count: '',
  annual_revenue: '',
  phone: '',
  fax: '',
  account_type: 'prospect' as AccountType,
  description: '',
  owner_id: null as string | null,
  parent_account_id: null as string | null,
  billing_street: '',
  billing_city: '',
  billing_state: '',
  billing_postal_code: '',
  billing_country: '',
  shipping_street: '',
  shipping_city: '',
  shipping_state: '',
  shipping_postal_code: '',
  shipping_country: '',
}

export function AccountsPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newAccount, setNewAccount] = useState(initialFormState)
  const [copyBillingToShipping, setCopyBillingToShipping] = useState(false)

  // Filtering
  const [showFilters, setShowFilters] = useState(false)
  const [filterIndustry, setFilterIndustry] = useState('')
  const [filterAccountType, setFilterAccountType] = useState<AccountType | ''>('')
  const [filterOwnerId, setFilterOwnerId] = useState<string | null>(null)

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    if (user?.tenantId) {
      fetchAccounts()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  useEffect(() => {
    if (copyBillingToShipping) {
      setNewAccount(prev => ({
        ...prev,
        shipping_street: prev.billing_street,
        shipping_city: prev.billing_city,
        shipping_state: prev.billing_state,
        shipping_postal_code: prev.billing_postal_code,
        shipping_country: prev.billing_country,
      }))
    }
  }, [copyBillingToShipping, newAccount.billing_street, newAccount.billing_city, newAccount.billing_state, newAccount.billing_postal_code, newAccount.billing_country])

  async function fetchAccounts() {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id, name, domain, website, industry, employee_count, annual_revenue,
          phone, account_type, owner_id, parent_account_id, created_at,
          users:owner_id(full_name, email),
          parent_account:parent_account_id(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      // Transform arrays to single objects for joined relations
      const transformedData = (data || []).map(account => ({
        ...account,
        users: Array.isArray(account.users) ? account.users[0] || null : account.users,
        parent_account: Array.isArray(account.parent_account) ? account.parent_account[0] || null : account.parent_account,
      })) as Account[]
      setAccounts(transformedData)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    setCreating(true)
    try {
      const { error } = await supabase.from('accounts').insert({
        tenant_id: user.tenantId,
        name: newAccount.name,
        domain: newAccount.domain || null,
        website: newAccount.website || null,
        industry: newAccount.industry || null,
        employee_count: newAccount.employee_count || null,
        annual_revenue: newAccount.annual_revenue || null,
        phone: newAccount.phone || null,
        fax: newAccount.fax || null,
        account_type: newAccount.account_type,
        description: newAccount.description || null,
        owner_id: newAccount.owner_id || user.id,
        parent_account_id: newAccount.parent_account_id || null,
        billing_street: newAccount.billing_street || null,
        billing_city: newAccount.billing_city || null,
        billing_state: newAccount.billing_state || null,
        billing_postal_code: newAccount.billing_postal_code || null,
        billing_country: newAccount.billing_country || null,
        shipping_street: newAccount.shipping_street || null,
        shipping_city: newAccount.shipping_city || null,
        shipping_state: newAccount.shipping_state || null,
        shipping_postal_code: newAccount.shipping_postal_code || null,
        shipping_country: newAccount.shipping_country || null,
      })

      if (error) throw error

      toast.success('Account created successfully')
      setShowCreate(false)
      setNewAccount(initialFormState)
      setCopyBillingToShipping(false)
      fetchAccounts()
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error('Failed to create account')
    } finally {
      setCreating(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const clearFilters = () => {
    setFilterIndustry('')
    setFilterAccountType('')
    setFilterOwnerId(null)
    setSearch('')
  }

  const hasActiveFilters = filterIndustry || filterAccountType || filterOwnerId || search

  const filteredAndSortedAccounts = accounts
    .filter((account) => {
      const searchLower = search.toLowerCase()
      const matchesSearch = !search ||
        account.name.toLowerCase().includes(searchLower) ||
        account.domain?.toLowerCase().includes(searchLower) ||
        account.industry?.toLowerCase().includes(searchLower) ||
        account.phone?.includes(search)

      const matchesIndustry = !filterIndustry || account.industry === filterIndustry
      const matchesAccountType = !filterAccountType || account.account_type === filterAccountType
      const matchesOwner = !filterOwnerId || account.owner_id === filterOwnerId

      return matchesSearch && matchesIndustry && matchesAccountType && matchesOwner
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'industry':
          comparison = (a.industry || '').localeCompare(b.industry || '')
          break
        case 'account_type':
          comparison = a.account_type.localeCompare(b.account_type)
          break
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const getAccountTypeLabel = (type: AccountType) =>
    ACCOUNT_TYPES.find(t => t.value === type)?.label || type

  const getAccountTypeBadgeColor = (type: AccountType) => {
    switch (type) {
      case 'customer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'prospect': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'partner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'vendor': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
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
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">
            {filteredAndSortedAccounts.length} of {accounts.length} accounts
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                !
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSort(sortField)}
            className="hidden sm:flex"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Sort
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Industry</label>
                  <select
                    value={filterIndustry}
                    onChange={(e) => setFilterIndustry(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Industries</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Account Type</label>
                  <select
                    value={filterAccountType}
                    onChange={(e) => setFilterAccountType(e.target.value as AccountType | '')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Types</option>
                    {ACCOUNT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Owner</label>
                  <UserCombobox
                    value={filterOwnerId}
                    onChange={setFilterOwnerId}
                    placeholder="All Owners"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sort By</label>
                  <div className="flex gap-2">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SortField)}
                      className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="created_at">Created Date</option>
                      <option value="name">Name</option>
                      <option value="industry">Industry</option>
                      <option value="account_type">Type</option>
                    </select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Account Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAccount} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium mb-3">Basic Information</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Input
                      placeholder="Company name *"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={newAccount.account_type}
                      onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value as AccountType })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {ACCOUNT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Input
                      placeholder="Website (e.g., https://example.com)"
                      value={newAccount.website}
                      onChange={(e) => setNewAccount({ ...newAccount, website: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Domain (e.g., example.com)"
                      value={newAccount.domain}
                      onChange={(e) => setNewAccount({ ...newAccount, domain: e.target.value })}
                    />
                  </div>
                  <div>
                    <select
                      value={newAccount.industry}
                      onChange={(e) => setNewAccount({ ...newAccount, industry: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select Industry</option>
                      {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={newAccount.employee_count}
                      onChange={(e) => setNewAccount({ ...newAccount, employee_count: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Employee Count</option>
                      {EMPLOYEE_COUNTS.map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Input
                      placeholder="Annual Revenue"
                      value={newAccount.annual_revenue}
                      onChange={(e) => setNewAccount({ ...newAccount, annual_revenue: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Phone"
                      value={newAccount.phone}
                      onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Fax"
                      value={newAccount.fax}
                      onChange={(e) => setNewAccount({ ...newAccount, fax: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Ownership & Hierarchy */}
              <div>
                <h3 className="text-sm font-medium mb-3">Ownership & Hierarchy</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Account Owner</label>
                    <UserCombobox
                      value={newAccount.owner_id}
                      onChange={(id) => setNewAccount({ ...newAccount, owner_id: id })}
                      placeholder="Select owner..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Parent Account</label>
                    <AccountCombobox
                      value={newAccount.parent_account_id}
                      onChange={(id) => setNewAccount({ ...newAccount, parent_account_id: id })}
                      placeholder="Select parent account..."
                      excludeId={undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <h3 className="text-sm font-medium mb-3">Billing Address</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Input
                      placeholder="Street Address"
                      value={newAccount.billing_street}
                      onChange={(e) => setNewAccount({ ...newAccount, billing_street: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="City"
                      value={newAccount.billing_city}
                      onChange={(e) => setNewAccount({ ...newAccount, billing_city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="State/Province"
                      value={newAccount.billing_state}
                      onChange={(e) => setNewAccount({ ...newAccount, billing_state: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Postal Code"
                      value={newAccount.billing_postal_code}
                      onChange={(e) => setNewAccount({ ...newAccount, billing_postal_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Country"
                      value={newAccount.billing_country}
                      onChange={(e) => setNewAccount({ ...newAccount, billing_country: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Shipping Address</h3>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyBillingToShipping}
                      onChange={(e) => setCopyBillingToShipping(e.target.checked)}
                      className="rounded"
                    />
                    Same as billing
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Input
                      placeholder="Street Address"
                      value={newAccount.shipping_street}
                      onChange={(e) => setNewAccount({ ...newAccount, shipping_street: e.target.value })}
                      disabled={copyBillingToShipping}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="City"
                      value={newAccount.shipping_city}
                      onChange={(e) => setNewAccount({ ...newAccount, shipping_city: e.target.value })}
                      disabled={copyBillingToShipping}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="State/Province"
                      value={newAccount.shipping_state}
                      onChange={(e) => setNewAccount({ ...newAccount, shipping_state: e.target.value })}
                      disabled={copyBillingToShipping}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Postal Code"
                      value={newAccount.shipping_postal_code}
                      onChange={(e) => setNewAccount({ ...newAccount, shipping_postal_code: e.target.value })}
                      disabled={copyBillingToShipping}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Country"
                      value={newAccount.shipping_country}
                      onChange={(e) => setNewAccount({ ...newAccount, shipping_country: e.target.value })}
                      disabled={copyBillingToShipping}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium mb-3">Description</h3>
                <textarea
                  placeholder="Account description..."
                  value={newAccount.description}
                  onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Account'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    setNewAccount(initialFormState)
                    setCopyBillingToShipping(false)
                  }}
                >
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
      ) : filteredAndSortedAccounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {hasActiveFilters ? 'No accounts match your filters' : 'No accounts yet. Add your first account!'}
          </p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedAccounts.map((account) => (
            <Link key={account.id} to={`/accounts/${account.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{account.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getAccountTypeBadgeColor(account.account_type)}`}>
                      {getAccountTypeLabel(account.account_type)}
                    </span>
                  </div>
                  {account.industry && (
                    <p className="text-sm text-muted-foreground mt-1">{account.industry}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
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
                    {account.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {account.phone}
                      </span>
                    )}
                  </div>
                  {account.parent_account && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Parent: {account.parent_account.name}
                    </div>
                  )}
                  {account.users && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Owner: {account.users.full_name || account.users.email}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
