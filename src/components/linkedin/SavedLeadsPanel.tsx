import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSavedLeads } from '@/lib/hooks/useLinkedIn'
import type { LinkedInSavedLead } from '@/lib/supabase'
import {
  Users,
  UserPlus,
  ExternalLink,
  Building2,
  MapPin,
  Star,
  Loader2,
  Trash2,
  Check,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'

interface SavedLeadsPanelProps {
  title?: string
  onLeadImported?: (leadId: string) => void
}

interface SavedLeadCardProps {
  lead: LinkedInSavedLead
  onImport: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isImporting: boolean
}

function SavedLeadCard({ lead, onImport, onDelete, isImporting }: SavedLeadCardProps) {
  const isImported = !!lead.imported_at

  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        {lead.profile_picture_url ? (
          <img
            src={lead.profile_picture_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {lead.first_name?.[0]}{lead.last_name?.[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {lead.first_name} {lead.last_name}
            </span>
            {lead.lead_score && (
              <span className="flex items-center gap-0.5 text-xs text-amber-600">
                <Star className="w-3 h-3 fill-current" />
                {lead.lead_score}
              </span>
            )}
          </div>

          {lead.headline && (
            <p className="text-xs text-muted-foreground truncate">
              {lead.headline}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {lead.company_name && (
              <span className="flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3" />
                {lead.company_name}
              </span>
            )}
            {lead.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {lead.location}
              </span>
            )}
          </div>

          {lead.recommendation_reason && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              {lead.recommendation_reason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {lead.linkedin_url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(lead.linkedin_url!, '_blank')}
              title="Open in LinkedIn"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}

          {isImported ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-green-600"
              disabled
              title="Imported"
            >
              <Check className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onImport(lead.id)}
              disabled={isImporting}
              title="Import to CRM"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => onDelete(lead.id)}
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SavedLeadsPanel({ title = 'LinkedIn Leads', onLeadImported }: SavedLeadsPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    headline: '',
    company_name: '',
    linkedin_url: '',
    location: '',
  })

  const {
    savedLeads,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addSavedLead,
    importToCRM,
    deleteSavedLead,
  } = useSavedLeads()

  const handleImport = async (savedLeadId: string) => {
    setImportingId(savedLeadId)
    try {
      const result = await importToCRM(savedLeadId)
      if (result) {
        toast.success('Lead imported to CRM')
        onLeadImported?.(result.leadId)
      }
    } catch {
      toast.error('Failed to import lead')
    } finally {
      setImportingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteSavedLead(id)
    toast.success('Lead removed')
  }

  const handleAddLead = async () => {
    if (!newLead.first_name.trim()) return

    const result = await addSavedLead({
      first_name: newLead.first_name,
      last_name: newLead.last_name || null,
      headline: newLead.headline || null,
      company_name: newLead.company_name || null,
      linkedin_url: newLead.linkedin_url || null,
      location: newLead.location || null,
      user_id: null,
      sales_nav_lead_id: null,
      profile_picture_url: null,
      company_linkedin_url: null,
      company_industry: null,
      company_size: null,
      lead_score: null,
      recommendation_reason: null,
      imported_to_lead_id: null,
      imported_to_contact_id: null,
      imported_at: null,
      list_name: null,
      list_id: null,
    })

    if (result) {
      setShowAddDialog(false)
      setNewLead({
        first_name: '',
        last_name: '',
        headline: '',
        company_name: '',
        linkedin_url: '',
        location: '',
      })
      toast.success('Lead saved')
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0A66C2]" />
            {title}
            {savedLeads.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({savedLeads.length})
              </span>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Lead
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive py-4 text-center">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && savedLeads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No saved leads</p>
              <p className="text-xs mt-1">
                Save leads from LinkedIn Sales Navigator to track them here
              </p>
            </div>
          )}

          {/* Leads list */}
          {!loading && savedLeads.length > 0 && (
            <div className="space-y-2">
              {savedLeads.map((lead) => (
                <SavedLeadCard
                  key={lead.id}
                  lead={lead}
                  onImport={handleImport}
                  onDelete={handleDelete}
                  isImporting={importingId === lead.id}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && savedLeads.length > 0 && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save LinkedIn Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name *</label>
                <Input
                  value={newLead.first_name}
                  onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={newLead.last_name}
                  onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Headline / Title</label>
              <Input
                value={newLead.headline}
                onChange={(e) => setNewLead({ ...newLead, headline: e.target.value })}
                placeholder="VP of Sales at Acme Corp"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Input
                value={newLead.company_name}
                onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">LinkedIn URL</label>
              <Input
                value={newLead.linkedin_url}
                onChange={(e) => setNewLead({ ...newLead, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={newLead.location}
                onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddLead}
              disabled={!newLead.first_name.trim()}
            >
              Save Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
