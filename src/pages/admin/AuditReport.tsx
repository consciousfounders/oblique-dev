import { useState, useCallback, useEffect } from 'react'
import { useAuditExport } from '@/lib/hooks/useAuditLog'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  type AuditOperation,
  type AuditEntityType,
  AUDIT_ENTITY_TYPES,
  AUDIT_OPERATION_COLORS,
} from '@/lib/supabase'
import { AuditLogTimeline } from '@/components/audit/AuditLogTimeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Shield,
  AlertTriangle,
  Download,
  Filter,
  Users,
  BarChart3,
} from 'lucide-react'

interface UserOption {
  id: string
  full_name: string | null
  email: string
}

export function AuditReportPage() {
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const { exportUserData, exporting } = useAuditExport()

  // Filter state
  const [selectedEntityType, setSelectedEntityType] = useState<AuditEntityType | 'all'>('all')
  const [selectedOperation, setSelectedOperation] = useState<AuditOperation | 'all'>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [users, setUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Stats
  const [stats, setStats] = useState({
    totalLogs: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
    usersActive: 0,
  })

  // Fetch users for filter dropdown
  useEffect(() => {
    async function fetchUsers() {
      if (!user?.tenantId) return

      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('tenant_id', user.tenantId)
        .order('full_name')

      if (data) {
        setUsers(data)
      }
      setLoadingUsers(false)
    }

    fetchUsers()
  }, [user?.tenantId])

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      if (!user?.tenantId) return

      // Get total count
      const { count: totalCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId)

      // Get counts by operation
      const { data: opCounts } = await supabase
        .from('audit_logs')
        .select('operation')
        .eq('tenant_id', user.tenantId)

      let creates = 0
      let updates = 0
      let deletes = 0

      opCounts?.forEach(log => {
        if (log.operation === 'create') creates++
        else if (log.operation === 'update') updates++
        else if (log.operation === 'delete') deletes++
      })

      // Get unique users count
      const { data: uniqueUsers } = await supabase
        .from('audit_logs')
        .select('user_id')
        .eq('tenant_id', user.tenantId)
        .not('user_id', 'is', null)

      const uniqueUserIds = new Set(uniqueUsers?.map(u => u.user_id))

      setStats({
        totalLogs: totalCount || 0,
        creates,
        updates,
        deletes,
        usersActive: uniqueUserIds.size,
      })
    }

    fetchStats()
  }, [user?.tenantId])

  const handleExportAll = useCallback(async () => {
    if (!user?.tenantId) return

    // Export all audit logs as JSON
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Export error:', error)
      return
    }

    // Create download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [user?.tenantId])

  const handleExportUserActivity = useCallback(async () => {
    if (selectedUserId === 'all') return

    const data = await exportUserData(selectedUserId)
    if (!data) return

    // Create download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user-activity-export-${selectedUserId}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [selectedUserId, exportUserData])

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access the audit report.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            Audit Report
          </h1>
          <p className="text-muted-foreground">View all changes across your CRM</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportAll} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Changes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${AUDIT_OPERATION_COLORS.create.bg}`} />
              <div>
                <p className="text-2xl font-bold">{stats.creates.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${AUDIT_OPERATION_COLORS.update.bg}`} />
              <div>
                <p className="text-2xl font-bold">{stats.updates.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${AUDIT_OPERATION_COLORS.delete.bg}`} />
              <div>
                <p className="text-2xl font-bold">{stats.deletes.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Deleted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.usersActive}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select
                value={selectedEntityType}
                onValueChange={(v) => setSelectedEntityType(v as AuditEntityType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {AUDIT_ENTITY_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Operation</label>
              <Select
                value={selectedOperation}
                onValueChange={(v) => setSelectedOperation(v as AuditOperation | 'all')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="create">Created</SelectItem>
                  <SelectItem value="update">Updated</SelectItem>
                  <SelectItem value="delete">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportUserActivity}
                  disabled={selectedUserId === 'all' || exporting}
                  className="flex-1"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-1" />
                      Export User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Timeline */}
      <AuditLogTimeline
        entityType={selectedEntityType !== 'all' ? selectedEntityType : undefined}
        userId={selectedUserId !== 'all' ? selectedUserId : undefined}
        operations={selectedOperation !== 'all' ? [selectedOperation] : undefined}
        title="Change History"
        showFilters={false}
        showEntityLinks
        groupByDate
        maxHeight="calc(100vh - 500px)"
      />
    </div>
  )
}
