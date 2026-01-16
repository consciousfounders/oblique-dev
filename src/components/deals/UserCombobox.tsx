import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { User, ChevronDown, Search, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TenantUser {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface UserComboboxProps {
  value: string | null
  onChange: (userId: string | null) => void
  placeholder?: string
}

export function UserCombobox({ value, onChange, placeholder = 'Select owner...' }: UserComboboxProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedUser = users.find(u => u.id === value)

  useEffect(() => {
    if (user?.tenantId) {
      fetchUsers()
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

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const searchLower = search.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    )
  })

  const handleSelect = (tenantUser: TenantUser) => {
    onChange(tenantUser.id)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const getUserDisplayName = (tenantUser: TenantUser) => {
    return tenantUser.full_name || tenantUser.email
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
          !selectedUser && "text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <User className="h-4 w-4 shrink-0" />
          {selectedUser ? getUserDisplayName(selectedUser) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedUser && (
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
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((tenantUser) => (
                <button
                  key={tenantUser.id}
                  type="button"
                  onClick={() => handleSelect(tenantUser)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                    tenantUser.id === value && "bg-accent"
                  )}
                >
                  <Check className={cn("h-4 w-4", tenantUser.id === value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col items-start">
                    <span>{getUserDisplayName(tenantUser)}</span>
                    {tenantUser.full_name && (
                      <span className="text-xs text-muted-foreground">{tenantUser.email}</span>
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
