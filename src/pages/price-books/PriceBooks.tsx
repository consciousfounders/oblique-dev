import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, BookOpen, MoreHorizontal, Pencil, Trash2, Star } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { PriceBookType } from '@/lib/supabase'

interface PriceBook {
  id: string
  name: string
  type: PriceBookType
  description: string | null
  is_active: boolean
  is_default: boolean
  currency: string
  created_at: string
  entry_count?: number
}

const PRICE_BOOK_TYPES: { value: PriceBookType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'partner', label: 'Partner' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'custom', label: 'Custom' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
]

export function PriceBooksPage() {
  const { user } = useAuth()
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [newPriceBook, setNewPriceBook] = useState({
    name: '',
    type: 'standard' as PriceBookType,
    description: '',
    is_active: true,
    is_default: false,
    currency: 'USD',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchPriceBooks()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchPriceBooks() {
    try {
      const { data, error } = await supabase
        .from('price_books')
        .select('*, price_book_entries(count)')
        .order('is_default', { ascending: false })
        .order('name')

      if (error) throw error

      const booksWithCount = (data || []).map(book => ({
        ...book,
        entry_count: book.price_book_entries?.[0]?.count || 0,
      }))

      setPriceBooks(booksWithCount)
    } catch (error) {
      console.error('Error fetching price books:', error)
      toast.error('Failed to load price books')
    } finally {
      setLoading(false)
    }
  }

  async function createPriceBook(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) {
      toast.error('No tenant assigned')
      return
    }

    if (!newPriceBook.name.trim()) {
      toast.error('Price book name is required')
      return
    }

    try {
      // If setting as default, unset other defaults first
      if (newPriceBook.is_default) {
        await supabase
          .from('price_books')
          .update({ is_default: false })
          .eq('is_default', true)
      }

      const { error } = await supabase.from('price_books').insert({
        tenant_id: user.tenantId,
        name: newPriceBook.name.trim(),
        type: newPriceBook.type,
        description: newPriceBook.description.trim() || null,
        is_active: newPriceBook.is_active,
        is_default: newPriceBook.is_default,
        currency: newPriceBook.currency,
      })

      if (error) throw error

      toast.success('Price book created successfully')
      setShowCreate(false)
      setNewPriceBook({
        name: '',
        type: 'standard',
        description: '',
        is_active: true,
        is_default: false,
        currency: 'USD',
      })
      fetchPriceBooks()
    } catch (error) {
      console.error('Error creating price book:', error)
      toast.error('Failed to create price book')
    }
  }

  async function deletePriceBook(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all price entries.`)) return

    try {
      const { error } = await supabase.from('price_books').delete().eq('id', id)
      if (error) throw error
      toast.success('Price book deleted')
      setPriceBooks(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting price book:', error)
      toast.error('Failed to delete price book')
    }
  }

  async function setAsDefault(id: string) {
    try {
      // Unset all defaults first
      await supabase
        .from('price_books')
        .update({ is_default: false })
        .eq('is_default', true)

      // Set new default
      const { error } = await supabase
        .from('price_books')
        .update({ is_default: true })
        .eq('id', id)

      if (error) throw error

      toast.success('Default price book updated')
      fetchPriceBooks()
    } catch (error) {
      console.error('Error setting default:', error)
      toast.error('Failed to set default price book')
    }
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

  const filteredPriceBooks = priceBooks.filter((book) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      book.name.toLowerCase().includes(searchLower) ||
      book.description?.toLowerCase().includes(searchLower) ||
      book.type.toLowerCase().includes(searchLower)
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
          <h1 className="text-2xl font-bold">Price Books</h1>
          <p className="text-muted-foreground">
            {filteredPriceBooks.length} price book{filteredPriceBooks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-2" />
          {showCreate ? 'Cancel' : 'Add Price Book'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search price books..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Price Book</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createPriceBook} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="Enter price book name"
                    value={newPriceBook.name}
                    onChange={(e) => setNewPriceBook({ ...newPriceBook, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Type</label>
                  <select
                    value={newPriceBook.type}
                    onChange={(e) => setNewPriceBook({ ...newPriceBook, type: e.target.value as PriceBookType })}
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
                    value={newPriceBook.currency}
                    onChange={(e) => setNewPriceBook({ ...newPriceBook, currency: e.target.value })}
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
                      checked={newPriceBook.is_active}
                      onChange={(e) => setNewPriceBook({ ...newPriceBook, is_active: e.target.checked })}
                      className="rounded border-input"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newPriceBook.is_default}
                      onChange={(e) => setNewPriceBook({ ...newPriceBook, is_default: e.target.checked })}
                      className="rounded border-input"
                    />
                    <span className="text-sm">Default</span>
                  </label>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea
                    placeholder="Price book description..."
                    value={newPriceBook.description}
                    onChange={(e) => setNewPriceBook({ ...newPriceBook, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit">Create Price Book</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Price Books List */}
      {filteredPriceBooks.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {search
              ? 'No price books match your search'
              : 'No price books yet. Create your first price book to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPriceBooks.map(book => (
            <Card key={book.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link to={`/price-books/${book.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{book.name}</h3>
                      {book.is_default && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(book.type)}`}>
                        {PRICE_BOOK_TYPES.find(t => t.value === book.type)?.label || book.type}
                      </span>
                      <span className="text-xs text-muted-foreground">{book.currency}</span>
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
                        <Link to={`/price-books/${book.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {!book.is_default && (
                        <DropdownMenuItem onClick={() => setAsDefault(book.id)}>
                          <Star className="mr-2 h-4 w-4" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => deletePriceBook(book.id, book.name)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {book.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {book.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>{book.entry_count} product{book.entry_count !== 1 ? 's' : ''}</span>
                  <span className={book.is_active ? 'text-green-600' : 'text-gray-400'}>
                    {book.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
