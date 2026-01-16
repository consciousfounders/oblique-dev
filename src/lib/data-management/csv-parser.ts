// CSV/Excel parsing utilities for data import

import type {
  DataEntityType,
  FieldMapping,
  ImportPreview,
  ImportPreviewRow,
  ProgressCallback,
} from './types'
import { ENTITY_FIELDS, getRequiredFields, getUniqueFields } from './types'

// Re-export getUniqueFields for use by hooks
export { getUniqueFields }

// Parse a CSV line handling quoted fields
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Parse entire CSV content
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCSVLine(lines[0]).map(h =>
    h.toLowerCase().replace(/"/g, '').trim()
  )

  const rows: string[][] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > 0 && values.some(v => v.trim())) {
      rows.push(values)
    }
  }

  return { headers, rows }
}

// Generate suggested field mappings based on header names
export function suggestFieldMappings(
  headers: string[],
  entityType: DataEntityType
): FieldMapping[] {
  const entityFields = ENTITY_FIELDS[entityType]
  const mappings: FieldMapping[] = []

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '')

    // Find best matching field
    let bestMatch: string | null = null
    let bestScore = 0

    for (const field of entityFields) {
      const normalizedField = field.name.toLowerCase().replace(/[_\s-]/g, '')
      const normalizedLabel = field.label.toLowerCase().replace(/[_\s-]/g, '')

      // Exact match
      if (normalizedHeader === normalizedField || normalizedHeader === normalizedLabel) {
        bestMatch = field.name
        bestScore = 100
        break
      }

      // Partial match
      if (normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)) {
        const score = Math.min(normalizedHeader.length, normalizedField.length) /
                      Math.max(normalizedHeader.length, normalizedField.length) * 80
        if (score > bestScore) {
          bestMatch = field.name
          bestScore = score
        }
      }

      // Check common aliases
      const aliases: Record<string, string[]> = {
        'first_name': ['firstname', 'fname', 'givenname'],
        'last_name': ['lastname', 'lname', 'surname', 'familyname'],
        'email': ['emailaddress', 'mail', 'emailid'],
        'phone': ['telephone', 'tel', 'phonenumber', 'workphone'],
        'company': ['organization', 'org', 'companyname', 'employer'],
        'title': ['jobtitle', 'position', 'role'],
        'name': ['companyname', 'accountname', 'dealname'],
        'domain': ['website', 'url', 'websiteurl'],
        'value': ['amount', 'dealvalue', 'revenue'],
      }

      if (aliases[field.name]?.includes(normalizedHeader)) {
        bestMatch = field.name
        bestScore = 90
      }
    }

    if (bestMatch && bestScore > 50) {
      mappings.push({
        sourceField: header,
        targetField: bestMatch,
        transform: 'trim',
      })
    }
  }

  return mappings
}

// Validate a row against entity field definitions
export function validateRow(
  row: Record<string, string>,
  entityType: DataEntityType,
  fieldMappings: FieldMapping[]
): string[] {
  const errors: string[] = []
  const requiredFields = getRequiredFields(entityType)
  const entityFields = ENTITY_FIELDS[entityType]

  // Check required fields
  for (const required of requiredFields) {
    const mapping = fieldMappings.find(m => m.targetField === required)
    if (!mapping) {
      errors.push(`Missing required field mapping: ${required}`)
      continue
    }
    const value = row[mapping.sourceField]
    if (!value || !value.trim()) {
      errors.push(`Required field "${required}" is empty`)
    }
  }

  // Validate field types
  for (const mapping of fieldMappings) {
    const fieldDef = entityFields.find(f => f.name === mapping.targetField)
    if (!fieldDef) continue

    const value = row[mapping.sourceField]
    if (!value || !value.trim()) continue

    switch (fieldDef.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push(`Field "${fieldDef.label}" must be a number`)
        }
        break
      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push(`Field "${fieldDef.label}" must be a valid date`)
        }
        break
      case 'enum':
        if (fieldDef.enumValues && !fieldDef.enumValues.includes(value.toLowerCase())) {
          errors.push(`Field "${fieldDef.label}" must be one of: ${fieldDef.enumValues.join(', ')}`)
        }
        break
    }
  }

  return errors
}

// Apply field transformations
export function applyTransform(value: string, transform?: FieldMapping['transform']): string {
  if (!value) return value

  switch (transform) {
    case 'lowercase':
      return value.toLowerCase()
    case 'uppercase':
      return value.toUpperCase()
    case 'trim':
      return value.trim()
    default:
      return value
  }
}

// Map raw row data to entity fields
export function mapRowToEntity(
  row: Record<string, string>,
  fieldMappings: FieldMapping[]
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}

  for (const mapping of fieldMappings) {
    const value = row[mapping.sourceField]
    if (value !== undefined && value !== '') {
      mapped[mapping.targetField] = applyTransform(value, mapping.transform)
    }
  }

  return mapped
}

// Generate import preview from CSV content
export async function generateImportPreview(
  content: string,
  entityType: DataEntityType,
  maxPreviewRows: number = 100,
  onProgress?: ProgressCallback
): Promise<ImportPreview> {
  const { headers, rows } = parseCSV(content)

  if (headers.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      suggestedMappings: [],
    }
  }

  const suggestedMappings = suggestFieldMappings(headers, entityType)
  const previewRows: ImportPreviewRow[] = []
  let validCount = 0
  let errorCount = 0

  const rowsToPreview = Math.min(rows.length, maxPreviewRows)

  for (let i = 0; i < rowsToPreview; i++) {
    const row = rows[i]
    const data: Record<string, string> = {}

    headers.forEach((header, idx) => {
      data[header] = row[idx] || ''
    })

    const errors = validateRow(data, entityType, suggestedMappings)

    previewRows.push({
      rowNumber: i + 2, // +2 because row 1 is headers, and we're 0-indexed
      data,
      errors,
      isDuplicate: false, // Duplicate check happens during actual import
    })

    if (errors.length === 0) {
      validCount++
    } else {
      errorCount++
    }

    if (onProgress && i % 10 === 0) {
      onProgress({
        current: i + 1,
        total: rowsToPreview,
        status: 'Validating rows...',
      })
    }
  }

  return {
    headers,
    rows: previewRows,
    totalRows: rows.length,
    validRows: validCount,
    errorRows: errorCount,
    duplicateRows: 0,
    suggestedMappings,
  }
}

// Parse file based on extension
export async function parseFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    const content = await file.text()
    return parseCSV(content)
  }

  if (extension === 'xlsx' || extension === 'xls') {
    // For Excel files, we'll use a simpler approach
    // In a production app, you'd use a library like xlsx
    throw new Error('Excel file support requires additional setup. Please use CSV format.')
  }

  throw new Error(`Unsupported file format: ${extension}`)
}

// Format bytes to human readable
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
