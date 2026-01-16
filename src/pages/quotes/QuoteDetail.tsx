import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountCombobox } from '@/components/contacts/AccountCombobox'
import { ProductCombobox } from '@/components/products/ProductCombobox'
import {
  ArrowLeft,
  FileText,
  Edit2,
  X,
  Check,
  Plus,
  Trash2,
  Download,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { QuoteStatus } from '@/lib/supabase'

interface SimpleProduct {
  id: string
  name: string
  sku: string
  list_price: number | null
}

interface Quote {
  id: string
  quote_number: string
  name: string
  status: QuoteStatus
  deal_id: string | null
  account_id: string | null
  contact_id: string | null
  price_book_id: string | null
  billing_name: string | null
  billing_street: string | null
  billing_city: string | null
  billing_state: string | null
  billing_postal_code: string | null
  billing_country: string | null
  subtotal: number
  discount_percentage: number
  discount_amount: number
  tax_percentage: number
  tax_amount: number
  total_amount: number
  terms: string | null
  notes: string | null
  expires_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  accounts: { id: string; name: string } | null
  deals: { id: string; name: string } | null
}

interface QuoteLineItem {
  id: string
  quote_id: string
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  discount_percentage: number
  discount_amount: number
  line_total: number
  position: number
  products: { name: string; sku: string } | null
}

const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
]

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Quote>>({})
  const [saving, setSaving] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({
    product_id: null as string | null,
    name: '',
    description: '',
    quantity: '1',
    unit_price: '',
    discount_percentage: '0',
  })

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [id, user?.tenantId])

  async function fetchData() {
    try {
      const [quoteResult, itemsResult] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, accounts(id, name), deals(id, name)')
          .eq('id', id)
          .single(),
        supabase
          .from('quote_line_items')
          .select('*, products(name, sku)')
          .eq('quote_id', id)
          .order('position'),
      ])

      if (quoteResult.error) throw quoteResult.error
      setQuote(quoteResult.data)
      setLineItems(itemsResult.data || [])
    } catch (error) {
      console.error('Error fetching quote:', error)
      toast.error('Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  function startEditing() {
    if (!quote) return
    setEditData({
      name: quote.name,
      account_id: quote.account_id,
      billing_name: quote.billing_name,
      billing_street: quote.billing_street,
      billing_city: quote.billing_city,
      billing_state: quote.billing_state,
      billing_postal_code: quote.billing_postal_code,
      billing_country: quote.billing_country,
      discount_percentage: quote.discount_percentage,
      tax_percentage: quote.tax_percentage,
      terms: quote.terms,
      notes: quote.notes,
      expires_at: quote.expires_at,
    })
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditData({})
  }

  async function saveChanges() {
    if (!quote) return

    setSaving(true)
    try {
      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)
      const discountAmount = subtotal * ((editData.discount_percentage || 0) / 100)
      const afterDiscount = subtotal - discountAmount
      const taxAmount = afterDiscount * ((editData.tax_percentage || 0) / 100)
      const totalAmount = afterDiscount + taxAmount

      const { error } = await supabase
        .from('quotes')
        .update({
          name: editData.name,
          account_id: editData.account_id,
          billing_name: editData.billing_name || null,
          billing_street: editData.billing_street || null,
          billing_city: editData.billing_city || null,
          billing_state: editData.billing_state || null,
          billing_postal_code: editData.billing_postal_code || null,
          billing_country: editData.billing_country || null,
          discount_percentage: editData.discount_percentage || 0,
          discount_amount: discountAmount,
          tax_percentage: editData.tax_percentage || 0,
          tax_amount: taxAmount,
          subtotal,
          total_amount: totalAmount,
          terms: editData.terms || null,
          notes: editData.notes || null,
          expires_at: editData.expires_at || null,
        })
        .eq('id', quote.id)

      if (error) throw error

      toast.success('Quote updated')
      setIsEditing(false)
      fetchData()
    } catch (error) {
      console.error('Error updating quote:', error)
      toast.error('Failed to update quote')
    } finally {
      setSaving(false)
    }
  }

  async function addLineItem(e: React.FormEvent) {
    e.preventDefault()

    if (!newItem.name.trim() && !newItem.product_id) {
      toast.error('Please select a product or enter a name')
      return
    }

    if (!newItem.unit_price) {
      toast.error('Unit price is required')
      return
    }

    try {
      const quantity = parseFloat(newItem.quantity) || 1
      const unitPrice = parseFloat(newItem.unit_price)
      const discountPercentage = parseFloat(newItem.discount_percentage) || 0
      const subtotal = quantity * unitPrice
      const discountAmount = subtotal * (discountPercentage / 100)
      const lineTotal = subtotal - discountAmount

      const { error } = await supabase.from('quote_line_items').insert({
        quote_id: id,
        product_id: newItem.product_id,
        name: newItem.name.trim() || 'Product',
        description: newItem.description.trim() || null,
        quantity,
        unit_price: unitPrice,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        line_total: lineTotal,
        position: lineItems.length,
      })

      if (error) throw error

      toast.success('Line item added')
      setShowAddItem(false)
      setNewItem({
        product_id: null,
        name: '',
        description: '',
        quantity: '1',
        unit_price: '',
        discount_percentage: '0',
      })
      fetchData()
      updateQuoteTotals()
    } catch (error) {
      console.error('Error adding line item:', error)
      toast.error('Failed to add line item')
    }
  }

  async function removeLineItem(itemId: string) {
    try {
      const { error } = await supabase
        .from('quote_line_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      toast.success('Line item removed')
      fetchData()
      updateQuoteTotals()
    } catch (error) {
      console.error('Error removing line item:', error)
      toast.error('Failed to remove line item')
    }
  }

  async function updateQuoteTotals() {
    if (!quote) return

    const { data: items } = await supabase
      .from('quote_line_items')
      .select('line_total')
      .eq('quote_id', quote.id)

    const subtotal = (items || []).reduce((sum, item) => sum + item.line_total, 0)
    const discountAmount = subtotal * (quote.discount_percentage / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (quote.tax_percentage / 100)
    const totalAmount = afterDiscount + taxAmount

    await supabase
      .from('quotes')
      .update({
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      })
      .eq('id', quote.id)
  }

  async function updateStatus(newStatus: QuoteStatus) {
    if (!quote) return

    try {
      const updates: Record<string, unknown> = { status: newStatus }

      if (newStatus === 'sent' && !quote.sent_at) {
        updates.sent_at = new Date().toISOString()
      } else if (newStatus === 'accepted') {
        updates.accepted_at = new Date().toISOString()
      } else if (newStatus === 'rejected') {
        updates.rejected_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quote.id)

      if (error) throw error

      toast.success(`Quote marked as ${newStatus}`)
      fetchData()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  function handleProductSelect(productId: string | null, product?: SimpleProduct) {
    setNewItem(prev => ({
      ...prev,
      product_id: productId,
      name: product?.name || prev.name,
      unit_price: product?.list_price?.toString() || prev.unit_price,
    }))
  }

  function generatePDF() {
    if (!quote) return

    // Create a simple HTML-based PDF using browser print
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote ${quote.quote_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { margin-bottom: 30px; }
          .quote-number { color: #666; font-size: 14px; }
          .quote-name { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; }
          .totals tr td { border: none; padding: 5px 10px; }
          .grand-total { font-weight: bold; font-size: 18px; background-color: #f0f0f0; }
          .terms { margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="quote-number">${quote.quote_number}</div>
          <div class="quote-name">${quote.name}</div>
          ${quote.accounts ? `<div>For: ${quote.accounts.name}</div>` : ''}
          ${quote.expires_at ? `<div>Valid until: ${new Date(quote.expires_at).toLocaleDateString()}</div>` : ''}
        </div>

        ${quote.billing_name ? `
        <div class="section">
          <div class="section-title">Bill To</div>
          <div>${quote.billing_name}</div>
          ${quote.billing_street ? `<div>${quote.billing_street}</div>` : ''}
          ${quote.billing_city || quote.billing_state || quote.billing_postal_code ? `
            <div>${[quote.billing_city, quote.billing_state, quote.billing_postal_code].filter(Boolean).join(', ')}</div>
          ` : ''}
          ${quote.billing_country ? `<div>${quote.billing_country}</div>` : ''}
        </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Discount</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map(item => `
              <tr>
                <td>
                  <div>${item.name}</div>
                  ${item.description ? `<div style="font-size: 12px; color: #666;">${item.description}</div>` : ''}
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${item.unit_price.toFixed(2)}</td>
                <td class="text-right">${item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}</td>
                <td class="text-right">$${item.line_total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals" style="width: 300px; margin-left: auto;">
          <tr>
            <td>Subtotal</td>
            <td class="text-right">$${quote.subtotal.toFixed(2)}</td>
          </tr>
          ${quote.discount_percentage > 0 ? `
          <tr>
            <td>Discount (${quote.discount_percentage}%)</td>
            <td class="text-right">-$${quote.discount_amount.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${quote.tax_percentage > 0 ? `
          <tr>
            <td>Tax (${quote.tax_percentage}%)</td>
            <td class="text-right">$${quote.tax_amount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="grand-total">
            <td>Total</td>
            <td class="text-right">$${quote.total_amount.toFixed(2)}</td>
          </tr>
        </table>

        ${quote.terms ? `
        <div class="terms">
          <div class="section-title">Terms & Conditions</div>
          <div style="white-space: pre-wrap;">${quote.terms}</div>
        </div>
        ` : ''}

        ${quote.notes ? `
        <div class="section">
          <div class="section-title">Notes</div>
          <div style="white-space: pre-wrap;">${quote.notes}</div>
        </div>
        ` : ''}
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
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
        return 'bg-gray-100 text-gray-800'
    }
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

  if (!quote) {
    return (
      <div className="space-y-4">
        <Link to="/quotes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Quote not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/quotes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generatePDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          {quote.status === 'draft' && (
            <Button size="sm" onClick={() => updateStatus('sent')}>
              <Send className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          {quote.status === 'sent' && (
            <>
              <Button variant="outline" size="sm" onClick={() => updateStatus('rejected')}>
                <XCircle className="w-4 h-4 mr-2" />
                Rejected
              </Button>
              <Button size="sm" onClick={() => updateStatus('accepted')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Accepted
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Header */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-2xl">{quote.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{quote.quote_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {QUOTE_STATUSES.find(s => s.value === quote.status)?.label || quote.status}
                    </span>
                  </div>
                </div>
              </div>
              {!isEditing ? (
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
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
            <CardContent>
              {isEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Quote Name</label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Account</label>
                    <AccountCombobox
                      value={editData.account_id || null}
                      onChange={(id) => setEditData({ ...editData, account_id: id })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Expiration Date</label>
                    <Input
                      type="date"
                      value={editData.expires_at || ''}
                      onChange={(e) => setEditData({ ...editData, expires_at: e.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <h4 className="text-sm font-medium mb-3">Billing Address</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Name"
                        value={editData.billing_name || ''}
                        onChange={(e) => setEditData({ ...editData, billing_name: e.target.value })}
                      />
                      <Input
                        placeholder="Street"
                        value={editData.billing_street || ''}
                        onChange={(e) => setEditData({ ...editData, billing_street: e.target.value })}
                      />
                      <Input
                        placeholder="City"
                        value={editData.billing_city || ''}
                        onChange={(e) => setEditData({ ...editData, billing_city: e.target.value })}
                      />
                      <Input
                        placeholder="State"
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

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Discount %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={editData.discount_percentage ?? 0}
                      onChange={(e) => setEditData({ ...editData, discount_percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tax %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={editData.tax_percentage ?? 0}
                      onChange={(e) => setEditData({ ...editData, tax_percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Terms & Conditions</label>
                    <textarea
                      value={editData.terms || ''}
                      onChange={(e) => setEditData({ ...editData, terms: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Notes</label>
                    <textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {quote.accounts && (
                    <p className="text-muted-foreground">
                      <Link to={`/accounts/${quote.accounts.id}`} className="hover:text-primary">
                        {quote.accounts.name}
                      </Link>
                    </p>
                  )}
                  {quote.expires_at && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Expires: {new Date(quote.expires_at).toLocaleDateString()}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-4">
                    Created {new Date(quote.created_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Line Items ({lineItems.length})</CardTitle>
              <Button size="sm" onClick={() => setShowAddItem(!showAddItem)}>
                <Plus className="w-4 h-4 mr-2" />
                {showAddItem ? 'Cancel' : 'Add Item'}
              </Button>
            </CardHeader>
            <CardContent>
              {showAddItem && (
                <form onSubmit={addLineItem} className="mb-6 p-4 bg-muted/50 rounded-lg space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Product (optional)</label>
                    <ProductCombobox
                      value={newItem.product_id}
                      onChange={handleProductSelect}
                      placeholder="Select a product or enter manually..."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Item Name</label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="Item name"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Description</label>
                      <Input
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Quantity</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Unit Price</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Discount %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={newItem.discount_percentage}
                        onChange={(e) => setNewItem({ ...newItem, discount_percentage: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Add Line Item</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddItem(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {lineItems.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No line items yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium">Item</th>
                        <th className="text-right py-3 px-2 text-sm font-medium">Qty</th>
                        <th className="text-right py-3 px-2 text-sm font-medium">Price</th>
                        <th className="text-right py-3 px-2 text-sm font-medium">Disc</th>
                        <th className="text-right py-3 px-2 text-sm font-medium">Total</th>
                        <th className="py-3 px-2 text-sm font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="font-medium">{item.name}</div>
                            {item.products && (
                              <div className="text-xs text-muted-foreground">{item.products.sku}</div>
                            )}
                            {item.description && (
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">{item.quantity}</td>
                          <td className="py-3 px-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="py-3 px-2 text-right">
                            {item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}
                          </td>
                          <td className="py-3 px-2 text-right font-medium">{formatCurrency(item.line_total)}</td>
                          <td className="py-3 px-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(item.id)}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Totals */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.discount_percentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount ({quote.discount_percentage}%)</span>
                  <span className="text-green-600">-{formatCurrency(quote.discount_amount)}</span>
                </div>
              )}
              {quote.tax_percentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({quote.tax_percentage}%)</span>
                  <span>{formatCurrency(quote.tax_amount)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(quote.total_amount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
