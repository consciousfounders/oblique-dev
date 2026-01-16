import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  DollarSign,
  Package,
  Tag,
  Edit2,
  X,
  Check,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProductStatus, PriceBookEntry, PriceBook } from '@/lib/supabase'

interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  category: string | null
  family: string | null
  status: ProductStatus
  list_price: number | null
  image_url: string | null
  created_at: string
  updated_at: string
}

interface PriceBookEntryWithBook extends PriceBookEntry {
  price_books: PriceBook
}

const PRODUCT_STATUSES: { value: ProductStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
]

const PRODUCT_CATEGORIES = [
  'Software',
  'Hardware',
  'Services',
  'Subscription',
  'Support',
  'Training',
  'Consulting',
  'Other',
]

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [priceBookEntries, setPriceBookEntries] = useState<PriceBookEntryWithBook[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Product>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [id, user?.tenantId])

  async function fetchData() {
    try {
      const [productResult, entriesResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('price_book_entries')
          .select('*, price_books(*)')
          .eq('product_id', id)
          .eq('is_active', true),
      ])

      if (productResult.error) throw productResult.error
      setProduct(productResult.data)
      setPriceBookEntries(entriesResult.data || [])
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  function startEditing() {
    if (!product) return
    setEditData({
      name: product.name,
      sku: product.sku,
      description: product.description,
      category: product.category,
      family: product.family,
      status: product.status,
      list_price: product.list_price,
      image_url: product.image_url,
    })
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditData({})
  }

  async function saveChanges() {
    if (!product) return

    if (!editData.name?.trim()) {
      toast.error('Product name is required')
      return
    }

    if (!editData.sku?.trim()) {
      toast.error('SKU is required')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editData.name.trim(),
          sku: editData.sku.trim().toUpperCase(),
          description: editData.description?.trim() || null,
          category: editData.category || null,
          family: editData.family?.trim() || null,
          status: editData.status,
          list_price: editData.list_price,
          image_url: editData.image_url?.trim() || null,
        })
        .eq('id', product.id)

      if (error) {
        if (error.code === '23505') {
          toast.error('A product with this SKU already exists')
          return
        }
        throw error
      }

      toast.success('Product updated')
      setIsEditing(false)
      fetchData()
    } catch (error) {
      console.error('Error updating product:', error)
      toast.error('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'discontinued':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
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

  if (!product) {
    return (
      <div className="space-y-4">
        <Link to="/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Product not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/products">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{product.sku}</p>
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
            <CardContent className="space-y-4">
              {isEditing ? (
                /* Edit Mode */
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">
                      Product Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      SKU <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={editData.sku || ''}
                      onChange={(e) => setEditData({ ...editData, sku: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">List Price</label>
                    <Input
                      type="number"
                      value={editData.list_price ?? ''}
                      onChange={(e) => setEditData({ ...editData, list_price: e.target.value ? parseFloat(e.target.value) : null })}
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Category</label>
                    <select
                      value={editData.category || ''}
                      onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select category...</option>
                      {PRODUCT_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Product Family</label>
                    <Input
                      value={editData.family || ''}
                      onChange={(e) => setEditData({ ...editData, family: e.target.value })}
                      placeholder="e.g., Enterprise Suite"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Status</label>
                    <select
                      value={editData.status || 'active'}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as ProductStatus })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {PRODUCT_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Image URL</label>
                    <Input
                      value={editData.image_url || ''}
                      onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
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
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <span className="text-2xl font-bold">{formatCurrency(product.list_price)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(product.status)}`}>
                      {PRODUCT_STATUSES.find(s => s.value === product.status)?.label || product.status}
                    </span>
                  </div>

                  {(product.category || product.family) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      <span>
                        {product.category}
                        {product.family && ` / ${product.family}`}
                      </span>
                    </div>
                  )}

                  {product.description && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    Created {new Date(product.created_at).toLocaleDateString()} &middot;
                    Updated {new Date(product.updated_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Price Book Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Price Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              {priceBookEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This product is not in any price books yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {priceBookEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`/price-books/${entry.price_book_id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <span className="font-medium">{entry.price_books.name}</span>
                        <span className="block text-xs text-muted-foreground capitalize">
                          {entry.price_books.type} - {entry.price_books.currency}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(entry.unit_price)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link to="/price-books">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Price Books
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
