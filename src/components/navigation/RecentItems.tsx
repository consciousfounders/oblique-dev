import * as React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRecentItems } from '@/lib/hooks/useRecentItems'
import type { RecentItem } from '@/lib/hooks/useRecentItems'
import {
  Clock,
  Users,
  Building2,
  Kanban,
  UserCircle,
  CheckSquare,
  X,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const typeIcons = {
  contact: Users,
  account: Building2,
  deal: Kanban,
  lead: UserCircle,
  task: CheckSquare,
}

const typeColors = {
  contact: 'text-blue-500',
  account: 'text-purple-500',
  deal: 'text-green-500',
  lead: 'text-orange-500',
  task: 'text-yellow-500',
}

interface RecentItemsDropdownProps {
  className?: string
}

export function RecentItemsDropdown({ className }: RecentItemsDropdownProps) {
  const { recentItems, removeRecentItem, clearRecentItems } = useRecentItems()

  if (recentItems.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('gap-2', className)}>
          <Clock className="w-4 h-4" />
          Recent
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Recent Items</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={clearRecentItems}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentItems.map((item) => {
          const Icon = typeIcons[item.type]
          const colorClass = typeColors[item.type]
          return (
            <DropdownMenuItem key={`${item.type}-${item.id}`} asChild>
              <div className="flex items-center justify-between w-full">
                <Link
                  to={item.href}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', colorClass)} />
                  <span className="truncate">{item.name}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeRecentItem(item.id, item.type)
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface RecentItemsPanelProps {
  maxItems?: number
  className?: string
}

export function RecentItemsPanel({ maxItems = 5, className }: RecentItemsPanelProps) {
  const { recentItems, clearRecentItems } = useRecentItems()

  if (recentItems.length === 0) {
    return null
  }

  const displayItems = recentItems.slice(0, maxItems)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Items
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={clearRecentItems}
          >
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayItems.map((item) => {
          const Icon = typeIcons[item.type]
          const colorClass = typeColors[item.type]
          return (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.href}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', colorClass)} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{item.type}</div>
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

// Context for tracking recent items across the app
const RecentItemsContext = React.createContext<ReturnType<typeof useRecentItems> | null>(null)

export function RecentItemsProvider({ children }: { children: React.ReactNode }) {
  const recentItems = useRecentItems()

  return (
    <RecentItemsContext.Provider value={recentItems}>
      {children}
    </RecentItemsContext.Provider>
  )
}

export function useRecentItemsContext() {
  const context = React.useContext(RecentItemsContext)
  if (!context) {
    throw new Error('useRecentItemsContext must be used within RecentItemsProvider')
  }
  return context
}

// Hook to automatically track viewing an item
export function useTrackRecentItem(item: Omit<RecentItem, 'timestamp'> | null) {
  const { addRecentItem } = useRecentItems()

  React.useEffect(() => {
    if (item) {
      addRecentItem(item)
    }
  }, [item?.id, item?.type])
}
