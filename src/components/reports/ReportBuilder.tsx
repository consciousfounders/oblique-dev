import { useState } from 'react'
import {
  type ReportObjectType,
  type ReportFilter,
  type ChartType,
} from '@/lib/supabase'
import { getAvailableFields } from '@/lib/hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Trash2,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Gauge,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ReportBuilderProps {
  name: string
  description: string
  objectType: ReportObjectType
  fields: string[]
  filters: ReportFilter[]
  grouping: string | null
  sortField: string | null
  sortDirection: string
  chartType: ChartType
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onObjectTypeChange: (type: ReportObjectType) => void
  onFieldsChange: (fields: string[]) => void
  onFiltersChange: (filters: ReportFilter[]) => void
  onGroupingChange: (grouping: string | null) => void
  onSortChange: (field: string | null, direction: string) => void
  onChartTypeChange: (type: ChartType) => void
}

const OBJECT_TYPES: { value: ReportObjectType; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'deals', label: 'Deals' },
  { value: 'activities', label: 'Activities' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'users', label: 'Users' },
]

const CHART_TYPES: { value: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { value: 'table', label: 'Table', icon: Table },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'funnel', label: 'Funnel', icon: BarChart3 },
  { value: 'gauge', label: 'Gauge', icon: Gauge },
]

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'between', label: 'Between' },
  { value: 'is_null', label: 'Is empty' },
  { value: 'is_not_null', label: 'Is not empty' },
]

export function ReportBuilder({
  name,
  description,
  objectType,
  fields,
  filters,
  grouping,
  sortField,
  sortDirection,
  chartType,
  onNameChange,
  onDescriptionChange,
  onObjectTypeChange,
  onFieldsChange,
  onFiltersChange,
  onGroupingChange,
  onSortChange,
  onChartTypeChange,
}: ReportBuilderProps) {
  const availableFields = getAvailableFields(objectType)
  const [expandedSections, setExpandedSections] = useState({
    fields: true,
    filters: true,
    grouping: true,
    visualization: true,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      field: availableFields[0]?.name || '',
      operator: 'equals',
      value: '',
    }
    onFiltersChange([...filters, newFilter])
  }

  const handleUpdateFilter = (index: number, updates: Partial<ReportFilter>) => {
    const newFilters = [...filters]
    newFilters[index] = { ...newFilters[index], ...updates }
    onFiltersChange(newFilters)
  }

  const handleRemoveFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index))
  }

  const handleToggleField = (fieldName: string) => {
    if (fields.includes(fieldName)) {
      onFieldsChange(fields.filter(f => f !== fieldName))
    } else {
      onFieldsChange([...fields, fieldName])
    }
  }

  const handleSelectAllFields = () => {
    onFieldsChange(availableFields.map(f => f.name))
  }

  const handleClearAllFields = () => {
    onFieldsChange([])
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Report Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter report name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => onDescriptionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter report description"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Report On
            </label>
            <select
              value={objectType}
              onChange={e => onObjectTypeChange(e.target.value as ReportObjectType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {OBJECT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Fields Selection */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('fields')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Fields to Display</CardTitle>
            {expandedSections.fields ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.fields && (
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllFields}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllFields}
              >
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableFields.map(field => (
                <label
                  key={field.name}
                  className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={fields.includes(field.name)}
                    onChange={() => handleToggleField(field.name)}
                    className="rounded"
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('filters')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            {expandedSections.filters ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.filters && (
          <CardContent className="space-y-3">
            {filters.map((filter, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded"
              >
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                <select
                  value={filter.field}
                  onChange={e =>
                    handleUpdateFilter(index, { field: e.target.value })
                  }
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                >
                  {availableFields.map(field => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={e =>
                    handleUpdateFilter(index, {
                      operator: e.target.value as ReportFilter['operator'],
                    })
                  }
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                >
                  {FILTER_OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {filter.operator !== 'is_null' &&
                  filter.operator !== 'is_not_null' && (
                    <input
                      type="text"
                      value={String(filter.value || '')}
                      onChange={e =>
                        handleUpdateFilter(index, { value: e.target.value })
                      }
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                      placeholder="Value"
                    />
                  )}
                {filter.operator === 'between' && (
                  <input
                    type="text"
                    value={String(filter.value2 || '')}
                    onChange={e =>
                      handleUpdateFilter(index, { value2: e.target.value })
                    }
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                    placeholder="End value"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFilter(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFilter}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Grouping & Sorting */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('grouping')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Grouping & Sorting</CardTitle>
            {expandedSections.grouping ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.grouping && (
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Group By
              </label>
              <select
                value={grouping || ''}
                onChange={e =>
                  onGroupingChange(e.target.value || null)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">No grouping</option>
                {availableFields.map(field => (
                  <option key={field.name} value={field.name}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Sort By
                </label>
                <select
                  value={sortField || ''}
                  onChange={e =>
                    onSortChange(e.target.value || null, sortDirection)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="">Default order</option>
                  {availableFields.map(field => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Direction
                </label>
                <select
                  value={sortDirection}
                  onChange={e => onSortChange(sortField, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Visualization */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('visualization')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Visualization</CardTitle>
            {expandedSections.visualization ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {expandedSections.visualization && (
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {CHART_TYPES.map(chart => {
                const Icon = chart.icon
                return (
                  <button
                    key={chart.value}
                    onClick={() => onChartTypeChange(chart.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      chartType === chart.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs">{chart.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
