import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline, ActivityForm } from '@/components/activity'
import { NotesPanel } from '@/components/notes'
import { AttachmentsPanel } from '@/components/attachments'
import { UserCombobox } from '@/components/deals'
import { AccountCombobox } from '@/components/accounts/AccountCombobox'
import { CompanyEnrichmentPanel } from '@/components/enrichment'
import {
  ArrowLeft,
  Globe,
  Users,
  Building,
  Building2,
  DollarSign,
  Phone,
  Printer,
  MapPin,
  Edit2,
  X,
  Check,
  Trash2,
  ExternalLink,
  ChevronRight,
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
  fax: string | null
  account_type: AccountType
  description: string | null
  owner_id: string | null
  parent_account_id: string | null
  billing_street: string | null
  billing_city: string | null
  billing_state: string | null
  billing_postal_code: string | null
  billing_country: string | null
  shipping_street: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_postal_code: string | null
  shipping_country: string | null
  created_at: string
  updated_at: string
  users: { id: string; full_name: string | null; email: string } | null
  parent_account: { id: string; name: string } | null
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

interface ChildAccount {
  id: string
  name: string
  industry: string | null
  account_type: AccountType
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

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [childAccounts, setChildAccounts] = useState<ChildAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Account>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [id, user?.tenantId])

  async function fetchData() {
    try {
      const [accountResult, contactsResult, dealsResult, childAccountsResult] = await Promise.all([
        supabase
          .from('accounts')
          .select(`
            *,
            users:owner_id(id, full_name, email),
            parent_account:parent_account_id(id, name)
          `)
          .eq('id', id)
          .single(),
        supabase.from('contacts').select('id, first_name, last_name, email, title').eq('account_id', id),
        supabase.from('deals').select('id, name, value, stage_id, deal_stages(name)').eq('account_id', id),
        supabase.from('accounts').select('id, name, industry, account_type').eq('parent_account_id', id),
      ])

      if (accountResult.error) throw accountResult.error
      setAccount(accountResult.data)
      setContacts(contactsResult.data || [])
      // Transform deal_stages from array to single object
      const transformedDeals = (dealsResult.data || []).map(deal => ({
        ...deal,
        deal_stages: Array.isArray(deal.deal_stages) ? deal.deal_stages[0] || null : deal.deal_stages
      })) as Deal[]
      setDeals(transformedDeals)
      setChildAccounts(childAccountsResult.data || [])
    } catch (error) {
      console.error('Error fetching account:', error)
      toast.error('Failed to load account')
    } finally {
      setLoading(false)
    }
  }

  function startEditing() {
    if (!account) return
    setEditData({
      name: account.name,
      domain: account.domain,
      website: account.website,
      industry: account.industry,
      employee_count: account.employee_count,
      annual_revenue: account.annual_revenue,
      phone: account.phone,
      fax: account.fax,
      account_type: account.account_type,
      description: account.description,
      owner_id: account.owner_id,
      parent_account_id: account.parent_account_id,
      billing_street: account.billing_street,
      billing_city: account.billing_city,
      billing_state: account.billing_state,
      billing_postal_code: account.billing_postal_code,
      billing_country: account.billing_country,
      shipping_street: account.shipping_street,
      shipping_city: account.shipping_city,
      shipping_state: account.shipping_state,
      shipping_postal_code: account.shipping_postal_code,
      shipping_country: account.shipping_country,
    })
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditData({})
  }

  async function saveChanges() {
    if (!account) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          name: editData.name,
          domain: editData.domain || null,
          website: editData.website || null,
          industry: editData.industry || null,
          employee_count: editData.employee_count || null,
          annual_revenue: editData.annual_revenue || null,
          phone: editData.phone || null,
          fax: editData.fax || null,
          account_type: editData.account_type,
          description: editData.description || null,
          owner_id: editData.owner_id || null,
          parent_account_id: editData.parent_account_id || null,
          billing_street: editData.billing_street || null,
          billing_city: editData.billing_city || null,
          billing_state: editData.billing_state || null,
          billing_postal_code: editData.billing_postal_code || null,
          billing_country: editData.billing_country || null,
          shipping_street: editData.shipping_street || null,
          shipping_city: editData.shipping_city || null,
          shipping_state: editData.shipping_state || null,
          shipping_postal_code: editData.shipping_postal_code || null,
          shipping_country: editData.shipping_country || null,
        })
        .eq('id', account.id)

      if (error) throw error

      toast.success('Account updated successfully')
      setIsEditing(false)
      fetchData()
    } catch (error) {
      console.error('Error updating account:', error)
      toast.error('Failed to update account')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    if (!account) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id)

      if (error) throw error

      toast.success('Account deleted successfully')
      navigate('/accounts')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
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

  const formatAddress = (street: string | null, city: string | null, state: string | null, postalCode: string | null, country: string | null) => {
    const parts = [street, city, state, postalCode, country].filter(Boolean)
    return parts.join(', ')
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
      <div className="flex items-center justify-between">
        <Link to="/accounts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button size="sm" onClick={startEditing}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Delete Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to delete "{account.name}"? This will also affect {contacts.length} contacts and {deals.length} deals associated with this account.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteAccount} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Account Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{account.name}</CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full ${getAccountTypeBadgeColor(account.account_type)}`}>
                  {getAccountTypeLabel(account.account_type)}
                </span>
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveChanges} disabled={saving}>
                    <Check className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Basic Information</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Company Name *</label>
                        <Input
                          value={editData.name || ''}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Account Type</label>
                        <select
                          value={editData.account_type}
                          onChange={(e) => setEditData({ ...editData, account_type: e.target.value as AccountType })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {ACCOUNT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Website</label>
                        <Input
                          value={editData.website || ''}
                          onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Domain</label>
                        <Input
                          value={editData.domain || ''}
                          onChange={(e) => setEditData({ ...editData, domain: e.target.value })}
                          placeholder="example.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Industry</label>
                        <select
                          value={editData.industry || ''}
                          onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select Industry</option>
                          {INDUSTRIES.map(ind => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Employee Count</label>
                        <select
                          value={editData.employee_count || ''}
                          onChange={(e) => setEditData({ ...editData, employee_count: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          {EMPLOYEE_COUNTS.map(count => (
                            <option key={count} value={count}>{count}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Annual Revenue</label>
                        <Input
                          value={editData.annual_revenue || ''}
                          onChange={(e) => setEditData({ ...editData, annual_revenue: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Phone</label>
                        <Input
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Fax</label>
                        <Input
                          value={editData.fax || ''}
                          onChange={(e) => setEditData({ ...editData, fax: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ownership */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Ownership & Hierarchy</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Account Owner</label>
                        <UserCombobox
                          value={editData.owner_id || null}
                          onChange={(id) => setEditData({ ...editData, owner_id: id })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Parent Account</label>
                        <AccountCombobox
                          value={editData.parent_account_id || null}
                          onChange={(id) => setEditData({ ...editData, parent_account_id: id })}
                          excludeId={account.id}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Billing Address</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Street Address"
                          value={editData.billing_street || ''}
                          onChange={(e) => setEditData({ ...editData, billing_street: e.target.value })}
                        />
                      </div>
                      <Input
                        placeholder="City"
                        value={editData.billing_city || ''}
                        onChange={(e) => setEditData({ ...editData, billing_city: e.target.value })}
                      />
                      <Input
                        placeholder="State/Province"
                        value={editData.billing_state || ''}
                        onChange={(e) => setEditData({ ...editData, billing_state: e.target.value })}
                      />
                      <Input
                        placeholder="Postal Code"
                        value={editData.billing_postal_code || ''}
                        onChange={(e) => setEditData({ ...editData, billing_postal_code: e.target.value })}
                      />
                      <Input
                        placeholder="Country"
                        value={editData.billing_country || ''}
                        onChange={(e) => setEditData({ ...editData, billing_country: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Shipping Address</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Street Address"
                          value={editData.shipping_street || ''}
                          onChange={(e) => setEditData({ ...editData, shipping_street: e.target.value })}
                        />
                      </div>
                      <Input
                        placeholder="City"
                        value={editData.shipping_city || ''}
                        onChange={(e) => setEditData({ ...editData, shipping_city: e.target.value })}
                      />
                      <Input
                        placeholder="State/Province"
                        value={editData.shipping_state || ''}
                        onChange={(e) => setEditData({ ...editData, shipping_state: e.target.value })}
                      />
                      <Input
                        placeholder="Postal Code"
                        value={editData.shipping_postal_code || ''}
                        onChange={(e) => setEditData({ ...editData, shipping_postal_code: e.target.value })}
                      />
                      <Input
                        placeholder="Country"
                        value={editData.shipping_country || ''}
                        onChange={(e) => setEditData({ ...editData, shipping_country: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Description</h3>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {account.industry && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="w-4 h-4" />
                      <span>{account.industry}</span>
                    </div>
                  )}

                  {account.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <a
                        href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {account.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {account.domain && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>{account.domain}</span>
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

                  {account.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{account.phone}</span>
                    </div>
                  )}

                  {account.fax && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Printer className="w-4 h-4" />
                      <span>{account.fax}</span>
                    </div>
                  )}

                  {account.users && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Owner: {account.users.full_name || account.users.email}</span>
                    </div>
                  )}

                  {account.parent_account && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>
                        Parent:{' '}
                        <Link
                          to={`/accounts/${account.parent_account.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {account.parent_account.name}
                        </Link>
                      </span>
                    </div>
                  )}

                  {/* Addresses */}
                  {(account.billing_street || account.billing_city) && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Billing Address</h4>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span>{formatAddress(account.billing_street, account.billing_city, account.billing_state, account.billing_postal_code, account.billing_country)}</span>
                      </div>
                    </div>
                  )}

                  {(account.shipping_street || account.shipping_city) && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Shipping Address</h4>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span>{formatAddress(account.shipping_street, account.shipping_city, account.shipping_state, account.shipping_postal_code, account.shipping_country)}</span>
                      </div>
                    </div>
                  )}

                  {account.description && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{account.description}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    Created {new Date(account.created_at).toLocaleDateString()} &middot;
                    Updated {new Date(account.updated_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Child Accounts */}
          {childAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Child Accounts ({childAccounts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {childAccounts.map((child) => (
                    <Link
                      key={child.id}
                      to={`/accounts/${child.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{child.name}</div>
                          {child.industry && (
                            <div className="text-sm text-muted-foreground">{child.industry}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getAccountTypeBadgeColor(child.account_type)}`}>
                          {getAccountTypeLabel(child.account_type)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contacts */}
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

          {/* Deals */}
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

          <NotesPanel entityType="account" entityId={account.id} />
          <AttachmentsPanel entityType="account" entityId={account.id} />
        </div>

        <div className="space-y-6">
          <CompanyEnrichmentPanel
            accountId={account.id}
            accountName={account.name}
            accountDomain={account.domain || undefined}
          />
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
