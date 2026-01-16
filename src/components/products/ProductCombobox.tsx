import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronsUpDown, Check, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  list_price: number | null
}

interface ProductComboboxProps {
  value: string | null
  onChange: (productId: string | null, product?: Product) => void
  placeholder?: string
  disabled?: boolean
}

export function ProductCombobox({
  value,
  onChange,
  placeholder = 'Select product...',
  disabled = false,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, list_price')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === value)

  const filteredProducts = products.filter((product) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower)
    )
  })

  const formatCurrency = (value: number | null) => {
    if (value === null) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {selectedProduct ? (
          <span className="truncate">
            {selectedProduct.name} ({selectedProduct.sku})
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search ? 'No products found' : 'No products available'}
              </div>
            ) : (
              <div className="p-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent text-left"
                    onClick={() => {
                      onChange(product.id, product)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.sku}
                        {product.list_price && ` - ${formatCurrency(product.list_price)}`}
                      </div>
                    </div>
                    {value === product.id && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
