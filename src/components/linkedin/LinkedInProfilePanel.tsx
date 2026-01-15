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
import { useLinkedInProfile, useLinkedInActivities } from '@/lib/hooks/useLinkedIn'
import { linkedinService, ACTIVITY_LABELS, type ProfileSearchParams } from '@/lib/services/linkedinService'
import type { EntityType, LinkedInProfileStatus } from '@/lib/supabase'
import {
  Linkedin,
  Search,
  ExternalLink,
  Unlink,
  MessageSquare,
  UserPlus,
  Eye,
  Building2,
  MapPin,
  Briefcase,
  Users,
  Loader2,
  RefreshCw,
  MoreVertical,
  Check,
  Clock,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface LinkedInProfilePanelProps {
  entityType: EntityType
  entityId: string
  contactName?: string
  contactEmail?: string
  contactCompany?: string
  contactTitle?: string
  onSendInMail?: () => void
}

// Connection status badge component
function ConnectionStatusBadge({ status }: { status: LinkedInProfileStatus }) {
  const statusConfig: Record<LinkedInProfileStatus, { icon: React.ReactNode; label: string; className: string }> = {
    connected: { icon: <Check className="w-3 h-3" />, label: 'Connected', className: 'bg-green-100 text-green-700' },
    pending: { icon: <Clock className="w-3 h-3" />, label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
    not_connected: { icon: <X className="w-3 h-3" />, label: 'Not Connected', className: 'bg-gray-100 text-gray-700' },
    following: { icon: <Eye className="w-3 h-3" />, label: 'Following', className: 'bg-blue-100 text-blue-700' },
  }

  const config = statusConfig[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

export function LinkedInProfilePanel({
  entityType,
  entityId,
  contactName,
  contactEmail,
  contactCompany,
  contactTitle,
  onSendInMail,
}: LinkedInProfilePanelProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [isLinking, setIsLinking] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const {
    profile,
    loading,
    error,
    lookupProfile,
    saveProfile,
    updateProfile,
    unlinkProfile,
    refresh,
  } = useLinkedInProfile({ entityType, entityId })

  const {
    activities,
    logActivity,
  } = useLinkedInActivities({ linkedinProfileId: profile?.id })

  // Parse name into first/last
  const nameParts = contactName?.split(' ') || []
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ')

  const handleLookup = async () => {
    setIsLookingUp(true)
    try {
      const params: ProfileSearchParams = {
        firstName,
        lastName,
        email: contactEmail,
        company: contactCompany,
        title: contactTitle,
      }
      const result = await lookupProfile(params)
      if (result?.linkedin_url) {
        await saveProfile(result)
      } else {
        // Open search URL if no direct match
        const searchUrl = linkedinService.generateSearchUrl(params)
        window.open(searchUrl, '_blank')
      }
    } finally {
      setIsLookingUp(false)
    }
  }

  const handleManualLink = async () => {
    if (!linkedinUrl.trim()) return
    setIsLinking(true)
    try {
      // Extract public identifier from URL
      const match = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/)
      const publicIdentifier = match ? match[1] : undefined

      await saveProfile({
        linkedin_url: linkedinUrl,
        public_identifier: publicIdentifier,
      })
      setShowLinkDialog(false)
      setLinkedinUrl('')
    } finally {
      setIsLinking(false)
    }
  }

  const handleLogConnectionRequest = async () => {
    if (!profile) return
    await logActivity('connection_request_sent', {
      subject: `Sent connection request to ${contactName}`,
    })
    await updateProfile({ connection_status: 'pending' })
  }

  const handleLogProfileView = async () => {
    if (!profile) return
    await logActivity('profile_viewed', {
      subject: `Viewed profile of ${contactName}`,
    })
  }

  const handleOpenProfile = () => {
    if (profile?.linkedin_url) {
      window.open(profile.linkedin_url, '_blank')
    } else if (profile?.public_identifier) {
      window.open(linkedinService.generateProfileUrl(profile.public_identifier), '_blank')
    }
  }

  const handleOpenInSalesNav = () => {
    const searchUrl = linkedinService.generateSalesNavSearchUrl({
      firstName,
      lastName,
      company: contactCompany,
    })
    window.open(searchUrl, '_blank')
  }

  // Recent activities (last 5)
  const recentActivities = activities.slice(0, 5)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            LinkedIn
          </CardTitle>
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={refresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenInSalesNav}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Sales Navigator
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={unlinkProfile}
                  className="text-destructive"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Unlink Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          {/* No profile linked */}
          {!profile && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No LinkedIn profile linked to this {entityType}.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLookup}
                  disabled={isLookingUp}
                  className="w-full"
                >
                  {isLookingUp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Find on LinkedIn
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLinkDialog(true)}
                  className="w-full"
                >
                  Link manually
                </Button>
              </div>
            </div>
          )}

          {/* Profile linked */}
          {profile && (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="flex items-start gap-3">
                {profile.profile_picture_url ? (
                  <img
                    src={profile.profile_picture_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-semibold">
                    {firstName?.[0]}{lastName?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenProfile}
                      className="font-medium text-sm hover:text-[#0A66C2] transition-colors truncate"
                    >
                      {contactName}
                    </button>
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  </div>
                  {profile.headline && (
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.headline}
                    </p>
                  )}
                  <div className="mt-1">
                    <ConnectionStatusBadge status={profile.connection_status} />
                  </div>
                </div>
              </div>

              {/* Profile details */}
              <div className="space-y-2 text-sm">
                {profile.current_title && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    <span className="truncate">{profile.current_title}</span>
                  </div>
                )}
                {profile.current_company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{profile.current_company}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}
                {profile.mutual_connections > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{profile.mutual_connections} mutual connections</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {onSendInMail && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSendInMail}
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    InMail
                  </Button>
                )}
                {profile.connection_status === 'not_connected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogConnectionRequest}
                    className="flex-1"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Connect
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogProfileView}
                  title="Log profile view"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>

              {/* Recent activity */}
              {recentActivities.length > 0 && (
                <div className="pt-2 border-t">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Recent Activity
                  </h4>
                  <div className="space-y-2">
                    {recentActivities.map((activity) => {
                      const activityConfig = ACTIVITY_LABELS[activity.activity_type]
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className={`w-2 h-2 rounded-full bg-${activityConfig.color}-500`}
                          />
                          <span className="text-muted-foreground truncate">
                            {activity.subject || activityConfig.label}
                          </span>
                          <span className="text-muted-foreground/60 flex-shrink-0">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Last synced */}
              {profile.last_synced_at && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Last synced: {new Date(profile.last_synced_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link LinkedIn Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Paste the LinkedIn profile URL to link it to this {entityType}.
            </p>
            <Input
              placeholder="https://linkedin.com/in/username"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLinkDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualLink}
              disabled={!linkedinUrl.trim() || isLinking}
            >
              {isLinking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Link Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
