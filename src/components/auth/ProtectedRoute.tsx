import { Navigate } from 'react-router-dom'
import { usePermissions, type Permission } from '@/lib/hooks/usePermissions'
import { useAuth } from '@/lib/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  requireAdmin?: boolean
  redirectTo?: string
}

/**
 * A component that protects routes based on user permissions.
 *
 * Usage:
 * - Single permission: <ProtectedRoute permission="users.view">...</ProtectedRoute>
 * - Multiple permissions (any): <ProtectedRoute permissions={['leads.view', 'deals.view']}>...</ProtectedRoute>
 * - Multiple permissions (all): <ProtectedRoute permissions={['leads.view', 'leads.create']} requireAll>...</ProtectedRoute>
 * - Admin only: <ProtectedRoute requireAdmin>...</ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  permission,
  permissions,
  requireAll = false,
  requireAdmin = false,
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, loading: permLoading } = usePermissions()

  // Show loading while auth/permissions are loading
  if (authLoading || permLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Require authentication
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Super admins have access to everything
  if (user.isSuperAdmin) {
    return <>{children}</>
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to={redirectTo} replace />
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <Navigate to={redirectTo} replace />
  }

  // Check multiple permissions
  if (permissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions)

    if (!hasAccess) {
      return <Navigate to={redirectTo} replace />
    }
  }

  return <>{children}</>
}

/**
 * A component that shows access denied message instead of redirecting.
 */
export function AccessDenied({ message = 'You do not have permission to access this page.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  )
}
