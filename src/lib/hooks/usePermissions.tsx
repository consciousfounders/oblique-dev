import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth, type UserRole } from './useAuth'

// Permission string type
export type Permission = string

// Role metadata for display
export interface RoleInfo {
  id: UserRole
  label: string
  description: string
}

// All available roles with metadata
export const ROLES: RoleInfo[] = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Full system access, user management, settings'
  },
  {
    id: 'sales_manager',
    label: 'Sales Manager',
    description: 'Team oversight, reporting, pipeline management'
  },
  {
    id: 'ae',
    label: 'Account Executive',
    description: 'Lead/opportunity management, deal creation'
  },
  {
    id: 'am',
    label: 'Account Manager',
    description: 'Existing account management, renewals'
  },
  {
    id: 'sdr',
    label: 'SDR',
    description: 'Sales Development Representative - Lead prospecting'
  }
]

// Get role info by ID
export function getRoleInfo(roleId: UserRole | null): RoleInfo | null {
  if (!roleId) return null
  return ROLES.find(r => r.id === roleId) || null
}

// Permission categories for UI organization
export const PERMISSION_CATEGORIES = {
  users: 'User Management',
  settings: 'Settings',
  teams: 'Teams',
  territories: 'Territories',
  deal_stages: 'Deal Stages',
  assignment_rules: 'Assignment Rules',
  custom_fields: 'Custom Fields',
  enrichment: 'Data Enrichment',
  developer: 'Developer',
  leads: 'Leads',
  contacts: 'Contacts',
  accounts: 'Accounts',
  deals: 'Deals',
  activities: 'Activities',
  reports: 'Reports',
  forecasting: 'Forecasting',
  dashboard: 'Dashboard',
  products: 'Products',
  quotes: 'Quotes',
  campaigns: 'Campaigns',
  forms: 'Web Forms',
  data: 'Data Management'
} as const

interface PermissionsContextType {
  permissions: Set<Permission>
  loading: boolean
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (...permissions: Permission[]) => boolean
  hasAllPermissions: (...permissions: Permission[]) => boolean
  isAdmin: boolean
  isSalesManager: boolean
  canViewTeamData: boolean
  canViewAllData: boolean
  role: UserRole | null
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.role) {
      setPermissions(new Set())
      setLoading(false)
      return
    }

    // Super admins have all permissions
    if (user.isSuperAdmin) {
      fetchAllPermissions()
    } else {
      fetchUserPermissions(user.role)
    }
  }, [user?.role, user?.isSuperAdmin])

  async function fetchUserPermissions(role: UserRole) {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', role)

      if (error) {
        console.error('Error fetching permissions:', error)
        setPermissions(new Set())
      } else {
        setPermissions(new Set(data?.map(p => p.permission) || []))
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      setPermissions(new Set())
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllPermissions() {
    // Super admins get all unique permissions
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', 'admin')

      if (error) {
        console.error('Error fetching permissions:', error)
        setPermissions(new Set())
      } else {
        setPermissions(new Set(data?.map(p => p.permission) || []))
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      setPermissions(new Set())
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permission: Permission): boolean => {
    if (user?.isSuperAdmin) return true
    return permissions.has(permission)
  }

  const hasAnyPermission = (...perms: Permission[]): boolean => {
    if (user?.isSuperAdmin) return true
    return perms.some(p => permissions.has(p))
  }

  const hasAllPermissions = (...perms: Permission[]): boolean => {
    if (user?.isSuperAdmin) return true
    return perms.every(p => permissions.has(p))
  }

  // Computed convenience properties
  const isAdmin = user?.role === 'admin' || user?.isSuperAdmin || false
  const isSalesManager = user?.role === 'sales_manager' || false
  const canViewTeamData = isAdmin || isSalesManager || hasAnyPermission(
    'leads.view_team',
    'contacts.view_team',
    'accounts.view_team',
    'deals.view_team'
  )
  const canViewAllData = isAdmin || hasAnyPermission(
    'leads.view_all',
    'contacts.view_all',
    'accounts.view_all',
    'deals.view_all'
  )

  const value = useMemo(() => ({
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isSalesManager,
    canViewTeamData,
    canViewAllData,
    role: user?.role || null
  }), [permissions, loading, user?.role, user?.isSuperAdmin])

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}

// Higher-order component for permission-based rendering
interface RequirePermissionProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
  children: ReactNode
}

export function RequirePermission({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions) {
    hasAccess = requireAll
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions)
  } else {
    // No permission specified, allow access
    hasAccess = true
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook for checking if current user can access a specific module
export function useModuleAccess(module: keyof typeof PERMISSION_CATEGORIES) {
  const { hasPermission, hasAnyPermission } = usePermissions()

  return {
    canView: hasPermission(`${module}.view`),
    canViewOwn: hasAnyPermission(`${module}.view`, `${module}.view_own`),
    canViewTeam: hasAnyPermission(`${module}.view`, `${module}.view_team`),
    canViewAll: hasAnyPermission(`${module}.view`, `${module}.view_all`),
    canCreate: hasPermission(`${module}.create`),
    canUpdate: hasPermission(`${module}.update`),
    canDelete: hasPermission(`${module}.delete`)
  }
}
