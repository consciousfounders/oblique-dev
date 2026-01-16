import { NavLink } from 'react-router-dom'
import { Home, Users, Briefcase, CheckSquare, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileDetect } from '@/lib/hooks/useMobileDetect'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

const navItems: NavItem[] = [
  { to: '/', icon: <Home className="w-5 h-5" />, label: 'Home' },
  { to: '/contacts', icon: <Users className="w-5 h-5" />, label: 'Contacts' },
  { to: '/deals', icon: <Briefcase className="w-5 h-5" />, label: 'Deals' },
  { to: '/tasks', icon: <CheckSquare className="w-5 h-5" />, label: 'Tasks' },
]

interface MobileBottomNavProps {
  onMenuClick?: () => void
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const { isMobile, isStandalone } = useMobileDetect()

  if (!isMobile) {
    return null
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-background border-t z-40 md:hidden',
        isStandalone && 'pb-safe'
      )}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs text-muted-foreground transition-colors active:text-primary"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  )
}
