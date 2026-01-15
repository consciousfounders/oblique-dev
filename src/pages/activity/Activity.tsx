import { ActivityTimeline } from '@/components/activity'
import { useAuth } from '@/lib/hooks/useAuth'

export function ActivityPage() {
  const { user } = useAuth()

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Timeline</h1>
        <p className="text-muted-foreground">
          All activities across your leads, contacts, accounts, and deals
        </p>
      </div>

      <ActivityTimeline
        title="All Activity"
        showFilters={true}
        groupByDate={true}
        maxHeight="calc(100vh - 250px)"
        emptyMessage="No activities recorded yet. Start by logging activities on your leads, contacts, accounts, or deals."
      />
    </div>
  )
}
