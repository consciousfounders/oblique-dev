import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  LinkedInSettingsPanel,
  SavedLeadsPanel,
} from '@/components/linkedin'
import { Linkedin, Users, Settings } from 'lucide-react'

type TabId = 'saved-leads' | 'settings'

export function LinkedInPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('saved-leads')

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'saved-leads', label: 'Saved Leads', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ]

  const handleLeadImported = (leadId: string) => {
    navigate(`/leads/${leadId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0A66C2]">
          <Linkedin className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">LinkedIn Sales Navigator</h1>
          <p className="text-muted-foreground">
            Manage your LinkedIn integration and saved leads
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-4xl">
        {activeTab === 'saved-leads' && (
          <SavedLeadsPanel
            title="Saved Leads from LinkedIn"
            onLeadImported={handleLeadImported}
          />
        )}

        {activeTab === 'settings' && (
          <LinkedInSettingsPanel />
        )}
      </div>
    </div>
  )
}
