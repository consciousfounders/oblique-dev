import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { User, ChevronDown, Search, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  account_id: string | null
}

interface ContactComboboxProps {
  value: string | null
  onChange: (contactId: string | null) => void
  accountId?: string | null
  placeholder?: string
}

export function ContactCombobox({ value, onChange, accountId, placeholder = 'Select contact...' }: ContactComboboxProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedContact = contacts.find(c => c.id === value)

  useEffect(() => {
    if (user?.tenantId) {
      fetchContacts()
    }
  }, [user?.tenantId, accountId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchContacts() {
    setLoading(true)
    try {
      let query = supabase
        .from('contacts')
        .select('id, first_name, last_name, email, account_id')
        .order('first_name', { ascending: true })

      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data, error } = await query

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase()
    const searchLower = search.toLowerCase()
    return fullName.includes(searchLower) || contact.email?.toLowerCase().includes(searchLower)
  })

  const handleSelect = (contact: Contact) => {
    onChange(contact.id)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const getContactDisplayName = (contact: Contact) => {
    return `${contact.first_name}${contact.last_name ? ' ' + contact.last_name : ''}`
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0)
          }
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedContact && "text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <User className="h-4 w-4 shrink-0" />
          {selectedContact ? getContactDisplayName(selectedContact) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedContact && (
            <X
              className="h-4 w-4 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading contacts...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search ? 'No contacts found' : accountId ? 'No contacts for this account' : 'No contacts available'}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelect(contact)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    contact.id === value && "bg-accent"
                  )}
                >
                  <Check className={cn("h-4 w-4", contact.id === value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col items-start">
                    <span>{getContactDisplayName(contact)}</span>
                    {contact.email && (
                      <span className="text-xs text-muted-foreground">{contact.email}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
