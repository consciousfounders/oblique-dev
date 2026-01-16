-- Add additional fields to contacts table for issue #22
-- Contact creation with account association enhancement

-- Add new contact fields
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS secondary_email text,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS lead_source text,
ADD COLUMN IF NOT EXISTS notes text;

-- Create index on email for duplicate detection
CREATE INDEX IF NOT EXISTS contacts_email_idx ON public.contacts(email);
CREATE INDEX IF NOT EXISTS contacts_tenant_email_idx ON public.contacts(tenant_id, email);
