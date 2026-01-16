import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCircle,
  Kanban,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  Mail,
  Calendar,
  FolderOpen,
  Clock,
  Code,
  Activity,
  Linkedin,
  Database,
  UsersRound,
  MapPin,
  GitBranch,
  FileText,
  Megaphone,
  Package,
  BookOpen,
  FileCheck,
  TrendingUp,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useCommandPalette } from '@/lib/hooks/useCommandPalette'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/leads', label: 'Leads', icon: UserCircle },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/deals', label: 'Deals', icon: Kanban },
  { href: '/forecasting', label: 'Forecasting', icon: TrendingUp },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/price-books', label: 'Price Books', icon: BookOpen },
  { href: '/quotes', label: 'Quotes', icon: FileCheck },
  { href: '/teams', label: 'Teams', icon: UsersRound },
  { href: '/territories', label: 'Territories', icon: MapPin },
  { href: '/assignment-rules', label: 'Assign Rules', icon: GitBranch },
  { href: '/email', label: 'Email', icon: Mail },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/drive', label: 'Drive', icon: FolderOpen },
  { href: '/booking', label: 'Booking', icon: Clock },
  { href: '/linkedin', label: 'LinkedIn', icon: Linkedin },
  { href: '/data-management', label: 'Data', icon: Database },
  { href: '/forms', label: 'Web Forms', icon: FileText },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
]

export function Sidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Use try-catch since useCommandPalette might not be available if Sidebar is rendered outside CommandPaletteProvider
  let commandPalette: ReturnType<typeof useCommandPalette> | null = null
  try {
    commandPalette = useCommandPalette()
  } catch {
    // CommandPaletteProvider not available, search button will be disabled
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo and Notifications */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <h1 className="text-xl font-bold text-sidebar-foreground">CRM</h1>
        <NotificationBell />
      </div>

      {/* Search Button */}
      {commandPalette && (
        <div className="px-4 pt-4">
          <button
            onClick={commandPalette.open}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}

        {/* Super Admin Link */}
        {user?.isSuperAdmin && (
          <Link
            to="/super-admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              location.pathname.startsWith('/super-admin')
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <Shield className="w-5 h-5" />
            Super Admin
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Link
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            location.pathname === '/settings'
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        <Link
          to="/developer"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            location.pathname.startsWith('/developer')
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          <Code className="w-5 h-5" />
          Developer
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">
          {user?.email}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  )
}
