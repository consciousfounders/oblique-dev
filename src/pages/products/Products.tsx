import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Package, DollarSign, Tag, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { ProductStatus } from '@/lib/supabase'

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

export function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProductStatus | ''>('')
  const [filterCategory, setFilterCategory] = useState('')
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    family: '',
    status: 'active' as ProductStatus,
    list_price: '',
    image_url: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchProducts()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) {
      toast.error('No tenant assigned')
      return
    }

    if (!newProduct.name.trim()) {
      toast.error('Product name is required')
      return
    }

    if (!newProduct.sku.trim()) {
      toast.error('SKU is required')
      return
    }

    try {
      const { error } = await supabase.from('products').insert({
        tenant_id: user.tenantId,
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim().toUpperCase(),
        description: newProduct.description.trim() || null,
        category: newProduct.category || null,
        family: newProduct.family.trim() || null,
        status: newProduct.status,
        list_price: newProduct.list_price ? parseFloat(newProduct.list_price) : null,
        image_url: newProduct.image_url.trim() || null,
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('A product with this SKU already exists')
          return
        }
        throw error
      }

      toast.success('Product created successfully')
      setShowCreate(false)
      setNewProduct({
        name: '',
        sku: '',
        description: '',
        category: '',
        family: '',
        status: 'active',
        list_price: '',
        image_url: '',
      })
      fetchProducts()
    } catch (error) {
      console.error('Error creating product:', error)
      toast.error('Failed to create product')
    }
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      toast.success('Product deleted')
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Failed to delete product')
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

  const filteredProducts = products.filter((product) => {
    if (filterStatus && product.status !== filterStatus) return false
    if (filterCategory && product.category !== filterCategory) return false
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower) ||
      product.family?.toLowerCase().includes(searchLower)
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
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-2" />
          {showCreate ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name, SKU, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ProductStatus | '')}
          className="flex h-10 w-full sm:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          {PRODUCT_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="flex h-10 w-full sm:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {PRODUCT_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createProduct} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">
                    Product Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Enter product name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    SKU <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="PRD-001"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
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
                    placeholder="e.g., Enterprise Suite"
                    value={newProduct.family}
                    onChange={(e) => setNewProduct({ ...newProduct, family: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Status</label>
                  <select
                    value={newProduct.status}
                    onChange={(e) => setNewProduct({ ...newProduct, status: e.target.value as ProductStatus })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {PRODUCT_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">List Price</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newProduct.list_price}
                    onChange={(e) => setNewProduct({ ...newProduct, list_price: e.target.value })}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Image URL</label>
                  <Input
                    placeholder="https://..."
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea
                    placeholder="Product description..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit">Create Product</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {search || filterStatus || filterCategory
              ? 'No products match your filters'
              : 'No products yet. Create your first product to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map(product => (
            <Card key={product.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link to={`/products/${product.id}`} className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/products/${product.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteProduct(product.id, product.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{formatCurrency(product.list_price)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                      {PRODUCT_STATUSES.find(s => s.value === product.status)?.label || product.status}
                    </span>
                  </div>
                  {product.category && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="w-3 h-3" />
                      <span>{product.category}</span>
                      {product.family && <span>/ {product.family}</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
