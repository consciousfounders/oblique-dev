import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Field Types
export type FieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'custom'

export interface SelectOption {
  value: string
  label: string
}

export interface FormField {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: SelectOption[]
  validation?: (value: unknown) => string | undefined
  render?: (props: {
    value: unknown
    onChange: (value: unknown) => void
    error?: string
  }) => React.ReactNode
  colSpan?: 1 | 2
  helpText?: string
}

export interface FormSection {
  id: string
  title?: string
  description?: string
  icon?: LucideIcon
  fields: FormField[]
  columns?: 1 | 2
}

interface CRMFormProps<T extends Record<string, unknown>> {
  // Form Structure
  sections: FormSection[]
  values: T
  onChange: (values: T) => void

  // Actions
  onSubmit: (values: T) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  submitting?: boolean

  // Validation
  errors?: Record<string, string>
  validateOnBlur?: boolean

  // Unsaved Changes
  hasUnsavedChanges?: boolean
  onUnsavedChangesDialogConfirm?: () => void

  // Customization
  className?: string
  layout?: 'card' | 'inline'
  title?: string
  description?: string
}

export function CRMForm<T extends Record<string, unknown>>({
  // Form Structure
  sections,
  values,
  onChange,

  // Actions
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitting = false,

  // Validation
  errors: externalErrors = {},
  validateOnBlur = true,

  // Unsaved Changes
  hasUnsavedChanges = false,
  onUnsavedChangesDialogConfirm,

  // Customization
  className,
  layout = 'card',
  title,
  description,
}: CRMFormProps<T>) {
  const [localErrors, setLocalErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Set<string>>(new Set())
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false)

  const errors = { ...localErrors, ...externalErrors }

  const handleChange = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value } as T)

    // Clear error when value changes
    if (localErrors[name]) {
      setLocalErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleBlur = (field: FormField) => {
    setTouched((prev) => new Set(prev).add(field.name))

    if (validateOnBlur && field.validation) {
      const error = field.validation(values[field.name])
      if (error) {
        setLocalErrors((prev) => ({ ...prev, [field.name]: error }))
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    sections.forEach((section) => {
      section.fields.forEach((field) => {
        // Required validation
        if (field.required && !values[field.name]) {
          newErrors[field.name] = `${field.label} is required`
          isValid = false
        }

        // Custom validation
        if (field.validation && values[field.name]) {
          const error = field.validation(values[field.name])
          if (error) {
            newErrors[field.name] = error
            isValid = false
          }
        }
      })
    })

    setLocalErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    await onSubmit(values)
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
    } else {
      onCancel?.()
    }
  }

  const renderField = (field: FormField) => {
    const value = values[field.name]
    const error = touched.has(field.name) || externalErrors[field.name] ? errors[field.name] : undefined
    const isRequired = field.required

    const fieldContent = (
      <div className={cn(field.colSpan === 2 && 'col-span-2')}>
        <Label htmlFor={field.name} className="mb-1.5 block">
          {field.label}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>

        {field.type === 'custom' && field.render ? (
          field.render({
            value,
            onChange: (v) => handleChange(field.name, v),
            error,
          })
        ) : field.type === 'textarea' ? (
          <Textarea
            id={field.name}
            placeholder={field.placeholder}
            value={value as string || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field)}
            disabled={field.disabled}
            className={cn(error && 'border-destructive')}
          />
        ) : field.type === 'select' ? (
          <Select
            value={value as string || ''}
            onValueChange={(v) => handleChange(field.name, v)}
            disabled={field.disabled}
          >
            <SelectTrigger className={cn(error && 'border-destructive')}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={field.name}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
            placeholder={field.placeholder}
            value={value as string || ''}
            onChange={(e) => handleChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            onBlur={() => handleBlur(field)}
            disabled={field.disabled}
            className={cn(error && 'border-destructive')}
          />
        )}

        {field.helpText && !error && (
          <p className="text-sm text-muted-foreground mt-1">{field.helpText}</p>
        )}

        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}
      </div>
    )

    return fieldContent
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {sections.map((section) => {
        const SectionIcon = section.icon
        return (
          <div key={section.id} className="space-y-4">
            {section.title && (
              <div className="flex items-center gap-2">
                {SectionIcon && <SectionIcon className="w-4 h-4 text-muted-foreground" />}
                <h3 className="font-medium">{section.title}</h3>
              </div>
            )}
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
            <div className={cn(
              'grid gap-4',
              section.columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
            )}>
              {section.fields.map((field) => (
                <React.Fragment key={field.name}>
                  {renderField(field)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )
      })}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
          >
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )

  return (
    <>
      {layout === 'card' ? (
        <Card className={className}>
          {(title || description) && (
            <CardHeader>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </CardHeader>
          )}
          <CardContent>{formContent}</CardContent>
        </Card>
      ) : (
        <div className={className}>{formContent}</div>
      )}

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              Continue Editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowUnsavedDialog(false)
                onUnsavedChangesDialogConfirm?.()
                onCancel?.()
              }}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper hook for form state management
export function useFormState<T extends Record<string, unknown>>(
  initialValues: T,
  originalValues?: T
) {
  const [values, setValues] = React.useState<T>(initialValues)
  const [isDirty, setIsDirty] = React.useState(false)

  const handleChange = React.useCallback((newValues: T) => {
    setValues(newValues)
    setIsDirty(true)
  }, [])

  const reset = React.useCallback(() => {
    setValues(initialValues)
    setIsDirty(false)
  }, [initialValues])

  const hasUnsavedChanges = React.useMemo(() => {
    if (!originalValues) return isDirty
    return JSON.stringify(values) !== JSON.stringify(originalValues)
  }, [values, originalValues, isDirty])

  return {
    values,
    setValues: handleChange,
    reset,
    isDirty,
    hasUnsavedChanges,
  }
}

// Validation helpers
export const validators = {
  email: (value: unknown): string | undefined => {
    if (!value) return undefined
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(String(value)) ? undefined : 'Invalid email address'
  },

  phone: (value: unknown): string | undefined => {
    if (!value) return undefined
    const phoneRegex = /^[\d\s\-+()]+$/
    return phoneRegex.test(String(value)) ? undefined : 'Invalid phone number'
  },

  url: (value: unknown): string | undefined => {
    if (!value) return undefined
    try {
      new URL(String(value))
      return undefined
    } catch {
      return 'Invalid URL'
    }
  },

  minLength: (min: number) => (value: unknown): string | undefined => {
    if (!value) return undefined
    return String(value).length >= min ? undefined : `Must be at least ${min} characters`
  },

  maxLength: (max: number) => (value: unknown): string | undefined => {
    if (!value) return undefined
    return String(value).length <= max ? undefined : `Must be at most ${max} characters`
  },

  numeric: (value: unknown): string | undefined => {
    if (!value) return undefined
    return !isNaN(Number(value)) ? undefined : 'Must be a number'
  },

  positive: (value: unknown): string | undefined => {
    if (!value) return undefined
    return Number(value) > 0 ? undefined : 'Must be a positive number'
  },
}
