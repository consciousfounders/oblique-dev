// Data Management page - Import/Export and bulk operations hub

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Upload,
  Download,
  Database,
  Users,
  UserCircle,
  Building2,
  Kanban,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImportDialog } from '@/components/data-management/ImportDialog'
import { ExportDialog } from '@/components/data-management/ExportDialog'
import { BulkOperationsPanel } from '@/components/data-management/BulkOperationsPanel'
import type { DataEntityType } from '@/lib/data-management/types'

interface EntityStats {
  contacts: number
  leads: number
  accounts: number
  deals: number
}

interface EntityRecord {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  company?: string
  created_at: string
}

const ENTITY_CONFIG: Record<DataEntityType, {
  label: string
  icon: typeof Users
  displayField: (record: EntityRecord) => string
}> = {
  contacts: {
    label: 'Contacts',
    icon: Users,
    displayField: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unnamed Contact',
  },
  leads: {
    label: 'Leads',
    icon: UserCircle,
    displayField: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unnamed Lead',
  },
  accounts: {
    label: 'Accounts',
    icon: Building2,
    displayField: (r) => r.name || 'Unnamed Account',
  },
  deals: {
    label: 'Deals',
    icon: Kanban,
    displayField: (r) => r.name || 'Unnamed Deal',
  },
}

export function DataManagementPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<EntityStats>({ contacts: 0, leads: 0, accounts: 0, deals: 0 })
  const [selectedEntity, setSelectedEntity] = useState<DataEntityType>('contacts')
  const [records, setRecords] = useState<EntityRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Fetch stats
  useEffect(() => {
    if (user?.tenantId) {
      fetchStats()
    }
  }, [user?.tenantId])

  // Fetch records when entity changes
  useEffect(() => {
    if (user?.tenantId) {
      fetchRecords()
    }
  }, [user?.tenantId, selectedEntity])

  async function fetchStats() {
    if (!user?.tenantId) return

    try {
      const [contactsRes, leadsRes, accountsRes, dealsRes] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenantId),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenantId),
        supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenantId),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenantId),
      ])

      setStats({
        contacts: contactsRes.count || 0,
        leads: leadsRes.count || 0,
        accounts: accountsRes.count || 0,
        deals: dealsRes.count || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  async function fetchRecords() {
    if (!user?.tenantId) return

    setLoading(true)
    setSelectedIds([])

    try {
      const { data, error } = await supabase
        .from(selectedEntity)
        .select('*')
        .eq('tenant_id', user.tenantId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setRecords(data || [])
    } catch (error) {
      console.error('Error fetching records:', error)
      toast.error('Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRecords.map(r => r.id))
    }
  }

  const handleSelectRecord = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleOperationComplete = () => {
    fetchRecords()
    fetchStats()
    setSelectedIds([])
    toast.success('Operation completed')
  }

  const filteredRecords = records.filter(record => {
    const searchLower = search.toLowerCase()
    const config = ENTITY_CONFIG[selectedEntity]
    const displayText = config.displayField(record).toLowerCase()
    return displayText.includes(searchLower) ||
           record.email?.toLowerCase().includes(searchLower) ||
           record.company?.toLowerCase().includes(searchLower)
  })

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">Import, export, and manage your CRM data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(ENTITY_CONFIG) as [DataEntityType, typeof ENTITY_CONFIG.contacts][]).map(([entity, config]) => {
          const Icon = config.icon
          const isSelected = selectedEntity === entity
          return (
            <Card
              key={entity}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => setSelectedEntity(entity)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats[entity].toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bulk Operations Panel */}
      <BulkOperationsPanel
        entityType={selectedEntity}
        selectedIds={selectedIds}
        onOperationComplete={handleOperationComplete}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Records List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{ENTITY_CONFIG[selectedEntity].label}</CardTitle>
              <CardDescription>
                {filteredRecords.length} records {search && `matching "${search}"`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={fetchRecords} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${ENTITY_CONFIG[selectedEntity].label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? 'No records match your search' : `No ${ENTITY_CONFIG[selectedEntity].label.toLowerCase()} yet`}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import {ENTITY_CONFIG[selectedEntity].label}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Select all header */}
              <div
                className="flex items-center gap-3 p-2 rounded-md bg-muted/50 cursor-pointer"
                onClick={handleSelectAll}
              >
                {selectedIds.length === filteredRecords.length ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {selectedIds.length === filteredRecords.length
                    ? 'Deselect all'
                    : 'Select all'
                  }
                </span>
                {selectedIds.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({selectedIds.length} selected)
                  </span>
                )}
              </div>

              {/* Records */}
              {filteredRecords.map(record => {
                const config = ENTITY_CONFIG[selectedEntity]
                const isSelected = selectedIds.includes(record.id)
                return (
                  <div
                    key={record.id}
                    className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectRecord(record.id)}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {config.displayField(record)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {record.email || record.company || `Created ${new Date(record.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                )
              })}

              {records.length > filteredRecords.length && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Showing {filteredRecords.length} of {records.length} records
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        entityType={selectedEntity}
        onSuccess={() => {
          fetchRecords()
          fetchStats()
        }}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        entityType={selectedEntity}
      />
    </div>
  )
}
