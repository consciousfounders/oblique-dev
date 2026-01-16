import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CustomFieldManager } from '@/components/custom-fields'
import type { CustomFieldModule } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, Users, UserPlus, DollarSign } from 'lucide-react'

const MODULES: { value: CustomFieldModule; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'accounts', label: 'Accounts', icon: <Building2 className="w-5 h-5" />, description: 'Company and organization records' },
  { value: 'contacts', label: 'Contacts', icon: <Users className="w-5 h-5" />, description: 'Individual people at accounts' },
  { value: 'leads', label: 'Leads', icon: <UserPlus className="w-5 h-5" />, description: 'Potential customers and prospects' },
  { value: 'deals', label: 'Deals', icon: <DollarSign className="w-5 h-5" />, description: 'Sales opportunities and pipeline' },
]

export function CustomFieldSettingsPage() {
  const [activeModule, setActiveModule] = useState<CustomFieldModule>('accounts')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground">
            Add custom fields to capture additional data for your CRM records
          </p>
        </div>
      </div>

      {/* Module Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MODULES.map((module) => (
          <button
            key={module.value}
            onClick={() => setActiveModule(module.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border text-center transition-colors ${
              activeModule === module.value
                ? 'border-primary bg-primary/5 text-primary'
                : 'hover:bg-muted'
            }`}
          >
            {module.icon}
            <span className="font-medium">{module.label}</span>
            <span className="text-xs text-muted-foreground">{module.description}</span>
          </button>
        ))}
      </div>

      {/* Custom Field Manager for Selected Module */}
      <div className="border rounded-lg p-6 bg-card">
        <CustomFieldManager module={activeModule} />
      </div>
    </div>
  )
}
