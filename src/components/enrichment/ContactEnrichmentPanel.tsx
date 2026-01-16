import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useContactEnrichment, useCanEnrich } from '@/lib/hooks/useEnrichment'
import {
  ENRICHMENT_STATUS_CONFIG,
  ENRICHMENT_PROVIDERS,
  type WorkHistoryEntry,
  type EducationEntry,
} from '@/lib/types/enrichment'
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  MapPin,
  Linkedin,
  Twitter,
  Github,
  Globe,
  RefreshCw,
  Loader2,
  Zap,
  GraduationCap,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react'

interface ContactEnrichmentPanelProps {
  entityType: 'contact' | 'lead'
  entityId: string
  contactName?: string
  contactEmail?: string
}

// Verification badge
function VerificationBadge({ verified, confidence }: { verified?: boolean; confidence?: number }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <Check className="w-3 h-3" />
        Verified
      </span>
    )
  }
  if (confidence) {
    const color = confidence >= 80 ? 'text-green-600' : confidence >= 50 ? 'text-yellow-600' : 'text-gray-500'
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
        <Shield className="w-3 h-3" />
        {confidence}%
      </span>
    )
  }
  return null
}

// Section with expandable content
function Section({
  title,
  icon,
  children,
  defaultExpanded = true
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {icon}
          {title}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  )
}

// Work history entry
function WorkHistoryItem({ entry }: { entry: WorkHistoryEntry }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {entry.title}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {entry.company}
        </div>
        {(entry.start_date || entry.end_date) && (
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
            {entry.start_date} - {entry.is_current ? 'Present' : entry.end_date || 'Unknown'}
          </div>
        )}
      </div>
    </div>
  )
}

// Education entry
function EducationItem({ entry }: { entry: EducationEntry }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
        <GraduationCap className="w-4 h-4 text-blue-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {entry.school}
        </div>
        {(entry.degree || entry.field_of_study) && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {[entry.degree, entry.field_of_study].filter(Boolean).join(' in ')}
          </div>
        )}
        {(entry.start_year || entry.end_year) && (
          <div className="text-xs text-gray-500 mt-0.5">
            {entry.start_year} - {entry.end_year || 'Unknown'}
          </div>
        )}
      </div>
    </div>
  )
}

// Skill tag
function SkillTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {name}
    </span>
  )
}

export function ContactEnrichmentPanel({
  entityType,
  entityId,
  contactName,
}: ContactEnrichmentPanelProps) {
  const {
    enrichment,
    loading,
    enriching,
    error,
    enrich,
  } = useContactEnrichment({ entityType, entityId })

  const { canEnrich, reason: cannotEnrichReason } = useCanEnrich()

  const handleEnrich = async () => {
    await enrich({ forceRefresh: true })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading enrichment data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            Contact Enrichment
          </CardTitle>
          <div className="flex items-center gap-2">
            {enrichment && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ENRICHMENT_STATUS_CONFIG[enrichment.status].bgColor} ${ENRICHMENT_STATUS_CONFIG[enrichment.status].color}`}>
                {ENRICHMENT_STATUS_CONFIG[enrichment.status].label}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnrich}
              disabled={enriching || !canEnrich}
              title={!canEnrich ? cannotEnrichReason || 'Cannot enrich' : 'Enrich contact data'}
            >
              {enriching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {enrichment ? 'Refresh' : 'Enrich'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!enrichment && !error && (
          <div className="text-center py-6 text-gray-500">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No enrichment data available</p>
            <p className="text-xs mt-1">Click "Enrich" to fetch contact information</p>
          </div>
        )}

        {enrichment && (
          <div className="space-y-4">
            {/* Header with avatar */}
            <div className="flex items-start gap-3">
              {enrichment.avatar_url ? (
                <img
                  src={enrichment.avatar_url}
                  alt={enrichment.full_name || contactName || 'Contact'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {enrichment.full_name || contactName}
                </h3>
                {enrichment.headline && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {enrichment.headline}
                  </p>
                )}
              </div>
            </div>

            {/* Job info */}
            {(enrichment.job_title || enrichment.current_company) && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {enrichment.job_title}
                    {enrichment.job_title_verified && (
                      <span className="ml-2">
                        <VerificationBadge verified={true} />
                      </span>
                    )}
                  </div>
                  {enrichment.current_company && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      at {enrichment.current_company}
                    </div>
                  )}
                  {(enrichment.seniority || enrichment.department) && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                      {[enrichment.seniority, enrichment.department].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact info */}
            <div className="space-y-2">
              {enrichment.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a
                    href={`mailto:${enrichment.email}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {enrichment.email}
                  </a>
                  <VerificationBadge
                    verified={enrichment.email_verified}
                    confidence={enrichment.email_confidence}
                  />
                </div>
              )}
              {(enrichment.phone || enrichment.mobile_phone || enrichment.work_phone) && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${enrichment.phone || enrichment.mobile_phone || enrichment.work_phone}`}
                    className="text-sm text-gray-900 dark:text-gray-100"
                  >
                    {enrichment.phone || enrichment.mobile_phone || enrichment.work_phone}
                  </a>
                  {enrichment.phone_type && (
                    <span className="text-xs text-gray-500">({enrichment.phone_type})</span>
                  )}
                </div>
              )}
            </div>

            {/* Location */}
            {(enrichment.city || enrichment.country) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                {[enrichment.city, enrichment.state, enrichment.country].filter(Boolean).join(', ')}
                {enrichment.timezone && (
                  <span className="text-xs text-gray-500">· {enrichment.timezone}</span>
                )}
              </div>
            )}

            {/* Social links */}
            {(enrichment.linkedin_url || enrichment.twitter_url || enrichment.github_url) && (
              <div className="flex items-center gap-3">
                {enrichment.linkedin_url && (
                  <a
                    href={enrichment.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {enrichment.twitter_url && (
                  <a
                    href={enrichment.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </a>
                )}
                {enrichment.github_url && (
                  <a
                    href={enrichment.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 hover:underline"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
                {enrichment.personal_website && (
                  <a
                    href={enrichment.personal_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            )}

            {/* Work history */}
            {enrichment.work_history && enrichment.work_history.length > 0 && (
              <Section title="Work History" icon={<Briefcase className="w-4 h-4" />} defaultExpanded={false}>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {enrichment.work_history.slice(0, 5).map((entry, idx) => (
                    <WorkHistoryItem key={idx} entry={entry} />
                  ))}
                </div>
              </Section>
            )}

            {/* Education */}
            {enrichment.education_history && enrichment.education_history.length > 0 && (
              <Section title="Education" icon={<GraduationCap className="w-4 h-4" />} defaultExpanded={false}>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {enrichment.education_history.map((entry, idx) => (
                    <EducationItem key={idx} entry={entry} />
                  ))}
                </div>
              </Section>
            )}

            {/* Skills */}
            {enrichment.skills && enrichment.skills.length > 0 && (
              <Section title="Skills" icon={<Zap className="w-4 h-4" />} defaultExpanded={false}>
                <div className="flex flex-wrap gap-1.5">
                  {enrichment.skills.slice(0, 15).map((skill, idx) => (
                    <SkillTag key={idx} name={skill} />
                  ))}
                  {enrichment.skills.length > 15 && (
                    <span className="text-xs text-gray-500">+{enrichment.skills.length - 15} more</span>
                  )}
                </div>
              </Section>
            )}

            {/* Metadata */}
            {enrichment.enriched_at && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>
                  Enriched {new Date(enrichment.enriched_at).toLocaleDateString()} via{' '}
                  {ENRICHMENT_PROVIDERS[enrichment.provider]?.name || enrichment.provider}
                </span>
                {enrichment.confidence_score && (
                  <span>Confidence: {enrichment.confidence_score}%</span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
