import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityTimeline } from '@/components/activity'
import { TodaysTasksWidget } from '@/components/tasks'
import { useAuth } from '@/lib/hooks/useAuth'
import { Users, Building2, UserCircle, DollarSign } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    { label: 'Total Leads', value: '0', icon: UserCircle, color: 'text-blue-500' },
    { label: 'Contacts', value: '0', icon: Users, color: 'text-green-500' },
    { label: 'Accounts', value: '0', icon: Building2, color: 'text-purple-500' },
    { label: 'Pipeline Value', value: '$0', icon: DollarSign, color: 'text-amber-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground">Here's what's happening with your sales</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActivityTimeline
          title="Recent Activity"
          showFilters={true}
          groupByDate={true}
          maxHeight="400px"
          emptyMessage="No recent activity"
        />

        <TodaysTasksWidget />
      </div>
    </div>
  )
}
