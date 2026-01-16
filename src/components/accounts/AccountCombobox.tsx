import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Building2, ChevronDown, Search, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Account {
  id: string
  name: string
  domain: string | null
}

interface AccountComboboxProps {
  value: string | null
  onChange: (accountId: string | null, accountName?: string) => void
  placeholder?: string
  excludeId?: string
}

export function AccountCombobox({ value, onChange, placeholder = 'Select account...', excludeId }: AccountComboboxProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedAccount = accounts.find(a => a.id === value)

  useEffect(() => {
    if (user?.tenantId) {
      fetchAccounts()
    }
  }, [user?.tenantId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchAccounts() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, domain')
        .order('name', { ascending: true })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts
    .filter(account => {
      // Exclude current account from selection (for parent account selection)
      if (excludeId && account.id === excludeId) return false

      return (
        account.name.toLowerCase().includes(search.toLowerCase()) ||
        account.domain?.toLowerCase().includes(search.toLowerCase())
      )
    })

  const handleSelect = (account: Account) => {
    onChange(account.id, account.name)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
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
          !selectedAccount && "text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0" />
          {selectedAccount ? selectedAccount.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedAccount && (
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
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading accounts...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search ? 'No accounts found' : 'No accounts available'}
              </div>
            ) : (
              filteredAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleSelect(account)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    account.id === value && "bg-accent"
                  )}
                >
                  <Check className={cn("h-4 w-4", account.id === value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col items-start">
                    <span>{account.name}</span>
                    {account.domain && (
                      <span className="text-xs text-muted-foreground">{account.domain}</span>
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
