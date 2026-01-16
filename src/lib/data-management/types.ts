// Types for data import/export and bulk operations

// Supported import/export entity types
export type DataEntityType = 'contacts' | 'leads' | 'accounts' | 'deals'

// Field mapping configuration
export interface FieldMapping {
  sourceField: string
  targetField: string
  transform?: 'lowercase' | 'uppercase' | 'trim' | 'none'
}

// Import configuration
export interface ImportConfig {
  entityType: DataEntityType
  fieldMappings: FieldMapping[]
  duplicateHandling: 'skip' | 'update' | 'create_new'
  duplicateCheckFields: string[]
}

// Import job status
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// Import job record
export interface ImportJob {
  id: string
  tenant_id: string
  user_id: string
  entity_type: DataEntityType
  file_name: string
  total_rows: number
  processed_rows: number
  success_count: number
  failure_count: number
  duplicate_count: number
  status: ImportJobStatus
  config: ImportConfig
  errors: ImportError[]
  created_at: string
  completed_at: string | null
}

// Import error record
export interface ImportError {
  row: number
  field?: string
  message: string
  data?: Record<string, unknown>
}

// Import preview row
export interface ImportPreviewRow {
  rowNumber: number
  data: Record<string, string>
  errors: string[]
  isDuplicate: boolean
}

// Import preview result
export interface ImportPreview {
  headers: string[]
  rows: ImportPreviewRow[]
  totalRows: number
  validRows: number
  errorRows: number
  duplicateRows: number
  suggestedMappings: FieldMapping[]
}

// Import result
export interface ImportResult {
  jobId: string
  success: number
  failed: number
  duplicates: number
  errors: ImportError[]
}

// Export configuration
export interface ExportConfig {
  entityType: DataEntityType
  fields: string[]
  format: 'csv' | 'xlsx'
  filters?: ExportFilter[]
  includeHeaders: boolean
}

// Export filter
export interface ExportFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'
  value: string | number | string[]
}

// Export job status
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Export job record
export interface ExportJob {
  id: string
  tenant_id: string
  user_id: string
  entity_type: DataEntityType
  file_name: string
  total_records: number
  status: ExportJobStatus
  config: ExportConfig
  download_url: string | null
  created_at: string
  completed_at: string | null
  expires_at: string | null
}

// Bulk operation types
export type BulkOperationType = 'update' | 'delete' | 'reassign' | 'merge'

// Bulk operation configuration
export interface BulkOperationConfig {
  operation: BulkOperationType
  entityType: DataEntityType
  recordIds: string[]
  updateData?: Record<string, unknown>
  newOwnerId?: string
  primaryRecordId?: string // For merge operations
}

// Bulk operation result
export interface BulkOperationResult {
  operation: BulkOperationType
  success_count: number
  failure_count: number
  errors: { id: string; error: string }[]
}

// Field definitions for each entity type
export interface EntityFieldDefinition {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum'
  required: boolean
  unique?: boolean
  enumValues?: string[]
}

// Entity field mappings
export const ENTITY_FIELDS: Record<DataEntityType, EntityFieldDefinition[]> = {
  contacts: [
    { name: 'first_name', label: 'First Name', type: 'string', required: true },
    { name: 'last_name', label: 'Last Name', type: 'string', required: false },
    { name: 'email', label: 'Email', type: 'string', required: false, unique: true },
    { name: 'phone', label: 'Phone', type: 'string', required: false },
    { name: 'title', label: 'Job Title', type: 'string', required: false },
    { name: 'account_id', label: 'Account ID', type: 'string', required: false },
  ],
  leads: [
    { name: 'first_name', label: 'First Name', type: 'string', required: true },
    { name: 'last_name', label: 'Last Name', type: 'string', required: false },
    { name: 'email', label: 'Email', type: 'string', required: false, unique: true },
    { name: 'phone', label: 'Phone', type: 'string', required: false },
    { name: 'company', label: 'Company', type: 'string', required: false },
    { name: 'title', label: 'Job Title', type: 'string', required: false },
    { name: 'source', label: 'Lead Source', type: 'string', required: false },
    { name: 'status', label: 'Status', type: 'enum', required: false, enumValues: ['new', 'contacted', 'qualified', 'unqualified', 'converted'] },
  ],
  accounts: [
    { name: 'name', label: 'Company Name', type: 'string', required: true },
    { name: 'domain', label: 'Website Domain', type: 'string', required: false, unique: true },
    { name: 'industry', label: 'Industry', type: 'string', required: false },
    { name: 'employee_count', label: 'Employee Count', type: 'string', required: false },
    { name: 'annual_revenue', label: 'Annual Revenue', type: 'string', required: false },
  ],
  deals: [
    { name: 'name', label: 'Deal Name', type: 'string', required: true },
    { name: 'value', label: 'Value', type: 'number', required: false },
    { name: 'stage_id', label: 'Stage ID', type: 'string', required: true },
    { name: 'account_id', label: 'Account ID', type: 'string', required: false },
    { name: 'contact_id', label: 'Contact ID', type: 'string', required: false },
    { name: 'expected_close_date', label: 'Expected Close Date', type: 'date', required: false },
  ],
}

// Get required fields for entity type
export function getRequiredFields(entityType: DataEntityType): string[] {
  return ENTITY_FIELDS[entityType]
    .filter(f => f.required)
    .map(f => f.name)
}

// Get unique fields for entity type (used for duplicate detection)
export function getUniqueFields(entityType: DataEntityType): string[] {
  return ENTITY_FIELDS[entityType]
    .filter(f => f.unique)
    .map(f => f.name)
}

// Progress callback type
export type ProgressCallback = (progress: {
  current: number
  total: number
  status: string
}) => void
