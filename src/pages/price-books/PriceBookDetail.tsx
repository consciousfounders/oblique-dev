import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  X,
  Check,
  Plus,
  Trash2,
  Package,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PriceBookType, Product } from '@/lib/supabase'

interface PriceBook {
  id: string
  name: string
  type: PriceBookType
  description: string | null
  is_active: boolean
  is_default: boolean
  currency: string
  created_at: string
  updated_at: string
}

interface PriceBookEntry {
  id: string
  price_book_id: string
  product_id: string
  unit_price: number
  min_quantity: number
  is_active: boolean
  products: {
    id: string
    name: string
    sku: string
    list_price: number | null
    status: string
  }
}

const PRICE_BOOK_TYPES: { value: PriceBookType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'partner', label: 'Partner' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'custom', label: 'Custom' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' },
]

export function PriceBookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [priceBook, setPriceBook] = useState<PriceBook | null>(null)
  const [entries, setEntries] = useState<PriceBookEntry[]>([])
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<PriceBook>>({})
  const [saving, setSaving] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newEntry, setNewEntry] = useState({
    product_id: '',
    unit_price: '',
    min_quantity: '1',
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
      const [bookResult, entriesResult, productsResult] = await Promise.all([
        supabase
          .from('price_books')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('price_book_entries')
          .select('*, products(id, name, sku, list_price, status)')
          .eq('price_book_id', id)
          .order('products(name)'),
        supabase
          .from('products')
          .select('*')
          .eq('status', 'active')
          .order('name'),
      ])

      if (bookResult.error) throw bookResult.error
      setPriceBook(bookResult.data)
      setEntries(entriesResult.data || [])
      setAvailableProducts(productsResult.data || [])
    } catch (error) {
      console.error('Error fetching price book:', error)
      toast.error('Failed to load price book')
    } finally {
      setLoading(false)
    }
  }

  function startEditing() {
    if (!priceBook) return
    setEditData({
      name: priceBook.name,
      type: priceBook.type,
      description: priceBook.description,
      is_active: priceBook.is_active,
      is_default: priceBook.is_default,
      currency: priceBook.currency,
    })
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditData({})
  }

  async function saveChanges() {
    if (!priceBook) return

    if (!editData.name?.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      // If setting as default, unset other defaults first
      if (editData.is_default && !priceBook.is_default) {
        await supabase
          .from('price_books')
          .update({ is_default: false })
          .eq('is_default', true)
      }

      const { error } = await supabase
        .from('price_books')
        .update({
          name: editData.name.trim(),
          type: editData.type,
          description: editData.description?.trim() || null,
          is_active: editData.is_active,
          is_default: editData.is_default,
          currency: editData.currency,
        })
        .eq('id', priceBook.id)

      if (error) throw error

      toast.success('Price book updated')
      setIsEditing(false)
      fetchData()
    } catch (error) {
      console.error('Error updating price book:', error)
      toast.error('Failed to update price book')
    } finally {
      setSaving(false)
    }
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()

    if (!newEntry.product_id) {
      toast.error('Please select a product')
      return
    }

    if (!newEntry.unit_price) {
      toast.error('Unit price is required')
      return
    }

    try {
      const { error } = await supabase.from('price_book_entries').insert({
        price_book_id: id,
        product_id: newEntry.product_id,
        unit_price: parseFloat(newEntry.unit_price),
        min_quantity: parseInt(newEntry.min_quantity) || 1,
        is_active: true,
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('This product is already in the price book')
          return
        }
        throw error
      }

      toast.success('Product added to price book')
      setShowAddProduct(false)
      setNewEntry({ product_id: '', unit_price: '', min_quantity: '1' })
      fetchData()
    } catch (error) {
      console.error('Error adding entry:', error)
      toast.error('Failed to add product')
    }
  }

  async function updateEntryPrice(entryId: string, newPrice: string) {
    if (!newPrice) return

    try {
      const { error } = await supabase
        .from('price_book_entries')
        .update({ unit_price: parseFloat(newPrice) })
        .eq('id', entryId)

      if (error) throw error
      toast.success('Price updated')
      fetchData()
    } catch (error) {
      console.error('Error updating price:', error)
      toast.error('Failed to update price')
    }
  }

  async function removeEntry(entryId: string, productName: string) {
    if (!confirm(`Remove "${productName}" from this price book?`)) return

    try {
      const { error } = await supabase
        .from('price_book_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
      toast.success('Product removed from price book')
      setEntries(prev => prev.filter(e => e.id !== entryId))
    } catch (error) {
      console.error('Error removing entry:', error)
      toast.error('Failed to remove product')
    }
  }

  const formatCurrency = (value: number | null | undefined, currency: string = 'USD') => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  }

  const getTypeColor = (type: PriceBookType) => {
    switch (type) {
      case 'standard':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'partner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'enterprise':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
      case 'custom':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  // Filter out products already in the price book
  const productsNotInBook = availableProducts.filter(
    p => !entries.some(e => e.product_id === p.id)
  )

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

  if (!priceBook) {
    return (
      <div className="space-y-4">
        <Link to="/price-books">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Price Books
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Price book not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/price-books">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Link>

      {/* Price Book Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{priceBook.name}</CardTitle>
                {priceBook.is_default && (
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(priceBook.type)}`}>
                  {PRICE_BOOK_TYPES.find(t => t.value === priceBook.type)?.label || priceBook.type}
                </span>
                <span className="text-sm text-muted-foreground">{priceBook.currency}</span>
                <span className={`text-sm ${priceBook.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                  {priceBook.is_active ? 'Active' : 'Inactive'}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Name</label>
                <Input
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Type</label>
                <select
                  value={editData.type || 'standard'}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value as PriceBookType })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PRICE_BOOK_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Currency</label>
                <select
                  value={editData.currency || 'USD'}
                  onChange={(e) => setEditData({ ...editData, currency: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.is_active ?? true}
                    onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.is_default ?? false}
                    onChange={(e) => setEditData({ ...editData, is_default: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Default</span>
                </label>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <>
              {priceBook.description && (
                <p className="text-muted-foreground">{priceBook.description}</p>
              )}
              <div className="text-xs text-muted-foreground mt-4">
                Created {new Date(priceBook.created_at).toLocaleDateString()} &middot;
                Updated {new Date(priceBook.updated_at).toLocaleDateString()}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Price Book Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Products ({entries.length})</CardTitle>
          <Button size="sm" onClick={() => setShowAddProduct(!showAddProduct)}>
            <Plus className="w-4 h-4 mr-2" />
            {showAddProduct ? 'Cancel' : 'Add Product'}
          </Button>
        </CardHeader>
        <CardContent>
          {showAddProduct && (
            <form onSubmit={addEntry} className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Product</label>
                  <select
                    value={newEntry.product_id}
                    onChange={(e) => {
                      const product = availableProducts.find(p => p.id === e.target.value)
                      setNewEntry({
                        ...newEntry,
                        product_id: e.target.value,
                        unit_price: product?.list_price?.toString() || '',
                      })
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select a product...</option>
                    {productsNotInBook.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - List: {formatCurrency(p.list_price, priceBook.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Unit Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newEntry.unit_price}
                    onChange={(e) => setNewEntry({ ...newEntry, unit_price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Min Qty</label>
                  <Input
                    type="number"
                    min="1"
                    value={newEntry.min_quantity}
                    onChange={(e) => setNewEntry({ ...newEntry, min_quantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" size="sm">Add to Price Book</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddProduct(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {entries.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No products in this price book yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium">Product</th>
                    <th className="text-left py-3 px-2 text-sm font-medium">SKU</th>
                    <th className="text-right py-3 px-2 text-sm font-medium">List Price</th>
                    <th className="text-right py-3 px-2 text-sm font-medium">Price Book Price</th>
                    <th className="text-center py-3 px-2 text-sm font-medium">Min Qty</th>
                    <th className="text-right py-3 px-2 text-sm font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <Link
                          to={`/products/${entry.product_id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {entry.products.name}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {entry.products.sku}
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                        {formatCurrency(entry.products.list_price, priceBook.currency)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={entry.unit_price}
                          onBlur={(e) => {
                            if (e.target.value !== entry.unit_price.toString()) {
                              updateEntryPrice(entry.id, e.target.value)
                            }
                          }}
                          className="w-28 text-right ml-auto"
                        />
                      </td>
                      <td className="py-3 px-2 text-center text-sm">
                        {entry.min_quantity}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEntry(entry.id, entry.products.name)}
                          className="text-destructive hover:text-destructive"
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
  )
}
