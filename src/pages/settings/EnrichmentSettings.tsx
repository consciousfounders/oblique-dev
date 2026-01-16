import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EnrichmentSettingsPanel } from '@/components/enrichment'
import { ArrowLeft } from 'lucide-react'

export function EnrichmentSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link to="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
      </div>

      <EnrichmentSettingsPanel />
    </div>
  )
}
