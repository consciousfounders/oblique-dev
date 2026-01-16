// CSV generation utilities for data export

import type { DataEntityType, ExportConfig, ProgressCallback } from './types'
import { ENTITY_FIELDS } from './types'

// Escape CSV field value
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // Check if escaping is needed
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape double quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

// Generate CSV header row
export function generateCSVHeader(fields: string[], entityType: DataEntityType): string {
  const entityFields = ENTITY_FIELDS[entityType]

  // Use labels if available, otherwise use field names
  const headers = fields.map(field => {
    const fieldDef = entityFields.find(f => f.name === field)
    return escapeCSVField(fieldDef?.label || field)
  })

  return headers.join(',')
}

// Generate CSV row from record
export function generateCSVRow(record: Record<string, unknown>, fields: string[]): string {
  const values = fields.map(field => escapeCSVField(record[field]))
  return values.join(',')
}

// Generate complete CSV content from records
export function generateCSVContent(
  records: Record<string, unknown>[],
  config: ExportConfig,
  onProgress?: ProgressCallback
): string {
  const lines: string[] = []

  // Add header row
  if (config.includeHeaders) {
    lines.push(generateCSVHeader(config.fields, config.entityType))
  }

  // Add data rows
  for (let i = 0; i < records.length; i++) {
    lines.push(generateCSVRow(records[i], config.fields))

    if (onProgress && i % 100 === 0) {
      onProgress({
        current: i + 1,
        total: records.length,
        status: 'Generating CSV...',
      })
    }
  }

  return lines.join('\n')
}

// Create a downloadable file from CSV content
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Get default fields for export by entity type
export function getDefaultExportFields(entityType: DataEntityType): string[] {
  return ENTITY_FIELDS[entityType].map(f => f.name)
}

// Get all available export fields for entity type
export function getAvailableExportFields(entityType: DataEntityType): { name: string; label: string }[] {
  return ENTITY_FIELDS[entityType].map(f => ({
    name: f.name,
    label: f.label,
  }))
}

// Generate filename for export
export function generateExportFilename(entityType: DataEntityType, format: 'csv' | 'xlsx'): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${entityType}_export_${timestamp}.${format}`
}

// Estimate export file size (rough estimate)
export function estimateExportSize(recordCount: number, fieldCount: number): number {
  // Assume average field length of 20 characters
  const avgRowLength = fieldCount * 20 + fieldCount // +fieldCount for commas
  return recordCount * avgRowLength
}

// Format estimated size for display
export function formatEstimatedSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
