import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompanyEnrichment, useCanEnrich } from '@/lib/hooks/useEnrichment'
import {
  ENRICHMENT_STATUS_CONFIG,
  ENRICHMENT_PROVIDERS,
} from '@/lib/types/enrichment'
import {
  Building2,
  Globe,
  Users,
  DollarSign,
  MapPin,
  Linkedin,
  Twitter,
  ExternalLink,
  RefreshCw,
  Loader2,
  Zap,
  Server,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface CompanyEnrichmentPanelProps {
  accountId: string
  accountName?: string
  accountDomain?: string
}

// Format number with K/M suffix
function formatNumber(num: number | undefined): string {
  if (!num) return '-'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Format currency
function formatCurrency(amount: number | undefined): string {
  if (!amount) return '-'
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toFixed(0)}`
}

// Technology tag
function TechTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
      {name}
    </span>
  )
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

export function CompanyEnrichmentPanel({
  accountId,
  accountName,
}: CompanyEnrichmentPanelProps) {
  const {
    enrichment,
    loading,
    enriching,
    error,
    enrich,
  } = useCompanyEnrichment({ accountId })

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
            Company Enrichment
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
              title={!canEnrich ? cannotEnrichReason || 'Cannot enrich' : 'Enrich company data'}
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
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No enrichment data available</p>
            <p className="text-xs mt-1">Click "Enrich" to fetch company information</p>
          </div>
        )}

        {enrichment && (
          <div className="space-y-4">
            {/* Header with logo */}
            <div className="flex items-start gap-3">
              {enrichment.logo_url ? (
                <img
                  src={enrichment.logo_url}
                  alt={enrichment.legal_name || accountName || 'Company'}
                  className="w-12 h-12 rounded-lg object-contain bg-gray-50 dark:bg-gray-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {enrichment.legal_name || accountName}
                </h3>
                {enrichment.domain && (
                  <a
                    href={`https://${enrichment.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    {enrichment.domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Description */}
            {enrichment.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {enrichment.description}
              </p>
            )}

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  Employees
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {enrichment.employee_range || formatNumber(enrichment.employee_count)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Revenue
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {enrichment.revenue_range || formatCurrency(enrichment.annual_revenue)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Funding
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(enrichment.funding_total)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Founded
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {enrichment.founded_year || '-'}
                </div>
              </div>
            </div>

            {/* Industry */}
            {(enrichment.industry || enrichment.sub_industry) && (
              <div className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">Industry:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">
                  {enrichment.industry}
                  {enrichment.sub_industry && ` / ${enrichment.sub_industry}`}
                </span>
              </div>
            )}

            {/* Location */}
            {(enrichment.headquarters_city || enrichment.headquarters_country) && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                {[
                  enrichment.headquarters_city,
                  enrichment.headquarters_state,
                  enrichment.headquarters_country,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </div>
            )}

            {/* Social links */}
            {(enrichment.linkedin_url || enrichment.twitter_url) && (
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
              </div>
            )}

            {/* Technologies */}
            {enrichment.technologies && enrichment.technologies.length > 0 && (
              <Section title="Technologies" icon={<Server className="w-4 h-4" />} defaultExpanded={false}>
                <div className="flex flex-wrap gap-1.5">
                  {enrichment.technologies.slice(0, 20).map((tech, idx) => (
                    <TechTag key={idx} name={tech} />
                  ))}
                  {enrichment.technologies.length > 20 && (
                    <span className="text-xs text-gray-500">
                      +{enrichment.technologies.length - 20} more
                    </span>
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
