-- Account type enum
create type public.account_type as enum ('prospect', 'customer', 'partner', 'vendor', 'other');

-- Add enhanced fields to accounts table
alter table public.accounts
  add column if not exists website text,
  add column if not exists phone text,
  add column if not exists fax text,
  add column if not exists account_type public.account_type default 'prospect',
  add column if not exists description text,
  add column if not exists parent_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists billing_street text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country text,
  add column if not exists shipping_street text,
  add column if not exists shipping_city text,
  add column if not exists shipping_state text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country text;

-- Index for parent account lookup (hierarchy queries)
create index if not exists accounts_parent_account_id_idx on public.accounts(parent_account_id);

-- Index for account type filtering
create index if not exists accounts_account_type_idx on public.accounts(account_type);
