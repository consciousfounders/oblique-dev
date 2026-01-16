// Workflows Page
// Main page for managing workflow automations

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WorkflowList } from '@/components/workflows'
import { WorkflowExecutionHistory } from '@/components/workflows'
import { useWorkflows } from '@/lib/hooks/useWorkflows'
import { WORKFLOW_ENTITY_TYPES, WORKFLOW_TRIGGER_TYPES } from '@/lib/supabase'

export function WorkflowsPage() {
  const navigate = useNavigate()
  const {
    workflows,
    loading,
    error,
    executionStats,
    toggleWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    loadExecutionStats,
  } = useWorkflows()

  const [searchTerm, setSearchTerm] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [triggerFilter, setTriggerFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('workflows')

  // Load stats when switching to stats tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'history') {
      loadExecutionStats()
    }
  }

  // Filter workflows
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesEntity = entityFilter === 'all' || workflow.entity_type === entityFilter
    const matchesTrigger = triggerFilter === 'all' || workflow.trigger_type === triggerFilter
    return matchesSearch && matchesEntity && matchesTrigger
  })

  const activeWorkflows = workflows.filter(w => w.is_active).length
  const inactiveWorkflows = workflows.filter(w => !w.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Workflow Automation
          </h1>
          <p className="text-muted-foreground">
            Automate tasks and actions based on CRM events
          </p>
        </div>
        <Button onClick={() => navigate('/workflows/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{workflows.length}</div>
            <p className="text-sm text-muted-foreground">Total Workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeWorkflows}</div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-500">{inactiveWorkflows}</div>
            <p className="text-sm text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {executionStats.completed}
            </div>
            <p className="text-sm text-muted-foreground">Executions (All Time)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {WORKFLOW_ENTITY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trigger Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                {WORKFLOW_TRIGGER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workflow List */}
          {loading ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <WorkflowList
              workflows={filteredWorkflows}
              onToggle={toggleWorkflow}
              onDelete={deleteWorkflow}
              onDuplicate={async (id) => {
                await duplicateWorkflow(id)
              }}
            />
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <WorkflowExecutionHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default WorkflowsPage
