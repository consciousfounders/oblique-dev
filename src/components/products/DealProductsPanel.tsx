import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductCombobox } from './ProductCombobox'
import { Plus, Trash2, Package, DollarSign, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface DealProduct {
  id: string
  deal_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount_percentage: number
  discount_amount: number
  line_total: number
  description: string | null
  products: {
    id: string
    name: string
    sku: string
  }
}

interface Product {
  id: string
  name: string
  sku: string
  list_price: number | null
}

interface DealProductsPanelProps {
  dealId: string
  onTotalChange?: (total: number) => void
}

export function DealProductsPanel({ dealId, onTotalChange }: DealProductsPanelProps) {
  const [dealProducts, setDealProducts] = useState<DealProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newProduct, setNewProduct] = useState({
    product_id: null as string | null,
    quantity: '1',
    unit_price: '',
    discount_percentage: '0',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDealProducts()
  }, [dealId])

  async function fetchDealProducts() {
    try {
      const { data, error } = await supabase
        .from('deal_products')
        .select('*, products(id, name, sku)')
        .eq('deal_id', dealId)
        .order('created_at')

      if (error) throw error
      setDealProducts(data || [])

      // Calculate and notify total
      const total = (data || []).reduce((sum, dp) => sum + dp.line_total, 0)
      onTotalChange?.(total)
    } catch (error) {
      console.error('Error fetching deal products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  function calculateLineTotal(quantity: number, unitPrice: number, discountPercentage: number): number {
    const subtotal = quantity * unitPrice
    const discountAmount = subtotal * (discountPercentage / 100)
    return subtotal - discountAmount
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()

    if (!newProduct.product_id) {
      toast.error('Please select a product')
      return
    }

    if (!newProduct.unit_price) {
      toast.error('Unit price is required')
      return
    }

    setSaving(true)
    try {
      const quantity = parseFloat(newProduct.quantity) || 1
      const unitPrice = parseFloat(newProduct.unit_price)
      const discountPercentage = parseFloat(newProduct.discount_percentage) || 0
      const lineTotal = calculateLineTotal(quantity, unitPrice, discountPercentage)
      const discountAmount = (quantity * unitPrice) - lineTotal

      const { error } = await supabase.from('deal_products').insert({
        deal_id: dealId,
        product_id: newProduct.product_id,
        quantity,
        unit_price: unitPrice,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        line_total: lineTotal,
        description: newProduct.description.trim() || null,
      })

      if (error) throw error

      toast.success('Product added to deal')
      setShowAdd(false)
      setNewProduct({
        product_id: null,
        quantity: '1',
        unit_price: '',
        discount_percentage: '0',
        description: '',
      })
      fetchDealProducts()
    } catch (error) {
      console.error('Error adding product:', error)
      toast.error('Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  async function removeProduct(id: string, name: string) {
    if (!confirm(`Remove "${name}" from this deal?`)) return

    try {
      const { error } = await supabase
        .from('deal_products')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Product removed')
      setDealProducts(prev => prev.filter(dp => dp.id !== id))

      // Update total
      const remaining = dealProducts.filter(dp => dp.id !== id)
      const total = remaining.reduce((sum, dp) => sum + dp.line_total, 0)
      onTotalChange?.(total)
    } catch (error) {
      console.error('Error removing product:', error)
      toast.error('Failed to remove product')
    }
  }

  function handleProductSelect(productId: string | null, product?: Product) {
    setNewProduct(prev => ({
      ...prev,
      product_id: productId,
      unit_price: product?.list_price?.toString() || prev.unit_price,
    }))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const totalValue = dealProducts.reduce((sum, dp) => sum + dp.line_total, 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-4 h-4" />
          Products
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-2" />
          {showAdd ? 'Cancel' : 'Add Product'}
        </Button>
      </CardHeader>
      <CardContent>
        {showAdd && (
          <form onSubmit={addProduct} className="mb-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Product</label>
              <ProductCombobox
                value={newProduct.product_id}
                onChange={handleProductSelect}
                placeholder="Select a product..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Quantity</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Unit Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProduct.unit_price}
                  onChange={(e) => setNewProduct({ ...newProduct, unit_price: e.target.value })}
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
                  value={newProduct.discount_percentage}
                  onChange={(e) => setNewProduct({ ...newProduct, discount_percentage: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Input
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Adding...' : 'Add Product'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {dealProducts.length === 0 ? (
          <div className="text-center py-6">
            <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No products added to this deal yet.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {dealProducts.map((dp) => (
                <div
                  key={dp.id}
                  className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${dp.product_id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {dp.products.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{dp.products.sku}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span>
                        {dp.quantity} x {formatCurrency(dp.unit_price)}
                      </span>
                      {dp.discount_percentage > 0 && (
                        <span className="text-green-600">
                          -{dp.discount_percentage}%
                        </span>
                      )}
                    </div>
                    {dp.description && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {dp.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(dp.line_total)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(dp.id, dp.products.name)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(totalValue)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
