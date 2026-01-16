import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CRMPageHeaderAction {
  label: string
  onClick?: () => void
  href?: string
  icon?: LucideIcon
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
}

interface CRMPageHeaderProps {
  title: string
  subtitle?: string | React.ReactNode
  backLink?: string
  backLabel?: string
  actions?: CRMPageHeaderAction[]
  badge?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function CRMPageHeader({
  title,
  subtitle,
  backLink,
  backLabel = 'Back',
  actions = [],
  badge,
  className,
  children,
}: CRMPageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {backLink && (
        <Link to={backLink}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <div className="text-muted-foreground mt-1">
              {typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}
            </div>
          )}
        </div>
        {actions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {actions.map((action, index) => {
              const ActionIcon = action.icon
              const buttonContent = (
                <>
                  {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
                  {action.label}
                </>
              )

              if (action.href) {
                return (
                  <Link key={index} to={action.href}>
                    <Button variant={action.variant || 'default'}>
                      {buttonContent}
                    </Button>
                  </Link>
                )
              }

              return (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  onClick={action.onClick}
                >
                  {buttonContent}
                </Button>
              )
            })}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
