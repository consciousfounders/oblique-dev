import { useState, useCallback, useEffect } from 'react'
import { Search, Phone, Mail, X, User } from 'lucide-react'
import { useOfflineData } from '@/lib/hooks/useOfflineData'
import { usePWA } from '@/lib/hooks/usePWA'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
}

interface QuickContactSearchProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickContactSearch({ isOpen, onClose }: QuickContactSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Contact[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { searchCached } = useOfflineData('contacts')
  const { isOnline } = usePWA()

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([])
        return
      }

      setIsSearching(true)
      try {
        const cached = await searchCached(searchQuery)
        setResults(cached.slice(0, 10) as unknown as Contact[])
      } finally {
        setIsSearching(false)
      }
    },
    [searchCached]
  )

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(query)
    }, 300)

    return () => clearTimeout(debounce)
  }, [query, handleSearch])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full h-12 pl-10 pr-4 bg-muted rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={onClose}
          className="w-12 h-12 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-sm">
          Searching offline data only
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {isSearching ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            Searching...
          </div>
        ) : results.length === 0 && query.length >= 2 ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <User className="w-12 h-12 mb-2 opacity-50" />
            <p>No contacts found</p>
          </div>
        ) : (
          <ul className="divide-y">
            {results.map((contact) => (
              <li key={contact.id} className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary">
                    {contact.first_name?.[0]}
                    {contact.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.company && (
                    <p className="text-sm text-muted-foreground truncate">{contact.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {contact.phone && (
                    <button
                      onClick={() => handleCall(contact.phone!)}
                      className={cn(
                        'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                        'bg-green-100 text-green-600 active:bg-green-200',
                        'dark:bg-green-900/30 dark:text-green-400 dark:active:bg-green-900/50'
                      )}
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  )}
                  {contact.email && (
                    <button
                      onClick={() => handleEmail(contact.email!)}
                      className={cn(
                        'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                        'bg-blue-100 text-blue-600 active:bg-blue-200',
                        'dark:bg-blue-900/30 dark:text-blue-400 dark:active:bg-blue-900/50'
                      )}
                    >
                      <Mail className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
