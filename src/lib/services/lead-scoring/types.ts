// Lead Scoring Types and Constants

export type ScoreCategory = 'demographic' | 'behavioral' | 'engagement' | 'fit'

export interface ScoreBreakdown {
  demographic: number
  behavioral: number
  engagement: number
  fit: number
  total: number
}

export interface ScoringRule {
  id: string
  name: string
  description?: string
  category: ScoreCategory
  field_name: string
  operator: string
  field_value?: string
  field_values?: string[]
  points: number
  is_active: boolean
  priority: number
}

export interface ScoringSettings {
  cold_threshold: number
  warm_threshold: number
  hot_threshold: number
  qualified_threshold: number
  auto_convert_enabled: boolean
  auto_convert_threshold: number
  score_decay_enabled: boolean
  score_decay_days: number
  score_decay_percentage: number
  qualification_framework: 'bant' | 'meddic' | 'custom'
  qualification_criteria: Record<string, unknown> | null
}

export interface LeadScoreResult {
  score: number
  label: 'cold' | 'warm' | 'hot' | 'qualified'
  breakdown: ScoreBreakdown
  matched_rules: string[]
}

// Default scoring settings
export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  cold_threshold: 0,
  warm_threshold: 25,
  hot_threshold: 50,
  qualified_threshold: 75,
  auto_convert_enabled: false,
  auto_convert_threshold: 80,
  score_decay_enabled: true,
  score_decay_days: 30,
  score_decay_percentage: 10,
  qualification_framework: 'bant',
  qualification_criteria: null,
}

// BANT qualification criteria
export const BANT_CRITERIA = {
  budget: { label: 'Budget', description: 'Has confirmed budget for purchase' },
  authority: { label: 'Authority', description: 'Is a decision maker or influencer' },
  need: { label: 'Need', description: 'Has a clear need for the solution' },
  timeline: { label: 'Timeline', description: 'Has a defined purchase timeline' },
}

// MEDDIC qualification criteria
export const MEDDIC_CRITERIA = {
  metrics: { label: 'Metrics', description: 'Quantified benefits and success metrics' },
  economic_buyer: { label: 'Economic Buyer', description: 'Identified economic buyer' },
  decision_criteria: { label: 'Decision Criteria', description: 'Understand evaluation criteria' },
  decision_process: { label: 'Decision Process', description: 'Mapped decision process' },
  identify_pain: { label: 'Identify Pain', description: 'Identified business pain points' },
  champion: { label: 'Champion', description: 'Have an internal champion' },
}

// Score label colors for UI
export const SCORE_LABEL_COLORS = {
  cold: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-500',
  },
  warm: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    ring: 'ring-yellow-500',
  },
  hot: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-500',
  },
  qualified: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    ring: 'ring-green-500',
  },
}

// Score category colors for breakdown display
export const CATEGORY_COLORS = {
  demographic: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    fill: 'fill-purple-500',
  },
  behavioral: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    fill: 'fill-cyan-500',
  },
  engagement: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    fill: 'fill-pink-500',
  },
  fit: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    fill: 'fill-emerald-500',
  },
}

// Default scoring rules templates
export const DEFAULT_SCORING_RULES: Omit<ScoringRule, 'id'>[] = [
  // Demographic rules
  {
    name: 'C-Level Title',
    description: 'Lead has C-level or VP title',
    category: 'demographic',
    field_name: 'title',
    operator: 'contains',
    field_value: 'CEO,CTO,CFO,COO,VP,Chief,Director',
    points: 20,
    is_active: true,
    priority: 1,
  },
  {
    name: 'Manager Title',
    description: 'Lead has manager level title',
    category: 'demographic',
    field_name: 'title',
    operator: 'contains',
    field_value: 'Manager,Head,Lead',
    points: 10,
    is_active: true,
    priority: 2,
  },
  {
    name: 'Enterprise Company Size',
    description: 'Company has 1000+ employees',
    category: 'demographic',
    field_name: 'company_size',
    operator: 'in',
    field_values: ['1001-5000', '5001-10000', '10000+'],
    points: 15,
    is_active: true,
    priority: 3,
  },
  {
    name: 'SMB Company Size',
    description: 'Company has 50-1000 employees',
    category: 'demographic',
    field_name: 'company_size',
    operator: 'in',
    field_values: ['51-200', '201-500', '501-1000'],
    points: 10,
    is_active: true,
    priority: 4,
  },
  // Behavioral rules
  {
    name: 'Form Fill',
    description: 'Lead submitted a form',
    category: 'behavioral',
    field_name: 'source',
    operator: 'equals',
    field_value: 'Web Form',
    points: 15,
    is_active: true,
    priority: 1,
  },
  {
    name: 'Demo Request',
    description: 'Lead requested a demo',
    category: 'behavioral',
    field_name: 'source',
    operator: 'contains',
    field_value: 'Demo',
    points: 25,
    is_active: true,
    priority: 2,
  },
  // Engagement rules
  {
    name: 'High Activity',
    description: 'Lead has 5+ activities',
    category: 'engagement',
    field_name: 'activity_count',
    operator: 'greater_than',
    field_value: '5',
    points: 20,
    is_active: true,
    priority: 1,
  },
  {
    name: 'Medium Activity',
    description: 'Lead has 2-5 activities',
    category: 'engagement',
    field_name: 'activity_count',
    operator: 'greater_than',
    field_value: '2',
    points: 10,
    is_active: true,
    priority: 2,
  },
  {
    name: 'Contacted Status',
    description: 'Lead has been contacted',
    category: 'engagement',
    field_name: 'status',
    operator: 'equals',
    field_value: 'contacted',
    points: 10,
    is_active: true,
    priority: 3,
  },
  // Fit rules
  {
    name: 'Has Email',
    description: 'Lead has email address',
    category: 'fit',
    field_name: 'email',
    operator: 'exists',
    points: 5,
    is_active: true,
    priority: 1,
  },
  {
    name: 'Has Phone',
    description: 'Lead has phone number',
    category: 'fit',
    field_name: 'phone',
    operator: 'exists',
    points: 5,
    is_active: true,
    priority: 2,
  },
  {
    name: 'Has Company',
    description: 'Lead has company name',
    category: 'fit',
    field_name: 'company',
    operator: 'exists',
    points: 5,
    is_active: true,
    priority: 3,
  },
]
