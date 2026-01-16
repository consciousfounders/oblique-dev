import * as React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CRMPageHeader } from './CRMPageHeader'
import { CRMBreadcrumb } from './CRMBreadcrumb'
import { Pencil } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryField {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  href?: string
}

interface DetailTab {
  id: string
  label: string
  icon?: LucideIcon
  content: React.ReactNode
  badge?: number | string
}

interface HeaderAction {
  label: string
  onClick?: () => void
  href?: string
  icon?: LucideIcon
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
}

interface RelatedSection {
  id: string
  title: string
  icon?: LucideIcon
  content: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

interface CRMDetailViewProps {
  // Header
  title: string
  subtitle?: string
  badge?: React.ReactNode
  backLink: string
  backLabel?: string
  headerActions?: HeaderAction[]

  // Breadcrumbs
  breadcrumbs?: { label: string; href?: string }[]

  // Summary Card
  summaryFields?: SummaryField[]

  // Tabs
  tabs?: DetailTab[]
  defaultTab?: string

  // Main Content (if no tabs)
  mainContent?: React.ReactNode

  // Sidebar
  sidebarContent?: React.ReactNode

  // Related Sections
  relatedSections?: RelatedSection[]

  // Quick Edit
  onEdit?: () => void
  editLabel?: string

  // Metadata
  createdAt?: string | Date
  updatedAt?: string | Date

  // Loading
  loading?: boolean

  // Customization
  className?: string
  layout?: 'sidebar' | 'full'
}

export function CRMDetailView({
  // Header
  title,
  subtitle,
  badge,
  backLink,
  backLabel = 'Back',
  headerActions = [],

  // Breadcrumbs
  breadcrumbs,

  // Summary Card
  summaryFields = [],

  // Tabs
  tabs = [],
  defaultTab,

  // Main Content
  mainContent,

  // Sidebar
  sidebarContent,

  // Related Sections
  relatedSections = [],

  // Quick Edit
  onEdit,
  editLabel = 'Edit',

  // Metadata
  createdAt,
  updatedAt,

  // Loading
  loading = false,

  // Customization
  className,
  layout = 'sidebar',
}: CRMDetailViewProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id)

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString()
  }

  // Add edit action if onEdit provided
  const allActions = React.useMemo(() => {
    const actions = [...headerActions]
    if (onEdit && !actions.find((a) => a.onClick === onEdit)) {
      actions.unshift({
        label: editLabel,
        onClick: onEdit,
        icon: Pencil,
        variant: 'outline',
      })
    }
    return actions
  }, [headerActions, onEdit, editLabel])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const hasSidebar = layout === 'sidebar' && (sidebarContent || relatedSections.length > 0)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <CRMBreadcrumb items={breadcrumbs} />
      )}

      {/* Header */}
      <CRMPageHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        backLink={backLink}
        backLabel={backLabel}
        actions={allActions}
      />

      {/* Main Layout */}
      <div className={cn(hasSidebar && 'grid gap-6 lg:grid-cols-3')}>
        {/* Main Content Area */}
        <div className={cn(hasSidebar ? 'lg:col-span-2' : '', 'space-y-6')}>
          {/* Summary Card */}
          {summaryFields.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {summaryFields.map((field, index) => {
                    const FieldIcon = field.icon
                    return (
                      <div key={index} className="flex items-start gap-3">
                        {FieldIcon && (
                          <div className="mt-0.5">
                            <FieldIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-muted-foreground">{field.label}</div>
                          <div className="font-medium truncate">
                            {field.href ? (
                              <Link
                                to={field.href}
                                className="hover:text-primary transition-colors"
                              >
                                {field.value}
                              </Link>
                            ) : (
                              field.value
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabbed Content */}
          {tabs.length > 0 && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {tabs.map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                      {TabIcon && <TabIcon className="w-4 h-4" />}
                      {tab.label}
                      {tab.badge !== undefined && (
                        <span className="ml-1 bg-muted px-1.5 py-0.5 rounded text-xs">
                          {tab.badge}
                        </span>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-4">
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Main Content (non-tabbed) */}
          {!tabs.length && mainContent}

          {/* Metadata Footer */}
          {(createdAt || updatedAt) && (
            <div className="text-xs text-muted-foreground pt-4 border-t">
              {createdAt && <>Created {formatDate(createdAt)}</>}
              {createdAt && updatedAt && updatedAt !== createdAt && ' · '}
              {updatedAt && updatedAt !== createdAt && (
                <>Updated {formatDate(updatedAt)}</>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {hasSidebar && (
          <div className="space-y-6">
            {/* Custom Sidebar Content */}
            {sidebarContent}

            {/* Related Sections */}
            {relatedSections.map((section) => {
              const SectionIcon = section.icon
              return (
                <Card key={section.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {SectionIcon && <SectionIcon className="w-4 h-4" />}
                        {section.title}
                      </CardTitle>
                      {section.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={section.action.onClick}
                        >
                          {section.action.label}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>{section.content}</CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-components for Detail View

interface DetailFieldListProps {
  fields: { label: string; value: React.ReactNode; icon?: LucideIcon }[]
  className?: string
}

export function DetailFieldList({ fields, className }: DetailFieldListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {fields.map((field, index) => {
        const FieldIcon = field.icon
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            {FieldIcon && <FieldIcon className="w-4 h-4 text-muted-foreground" />}
            <span className="text-muted-foreground min-w-[100px]">{field.label}:</span>
            <span className="font-medium">{field.value}</span>
          </div>
        )
      })}
    </div>
  )
}

interface DetailSectionProps {
  title: string
  icon?: LucideIcon
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function DetailSection({ title, icon: Icon, children, action, className }: DetailSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

interface RelatedListProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  emptyMessage?: string
  maxItems?: number
  onViewAll?: () => void
  className?: string
}

export function RelatedList<T>({
  items,
  renderItem,
  emptyMessage = 'No items',
  maxItems = 5,
  onViewAll,
  className,
}: RelatedListProps<T>) {
  const displayItems = items.slice(0, maxItems)
  const hasMore = items.length > maxItems

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayItems.map((item, index) => (
        <div key={index}>{renderItem(item)}</div>
      ))}
      {hasMore && onViewAll && (
        <Button variant="ghost" size="sm" className="w-full" onClick={onViewAll}>
          View all {items.length} items
        </Button>
      )}
    </div>
  )
}
