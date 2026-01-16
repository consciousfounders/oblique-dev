import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { AccountCombobox } from '@/components/contacts/AccountCombobox'
import { Plus, Search, Phone, Mail, Building2, Upload, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  secondary_email: string | null
  phone: string | null
  mobile_phone: string | null
  title: string | null
  department: string | null
  account_id: string | null
  lead_source: string | null
  notes: string | null
  accounts: { name: string } | null
  created_at: string
}

interface DuplicateContact {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  accounts: { name: string } | null
}

const LEAD_SOURCES = [
  'Website',
  'Referral',
  'LinkedIn',
  'Conference',
  'Cold Call',
  'Email Campaign',
  'Partner',
  'Advertisement',
  'Other',
]

const initialContactForm = {
  first_name: '',
  last_name: '',
  email: '',
  secondary_email: '',
  phone: '',
  mobile_phone: '',
  title: '',
  department: '',
  account_id: null as string | null,
  lead_source: '',
  notes: '',
}

export function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newContact, setNewContact] = useState(initialContactForm)
  const [submitting, setSubmitting] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateContact[]>([])
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; failed: number; duplicates: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.tenantId) {
      fetchContacts()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchContacts() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, accounts(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  async function checkDuplicates(email: string): Promise<DuplicateContact[]> {
    if (!email || !user?.tenantId) return []

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, accounts(name)')
        .eq('tenant_id', user.tenantId)
        .eq('email', email.toLowerCase().trim())

      if (error) throw error

      // Map the data to match the DuplicateContact interface
      // Supabase returns related data which may be null or an object depending on the relationship
      return (data || []).map(contact => {
        const accountData = contact.accounts
        return {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          accounts: accountData && typeof accountData === 'object' && !Array.isArray(accountData)
            ? accountData as { name: string }
            : null,
        }
      })
    } catch (error) {
      console.error('Error checking duplicates:', error)
      return []
    }
  }

  async function handleEmailBlur() {
    if (newContact.email) {
      const found = await checkDuplicates(newContact.email)
      setDuplicates(found)
      if (found.length > 0) {
        setShowDuplicateWarning(true)
      }
    }
  }

  async function createContact(e: React.FormEvent, skipDuplicateCheck = false) {
    e.preventDefault()
    if (!user?.tenantId) return

    // Account is required
    if (!newContact.account_id) {
      toast.error('Please select an account')
      return
    }

    // Check for duplicates if not skipping
    if (!skipDuplicateCheck && newContact.email) {
      const found = await checkDuplicates(newContact.email)
      if (found.length > 0) {
        setDuplicates(found)
        setShowDuplicateWarning(true)
        return
      }
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('contacts').insert({
        tenant_id: user.tenantId,
        first_name: newContact.first_name.trim(),
        last_name: newContact.last_name.trim() || null,
        email: newContact.email.toLowerCase().trim() || null,
        secondary_email: newContact.secondary_email.toLowerCase().trim() || null,
        phone: newContact.phone.trim() || null,
        mobile_phone: newContact.mobile_phone.trim() || null,
        title: newContact.title.trim() || null,
        department: newContact.department.trim() || null,
        account_id: newContact.account_id,
        lead_source: newContact.lead_source || null,
        notes: newContact.notes.trim() || null,
        owner_id: user.id,
      })

      if (error) throw error

      toast.success('Contact created successfully')
      setShowCreate(false)
      setNewContact(initialContactForm)
      setDuplicates([])
      fetchContacts()
    } catch (error) {
      console.error('Error creating contact:', error)
      toast.error('Failed to create contact')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCreateAnyway(e: React.FormEvent) {
    setShowDuplicateWarning(false)
    createContact(e, true)
  }

  async function handleImportCSV() {
    if (!importFile || !user?.tenantId) return

    setImporting(true)
    setImportResults(null)

    try {
      const text = await importFile.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows')
        return
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      const requiredHeaders = ['first_name']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`)
        return
      }

      let success = 0
      let failed = 0
      let duplicateCount = 0

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.length !== headers.length) {
          failed++
          continue
        }

        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx]?.trim().replace(/"/g, '') || ''
        })

        // Check for duplicates by email
        if (row.email) {
          const existing = await checkDuplicates(row.email)
          if (existing.length > 0) {
            duplicateCount++
            continue
          }
        }

        // Require account_id if provided, otherwise skip account association
        try {
          const { error } = await supabase.from('contacts').insert({
            tenant_id: user.tenantId,
            first_name: row.first_name,
            last_name: row.last_name || null,
            email: row.email?.toLowerCase() || null,
            secondary_email: row.secondary_email?.toLowerCase() || null,
            phone: row.phone || null,
            mobile_phone: row.mobile_phone || null,
            title: row.title || null,
            department: row.department || null,
            account_id: row.account_id || null,
            lead_source: row.lead_source || null,
            notes: row.notes || null,
            owner_id: user.id,
          })

          if (error) throw error
          success++
        } catch {
          failed++
        }
      }

      setImportResults({ success, failed, duplicates: duplicateCount })

      if (success > 0) {
        fetchContacts()
        toast.success(`Successfully imported ${success} contacts`)
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      toast.error('Failed to import CSV')
    } finally {
      setImporting(false)
    }
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const filteredContacts = contacts.filter((contact) => {
    const searchLower = search.toLowerCase()
    return (
      contact.first_name.toLowerCase().includes(searchLower) ||
      contact.last_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.accounts?.name.toLowerCase().includes(searchLower) ||
      contact.title?.toLowerCase().includes(searchLower) ||
      contact.department?.toLowerCase().includes(searchLower)
    )
  })

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">{contacts.length} total contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts by name, email, account, title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Contact Form */}
      {showCreate && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New Contact</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreate(false)
                setNewContact(initialContactForm)
                setDuplicates([])
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={createContact} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">First Name *</label>
                  <Input
                    placeholder="John"
                    value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Last Name</label>
                  <Input
                    placeholder="Doe"
                    value={newContact.last_name}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Account Selector */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Account *</label>
                <AccountCombobox
                  value={newContact.account_id}
                  onChange={(id) => setNewContact({ ...newContact, account_id: id })}
                  required
                  placeholder="Select or create account..."
                />
              </div>

              {/* Email Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Primary Email</label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    onBlur={handleEmailBlur}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Secondary Email</label>
                  <Input
                    type="email"
                    placeholder="john.doe@personal.com"
                    value={newContact.secondary_email}
                    onChange={(e) => setNewContact({ ...newContact, secondary_email: e.target.value })}
                  />
                </div>
              </div>

              {/* Phone Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Work Phone</label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mobile Phone</label>
                  <Input
                    placeholder="+1 (555) 987-6543"
                    value={newContact.mobile_phone}
                    onChange={(e) => setNewContact({ ...newContact, mobile_phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Job Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Job Title</label>
                  <Input
                    placeholder="VP of Sales"
                    value={newContact.title}
                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Department</label>
                  <Input
                    placeholder="Sales"
                    value={newContact.department}
                    onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                  />
                </div>
              </div>

              {/* Lead Source */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Lead Source</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newContact.lead_source}
                  onChange={(e) => setNewContact({ ...newContact, lead_source: e.target.value })}
                >
                  <option value="">Select lead source...</option>
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder="Add any notes about this contact..."
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                />
              </div>

              {/* Duplicate Warning Inline */}
              {duplicates.length > 0 && !showDuplicateWarning && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Potential duplicate found
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      A contact with this email already exists. You can still create this contact if needed.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Contact'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    setNewContact(initialContactForm)
                    setDuplicates([])
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Potential Duplicate Contact
            </DialogTitle>
            <DialogDescription>
              A contact with this email address already exists in your system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium">Existing contact(s):</p>
            {duplicates.map((dup) => (
              <div key={dup.id} className="p-3 bg-muted rounded-md">
                <p className="font-medium">
                  {dup.first_name} {dup.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{dup.email}</p>
                {dup.accounts && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {dup.accounts.name}
                  </p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDuplicateWarning(false)}>
              Cancel
            </Button>
            <Link to={`/contacts/${duplicates[0]?.id}`}>
              <Button variant="secondary">View Existing Contact</Button>
            </Link>
            <Button onClick={handleCreateAnyway}>Create Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open)
        if (!open) {
          setImportFile(null)
          setImportResults(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with contact data. Required column: first_name. Optional columns: last_name, email, secondary_email, phone, mobile_phone, title, department, account_id, lead_source, notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {importFile ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium">{importFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setImportFile(null)
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p>Click to select a CSV file</p>
                </div>
              )}
            </div>

            {importResults && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p><strong>Import Results:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li className="text-green-600 dark:text-green-400">
                    {importResults.success} contacts imported successfully
                  </li>
                  {importResults.duplicates > 0 && (
                    <li className="text-yellow-600 dark:text-yellow-400">
                      {importResults.duplicates} duplicates skipped
                    </li>
                  )}
                  {importResults.failed > 0 && (
                    <li className="text-red-600 dark:text-red-400">
                      {importResults.failed} rows failed
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              {importResults ? 'Close' : 'Cancel'}
            </Button>
            {!importResults && (
              <Button onClick={handleImportCSV} disabled={!importFile || importing}>
                {importing ? 'Importing...' : 'Import'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contacts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search ? 'No contacts match your search' : 'No contacts yet. Add your first contact!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredContacts.map((contact) => (
            <Link key={contact.id} to={`/contacts/${contact.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </h3>
                        {contact.accounts && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs">
                            <Building2 className="w-3 h-3" />
                            {contact.accounts.name}
                          </span>
                        )}
                      </div>
                      {(contact.title || contact.department) && (
                        <p className="text-sm text-muted-foreground">
                          {contact.title}
                          {contact.title && contact.department && ' - '}
                          {contact.department}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    {contact.lead_source && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {contact.lead_source}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
