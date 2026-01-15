import { useState } from 'react'
import { useActivities, type ActivityType, ACTIVITY_TYPES } from '@/lib/hooks/useActivities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mail,
  Calendar,
  Phone,
  FileText,
  TrendingUp,
  CheckSquare,
  Plus,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  meeting: Calendar,
  call: Phone,
  note: FileText,
  deal_update: TrendingUp,
  task: CheckSquare,
}

const ACTIVITY_COLORS: Record<string, string> = {
  email: 'bg-blue-500 hover:bg-blue-600',
  meeting: 'bg-purple-500 hover:bg-purple-600',
  call: 'bg-green-500 hover:bg-green-600',
  note: 'bg-amber-500 hover:bg-amber-600',
  deal_update: 'bg-pink-500 hover:bg-pink-600',
  task: 'bg-cyan-500 hover:bg-cyan-600',
}

interface ActivityFormProps {
  entityType: string
  entityId: string
  onActivityAdded?: () => void
}

export function ActivityForm({ entityType, entityId, onActivityAdded }: ActivityFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<ActivityType>('note')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { addActivity } = useActivities({ entityType, entityId })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) return

    setSubmitting(true)
    try {
      const result = await addActivity({
        entity_type: entityType,
        entity_id: entityId,
        activity_type: selectedType,
        subject: subject.trim(),
        description: description.trim() || null,
      })

      if (result) {
        setSubject('')
        setDescription('')
        setShowForm(false)
        onActivityAdded?.()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setSubject('')
    setDescription('')
    setSelectedType('note')
  }

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Log Activity
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Log Activity</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 w-8 p-0">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map(({ value, label }) => {
              const Icon = ACTIVITY_ICONS[value]
              const isSelected = selectedType === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedType(value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                    isSelected
                      ? `${ACTIVITY_COLORS[value]} text-white`
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              )
            })}
          </div>

          <Input
            placeholder="Subject *"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            autoFocus
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !subject.trim()}>
              {submitting ? 'Saving...' : 'Save Activity'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
