// Entity Metadata Service
// Provides schema information about CRM entities for the API

import type { EntityMetadata, FieldMetadata, RelationshipMetadata } from './types'

// Account entity metadata
const accountMetadata: EntityMetadata = {
  name: 'accounts',
  label: 'Account',
  plural_label: 'Accounts',
  description: 'Companies or organizations in your CRM',
  fields: [
    { name: 'id', label: 'ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'name', label: 'Name', type: 'string', required: true, read_only: false, nullable: false, max_length: 255, description: 'Company name' },
    { name: 'domain', label: 'Domain', type: 'string', required: false, read_only: false, nullable: true, max_length: 255, description: 'Company website domain' },
    { name: 'industry', label: 'Industry', type: 'string', required: false, read_only: false, nullable: true, max_length: 100, description: 'Industry sector' },
    { name: 'employee_count', label: 'Employee Count', type: 'string', required: false, read_only: false, nullable: true, description: 'Approximate number of employees' },
    { name: 'annual_revenue', label: 'Annual Revenue', type: 'string', required: false, read_only: false, nullable: true, description: 'Annual revenue range' },
    { name: 'owner_id', label: 'Owner ID', type: 'uuid', required: false, read_only: false, nullable: true, description: 'User ID of the account owner' },
    { name: 'tenant_id', label: 'Tenant ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'created_at', label: 'Created At', type: 'datetime', required: true, read_only: true, nullable: false },
    { name: 'updated_at', label: 'Updated At', type: 'datetime', required: true, read_only: true, nullable: false },
  ],
  relationships: [
    { name: 'owner', label: 'Owner', target_entity: 'users', type: 'belongs_to', foreign_key: 'owner_id' },
    { name: 'contacts', label: 'Contacts', target_entity: 'contacts', type: 'has_many', foreign_key: 'account_id' },
    { name: 'deals', label: 'Deals', target_entity: 'deals', type: 'has_many', foreign_key: 'account_id' },
  ],
}

// Contact entity metadata
const contactMetadata: EntityMetadata = {
  name: 'contacts',
  label: 'Contact',
  plural_label: 'Contacts',
  description: 'Individual people associated with accounts',
  fields: [
    { name: 'id', label: 'ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'first_name', label: 'First Name', type: 'string', required: true, read_only: false, nullable: false, max_length: 100 },
    { name: 'last_name', label: 'Last Name', type: 'string', required: false, read_only: false, nullable: true, max_length: 100 },
    { name: 'email', label: 'Email', type: 'string', required: false, read_only: false, nullable: true, max_length: 255, description: 'Email address' },
    { name: 'phone', label: 'Phone', type: 'string', required: false, read_only: false, nullable: true, max_length: 50, description: 'Phone number' },
    { name: 'title', label: 'Title', type: 'string', required: false, read_only: false, nullable: true, max_length: 100, description: 'Job title' },
    { name: 'account_id', label: 'Account ID', type: 'uuid', required: false, read_only: false, nullable: true, description: 'Associated account' },
    { name: 'owner_id', label: 'Owner ID', type: 'uuid', required: false, read_only: false, nullable: true, description: 'User ID of the contact owner' },
    { name: 'tenant_id', label: 'Tenant ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'created_at', label: 'Created At', type: 'datetime', required: true, read_only: true, nullable: false },
    { name: 'updated_at', label: 'Updated At', type: 'datetime', required: true, read_only: true, nullable: false },
  ],
  relationships: [
    { name: 'account', label: 'Account', target_entity: 'accounts', type: 'belongs_to', foreign_key: 'account_id' },
    { name: 'owner', label: 'Owner', target_entity: 'users', type: 'belongs_to', foreign_key: 'owner_id' },
    { name: 'deals', label: 'Deals', target_entity: 'deals', type: 'has_many', foreign_key: 'contact_id' },
  ],
}

// Lead entity metadata
const leadMetadata: EntityMetadata = {
  name: 'leads',
  label: 'Lead',
  plural_label: 'Leads',
  description: 'Prospective customers not yet converted to contacts',
  fields: [
    { name: 'id', label: 'ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'first_name', label: 'First Name', type: 'string', required: true, read_only: false, nullable: false, max_length: 100 },
    { name: 'last_name', label: 'Last Name', type: 'string', required: false, read_only: false, nullable: true, max_length: 100 },
    { name: 'email', label: 'Email', type: 'string', required: false, read_only: false, nullable: true, max_length: 255 },
    { name: 'phone', label: 'Phone', type: 'string', required: false, read_only: false, nullable: true, max_length: 50 },
    { name: 'company', label: 'Company', type: 'string', required: false, read_only: false, nullable: true, max_length: 255, description: 'Company name' },
    { name: 'title', label: 'Title', type: 'string', required: false, read_only: false, nullable: true, max_length: 100, description: 'Job title' },
    { name: 'source', label: 'Source', type: 'string', required: false, read_only: false, nullable: true, max_length: 100, description: 'Lead source (e.g., Web, Referral)' },
    { name: 'status', label: 'Status', type: 'enum', required: true, read_only: false, nullable: false, enum_values: ['new', 'contacted', 'qualified', 'unqualified', 'converted'] },
    { name: 'owner_id', label: 'Owner ID', type: 'uuid', required: false, read_only: false, nullable: true },
    { name: 'converted_contact_id', label: 'Converted Contact ID', type: 'uuid', required: false, read_only: true, nullable: true, description: 'Contact ID after conversion' },
    { name: 'converted_account_id', label: 'Converted Account ID', type: 'uuid', required: false, read_only: true, nullable: true, description: 'Account ID after conversion' },
    { name: 'converted_at', label: 'Converted At', type: 'datetime', required: false, read_only: true, nullable: true },
    { name: 'tenant_id', label: 'Tenant ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'created_at', label: 'Created At', type: 'datetime', required: true, read_only: true, nullable: false },
    { name: 'updated_at', label: 'Updated At', type: 'datetime', required: true, read_only: true, nullable: false },
  ],
  relationships: [
    { name: 'owner', label: 'Owner', target_entity: 'users', type: 'belongs_to', foreign_key: 'owner_id' },
    { name: 'converted_contact', label: 'Converted Contact', target_entity: 'contacts', type: 'belongs_to', foreign_key: 'converted_contact_id' },
    { name: 'converted_account', label: 'Converted Account', target_entity: 'accounts', type: 'belongs_to', foreign_key: 'converted_account_id' },
  ],
}

// Deal entity metadata
const dealMetadata: EntityMetadata = {
  name: 'deals',
  label: 'Deal',
  plural_label: 'Deals',
  description: 'Sales opportunities in your pipeline',
  fields: [
    { name: 'id', label: 'ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'name', label: 'Name', type: 'string', required: true, read_only: false, nullable: false, max_length: 255, description: 'Deal name/title' },
    { name: 'value', label: 'Value', type: 'number', required: false, read_only: false, nullable: true, description: 'Deal value in currency' },
    { name: 'stage_id', label: 'Stage ID', type: 'uuid', required: true, read_only: false, nullable: false, description: 'Current pipeline stage' },
    { name: 'account_id', label: 'Account ID', type: 'uuid', required: false, read_only: false, nullable: true },
    { name: 'contact_id', label: 'Contact ID', type: 'uuid', required: false, read_only: false, nullable: true },
    { name: 'owner_id', label: 'Owner ID', type: 'uuid', required: false, read_only: false, nullable: true },
    { name: 'expected_close_date', label: 'Expected Close Date', type: 'date', required: false, read_only: false, nullable: true },
    { name: 'closed_at', label: 'Closed At', type: 'datetime', required: false, read_only: false, nullable: true },
    { name: 'won', label: 'Won', type: 'boolean', required: false, read_only: false, nullable: true, description: 'Whether the deal was won' },
    { name: 'tenant_id', label: 'Tenant ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'created_at', label: 'Created At', type: 'datetime', required: true, read_only: true, nullable: false },
    { name: 'updated_at', label: 'Updated At', type: 'datetime', required: true, read_only: true, nullable: false },
  ],
  relationships: [
    { name: 'stage', label: 'Stage', target_entity: 'deal_stages', type: 'belongs_to', foreign_key: 'stage_id' },
    { name: 'account', label: 'Account', target_entity: 'accounts', type: 'belongs_to', foreign_key: 'account_id' },
    { name: 'contact', label: 'Contact', target_entity: 'contacts', type: 'belongs_to', foreign_key: 'contact_id' },
    { name: 'owner', label: 'Owner', target_entity: 'users', type: 'belongs_to', foreign_key: 'owner_id' },
  ],
}

// Deal Stage entity metadata
const dealStageMetadata: EntityMetadata = {
  name: 'deal_stages',
  label: 'Deal Stage',
  plural_label: 'Deal Stages',
  description: 'Pipeline stages for deals',
  fields: [
    { name: 'id', label: 'ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'name', label: 'Name', type: 'string', required: true, read_only: false, nullable: false, max_length: 100 },
    { name: 'position', label: 'Position', type: 'number', required: true, read_only: false, nullable: false, description: 'Order in pipeline' },
    { name: 'probability', label: 'Probability', type: 'number', required: false, read_only: false, nullable: false, description: 'Win probability percentage' },
    { name: 'tenant_id', label: 'Tenant ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'created_at', label: 'Created At', type: 'datetime', required: true, read_only: true, nullable: false },
  ],
  relationships: [
    { name: 'deals', label: 'Deals', target_entity: 'deals', type: 'has_many', foreign_key: 'stage_id' },
  ],
}

// Activity entity metadata
const activityMetadata: EntityMetadata = {
  name: 'activities',
  label: 'Activity',
  plural_label: 'Activities',
  description: 'Activity log entries for CRM records',
  fields: [
    { name: 'id', label: 'ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'entity_type', label: 'Entity Type', type: 'string', required: true, read_only: false, nullable: false, description: 'Type of related entity' },
    { name: 'entity_id', label: 'Entity ID', type: 'uuid', required: true, read_only: false, nullable: false, description: 'ID of related entity' },
    { name: 'activity_type', label: 'Activity Type', type: 'string', required: true, read_only: false, nullable: false, description: 'Type of activity (e.g., call, email, meeting)' },
    { name: 'subject', label: 'Subject', type: 'string', required: false, read_only: false, nullable: true, max_length: 255 },
    { name: 'description', label: 'Description', type: 'string', required: false, read_only: false, nullable: true, description: 'Activity details' },
    { name: 'user_id', label: 'User ID', type: 'uuid', required: false, read_only: false, nullable: true },
    { name: 'tenant_id', label: 'Tenant ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'created_at', label: 'Created At', type: 'datetime', required: true, read_only: true, nullable: false },
  ],
  relationships: [
    { name: 'user', label: 'User', target_entity: 'users', type: 'belongs_to', foreign_key: 'user_id' },
  ],
}

// User entity metadata
const userMetadata: EntityMetadata = {
  name: 'users',
  label: 'User',
  plural_label: 'Users',
  description: 'CRM users within your organization',
  fields: [
    { name: 'id', label: 'ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'email', label: 'Email', type: 'string', required: true, read_only: true, nullable: false, max_length: 255 },
    { name: 'full_name', label: 'Full Name', type: 'string', required: false, read_only: false, nullable: true, max_length: 255 },
    { name: 'role', label: 'Role', type: 'enum', required: true, read_only: false, nullable: false, enum_values: ['admin', 'sdr', 'ae', 'am'] },
    { name: 'tenant_id', label: 'Tenant ID', type: 'uuid', required: true, read_only: true, nullable: false },
    { name: 'created_at', label: 'Created At', type: 'datetime', required: true, read_only: true, nullable: false },
    { name: 'updated_at', label: 'Updated At', type: 'datetime', required: true, read_only: true, nullable: false },
  ],
  relationships: [],
}

// Entity metadata registry
const entityRegistry: Record<string, EntityMetadata> = {
  accounts: accountMetadata,
  contacts: contactMetadata,
  leads: leadMetadata,
  deals: dealMetadata,
  deal_stages: dealStageMetadata,
  activities: activityMetadata,
  users: userMetadata,
}

// Get metadata for a specific entity
export function getEntityMetadata(entityName: string): EntityMetadata | null {
  return entityRegistry[entityName] || null
}

// Get all entity metadata
export function getAllEntityMetadata(): EntityMetadata[] {
  return Object.values(entityRegistry)
}

// Get list of all entity names
export function getEntityNames(): string[] {
  return Object.keys(entityRegistry)
}

// Get field metadata for an entity
export function getFieldMetadata(entityName: string, fieldName: string): FieldMetadata | null {
  const entity = entityRegistry[entityName]
  if (!entity) return null
  return entity.fields.find(f => f.name === fieldName) || null
}

// Get relationship metadata for an entity
export function getRelationshipMetadata(entityName: string, relationshipName: string): RelationshipMetadata | null {
  const entity = entityRegistry[entityName]
  if (!entity) return null
  return entity.relationships.find(r => r.name === relationshipName) || null
}

// Get writable fields for an entity (for create/update operations)
export function getWritableFields(entityName: string): FieldMetadata[] {
  const entity = entityRegistry[entityName]
  if (!entity) return []
  return entity.fields.filter(f => !f.read_only)
}

// Get required fields for an entity (for validation)
export function getRequiredFields(entityName: string): FieldMetadata[] {
  const entity = entityRegistry[entityName]
  if (!entity) return []
  return entity.fields.filter(f => f.required && !f.read_only)
}

// Validate data against entity schema
export function validateEntityData(
  entityName: string,
  data: Record<string, unknown>,
  isUpdate: boolean = false
): { valid: boolean; errors: string[] } {
  const entity = entityRegistry[entityName]
  if (!entity) {
    return { valid: false, errors: [`Unknown entity: ${entityName}`] }
  }

  const errors: string[] = []
  const requiredFields = getRequiredFields(entityName)

  // Check required fields (only for create, not update)
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (data[field.name] === undefined || data[field.name] === null) {
        errors.push(`Missing required field: ${field.name}`)
      }
    }
  }

  // Validate field types
  for (const [key, value] of Object.entries(data)) {
    const fieldMeta = getFieldMetadata(entityName, key)
    if (!fieldMeta) {
      errors.push(`Unknown field: ${key}`)
      continue
    }

    if (fieldMeta.read_only && !isUpdate) {
      errors.push(`Field is read-only: ${key}`)
      continue
    }

    if (value !== null && value !== undefined) {
      // Type validation
      switch (fieldMeta.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Field ${key} must be a string`)
          } else if (fieldMeta.max_length && value.length > fieldMeta.max_length) {
            errors.push(`Field ${key} exceeds max length of ${fieldMeta.max_length}`)
          }
          break
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`Field ${key} must be a number`)
          }
          break
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field ${key} must be a boolean`)
          }
          break
        case 'enum':
          if (fieldMeta.enum_values && !fieldMeta.enum_values.includes(value as string)) {
            errors.push(`Field ${key} must be one of: ${fieldMeta.enum_values.join(', ')}`)
          }
          break
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// Get expandable relationships for an entity
export function getExpandableRelationships(entityName: string): string[] {
  const entity = entityRegistry[entityName]
  if (!entity) return []
  return entity.relationships.filter(r => r.type === 'belongs_to').map(r => r.name)
}

// Get searchable fields for an entity (string fields that can be searched)
export function getSearchableFields(entityName: string): string[] {
  const entity = entityRegistry[entityName]
  if (!entity) return []
  return entity.fields
    .filter(f => f.type === 'string' && !f.read_only)
    .map(f => f.name)
}

// Get sortable fields for an entity
export function getSortableFields(entityName: string): string[] {
  const entity = entityRegistry[entityName]
  if (!entity) return []
  return entity.fields.map(f => f.name)
}

// Get filterable fields for an entity
export function getFilterableFields(entityName: string): string[] {
  const entity = entityRegistry[entityName]
  if (!entity) return []
  return entity.fields.map(f => f.name)
}

export { entityRegistry }
