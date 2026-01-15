-- Booking status enum
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled');

-- Bookings table (stores booking data from Cal.com webhooks)
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users,
  -- Cal.com booking reference
  cal_booking_id text,
  cal_booking_uid text unique,
  -- Booking details
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text default 'UTC',
  -- Attendee info
  attendee_name text,
  attendee_email text,
  attendee_phone text,
  -- Event type
  event_type text,
  event_type_slug text,
  -- Location (zoom, meet, phone, etc.)
  location_type text,
  location_value text,
  -- Meeting link
  meeting_url text,
  -- Status
  status public.booking_status default 'confirmed' not null,
  -- Linked CRM entities
  contact_id uuid references public.contacts on delete set null,
  lead_id uuid references public.leads on delete set null,
  deal_id uuid references public.deals on delete set null,
  -- Cancellation details
  cancelled_at timestamptz,
  cancellation_reason text,
  -- Rescheduling
  rescheduled_from_id uuid references public.bookings on delete set null,
  rescheduled_to_id uuid references public.bookings on delete set null,
  -- Metadata
  metadata jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Availability rules table
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users not null,
  name text not null,
  -- Day of week (0=Sunday, 6=Saturday) or null for all days
  day_of_week integer check (day_of_week >= 0 and day_of_week <= 6),
  -- Time range
  start_time time not null,
  end_time time not null,
  timezone text default 'UTC',
  -- Whether this rule is currently active
  is_active boolean default true,
  -- Priority for overlapping rules (higher wins)
  priority integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Booking links table (shareable booking links with custom settings)
create table public.booking_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users not null,
  -- The slug for this booking link
  slug text not null,
  -- Display name
  name text not null,
  description text,
  -- Cal.com event type this links to
  cal_event_type text not null,
  -- Pre-filled guest info (optional)
  default_name text,
  default_email text,
  -- Linked CRM entity (when booking from a contact/lead page)
  linked_entity_type text,
  linked_entity_id uuid,
  -- Settings
  is_active boolean default true,
  -- Stats
  view_count integer default 0,
  booking_count integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Unique slug per tenant
  unique(tenant_id, slug)
);

-- Indexes
create index bookings_tenant_id_idx on public.bookings(tenant_id);
create index bookings_user_id_idx on public.bookings(user_id);
create index bookings_start_time_idx on public.bookings(start_time);
create index bookings_status_idx on public.bookings(status);
create index bookings_attendee_email_idx on public.bookings(attendee_email);
create index bookings_contact_id_idx on public.bookings(contact_id);
create index bookings_lead_id_idx on public.bookings(lead_id);
create index bookings_cal_booking_uid_idx on public.bookings(cal_booking_uid);

create index availability_rules_tenant_id_idx on public.availability_rules(tenant_id);
create index availability_rules_user_id_idx on public.availability_rules(user_id);

create index booking_links_tenant_id_idx on public.booking_links(tenant_id);
create index booking_links_user_id_idx on public.booking_links(user_id);
create index booking_links_slug_idx on public.booking_links(slug);

-- Enable RLS
alter table public.bookings enable row level security;
alter table public.availability_rules enable row level security;
alter table public.booking_links enable row level security;

-- RLS Policies for bookings
create policy "Users can view own tenant bookings"
  on public.bookings for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant bookings"
  on public.bookings for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant bookings"
  on public.bookings for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant bookings"
  on public.bookings for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for availability_rules
create policy "Users can view own tenant availability rules"
  on public.availability_rules for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant availability rules"
  on public.availability_rules for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant availability rules"
  on public.availability_rules for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant availability rules"
  on public.availability_rules for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for booking_links
create policy "Users can view own tenant booking links"
  on public.booking_links for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant booking links"
  on public.booking_links for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant booking links"
  on public.booking_links for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant booking links"
  on public.booking_links for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at triggers
create trigger bookings_updated_at before update on public.bookings
  for each row execute procedure public.handle_updated_at();

create trigger availability_rules_updated_at before update on public.availability_rules
  for each row execute procedure public.handle_updated_at();

create trigger booking_links_updated_at before update on public.booking_links
  for each row execute procedure public.handle_updated_at();
