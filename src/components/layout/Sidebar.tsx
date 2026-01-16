import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePermissions } from '@/lib/hooks/usePermissions'
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
  BarChart3,
  PieChart,
  Workflow,
  CheckSquare,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useCommandPalette } from '@/lib/hooks/useCommandPalette'

// Navigation items with optional permission requirements
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare, permission: 'tasks.view' },
  { href: '/activity', label: 'Activity', icon: Activity, permission: 'activities.view' },
  { href: '/leads', label: 'Leads', icon: UserCircle, permission: 'leads.view' },
  { href: '/contacts', label: 'Contacts', icon: Users, permission: 'contacts.view' },
  { href: '/accounts', label: 'Accounts', icon: Building2, permission: 'accounts.view' },
  { href: '/deals', label: 'Deals', icon: Kanban, permission: 'deals.view' },
  { href: '/pipelines', label: 'Pipelines', icon: Workflow, permission: 'deals.view' },
  { href: '/forecasting', label: 'Forecasting', icon: TrendingUp, permission: 'forecasting.view' },
  { href: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
  { href: '/dashboards', label: 'Dashboards', icon: PieChart, permission: 'dashboards.view' },
  { href: '/products', label: 'Products', icon: Package, permission: 'products.view' },
  { href: '/price-books', label: 'Price Books', icon: BookOpen, permission: 'products.view' },
  { href: '/quotes', label: 'Quotes', icon: FileCheck, permission: 'quotes.view' },
  { href: '/teams', label: 'Teams', icon: UsersRound, permission: 'teams.view' },
  { href: '/territories', label: 'Territories', icon: MapPin, permission: 'territories.view' },
  { href: '/assignment-rules', label: 'Assign Rules', icon: GitBranch, permission: 'assignment_rules.view' },
  { href: '/email', label: 'Email', icon: Mail },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/drive', label: 'Drive', icon: FolderOpen },
  { href: '/booking', label: 'Booking', icon: Clock },
  { href: '/linkedin', label: 'LinkedIn', icon: Linkedin },
  { href: '/data-management', label: 'Data', icon: Database, permission: 'data.import' },
  { href: '/forms', label: 'Web Forms', icon: FileText, permission: 'forms.view' },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone, permission: 'campaigns.view' },
]

interface SidebarProps {
  onQuickSearch?: () => void
}

export function Sidebar({ onQuickSearch: _onQuickSearch }: SidebarProps) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { hasPermission, isAdmin } = usePermissions()
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
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => {
            // Items without permission are always shown
            if (!item.permission) return true
            // Super admins and admins see everything
            if (user?.isSuperAdmin || isAdmin) return true
            // Check specific permission
            return hasPermission(item.permission)
          })
          .map((item) => {
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
        {(hasPermission('developer.view') || user?.isSuperAdmin || isAdmin) && (
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
        )}
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
