-- Migration: User Role Management System
-- Issue: #21 - Core: User role management (Admin, AE, AM, Sales Manager)

-- Add sales_manager role to the user_role enum
alter type public.user_role add value 'sales_manager';

-- Create a permissions table for granular RBAC
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.user_role not null,
  permission text not null,
  created_at timestamptz default now() not null,
  unique(role, permission)
);

-- Enable RLS on role_permissions
alter table public.role_permissions enable row level security;

-- RLS Policies for role_permissions (read-only for all authenticated users)
create policy "Anyone can view role permissions"
  on public.role_permissions for select
  using (true);

-- Insert default permissions for each role
-- Permissions follow pattern: module.action (e.g., leads.create, deals.view)

-- Admin: Full system access
insert into public.role_permissions (role, permission) values
  -- User & Settings Management
  ('admin', 'users.view'),
  ('admin', 'users.create'),
  ('admin', 'users.update'),
  ('admin', 'users.delete'),
  ('admin', 'users.assign_role'),
  ('admin', 'settings.view'),
  ('admin', 'settings.update'),
  ('admin', 'teams.view'),
  ('admin', 'teams.create'),
  ('admin', 'teams.update'),
  ('admin', 'teams.delete'),
  ('admin', 'territories.view'),
  ('admin', 'territories.create'),
  ('admin', 'territories.update'),
  ('admin', 'territories.delete'),
  ('admin', 'deal_stages.view'),
  ('admin', 'deal_stages.create'),
  ('admin', 'deal_stages.update'),
  ('admin', 'deal_stages.delete'),
  ('admin', 'assignment_rules.view'),
  ('admin', 'assignment_rules.create'),
  ('admin', 'assignment_rules.update'),
  ('admin', 'assignment_rules.delete'),
  ('admin', 'custom_fields.view'),
  ('admin', 'custom_fields.create'),
  ('admin', 'custom_fields.update'),
  ('admin', 'custom_fields.delete'),
  ('admin', 'enrichment.view'),
  ('admin', 'enrichment.update'),
  ('admin', 'developer.view'),
  ('admin', 'developer.manage'),
  -- Core CRM (full access)
  ('admin', 'leads.view'),
  ('admin', 'leads.view_all'),
  ('admin', 'leads.create'),
  ('admin', 'leads.update'),
  ('admin', 'leads.delete'),
  ('admin', 'contacts.view'),
  ('admin', 'contacts.view_all'),
  ('admin', 'contacts.create'),
  ('admin', 'contacts.update'),
  ('admin', 'contacts.delete'),
  ('admin', 'accounts.view'),
  ('admin', 'accounts.view_all'),
  ('admin', 'accounts.create'),
  ('admin', 'accounts.update'),
  ('admin', 'accounts.delete'),
  ('admin', 'deals.view'),
  ('admin', 'deals.view_all'),
  ('admin', 'deals.create'),
  ('admin', 'deals.update'),
  ('admin', 'deals.delete'),
  ('admin', 'activities.view'),
  ('admin', 'activities.view_all'),
  ('admin', 'activities.create'),
  -- Reporting & Analytics
  ('admin', 'reports.view'),
  ('admin', 'reports.view_all'),
  ('admin', 'forecasting.view'),
  ('admin', 'forecasting.view_all'),
  ('admin', 'forecasting.update'),
  ('admin', 'dashboard.view'),
  ('admin', 'dashboard.view_all'),
  -- Products & Quotes
  ('admin', 'products.view'),
  ('admin', 'products.create'),
  ('admin', 'products.update'),
  ('admin', 'products.delete'),
  ('admin', 'quotes.view'),
  ('admin', 'quotes.view_all'),
  ('admin', 'quotes.create'),
  ('admin', 'quotes.update'),
  ('admin', 'quotes.delete'),
  -- Campaigns & Forms
  ('admin', 'campaigns.view'),
  ('admin', 'campaigns.create'),
  ('admin', 'campaigns.update'),
  ('admin', 'campaigns.delete'),
  ('admin', 'forms.view'),
  ('admin', 'forms.create'),
  ('admin', 'forms.update'),
  ('admin', 'forms.delete'),
  -- Data Management
  ('admin', 'data.import'),
  ('admin', 'data.export'),
  ('admin', 'data.bulk_operations');

-- Sales Manager: Team oversight, reporting, pipeline management
insert into public.role_permissions (role, permission) values
  -- Team Management (can view, limited management)
  ('sales_manager', 'users.view'),
  ('sales_manager', 'teams.view'),
  ('sales_manager', 'territories.view'),
  ('sales_manager', 'assignment_rules.view'),
  ('sales_manager', 'assignment_rules.create'),
  ('sales_manager', 'assignment_rules.update'),
  ('sales_manager', 'deal_stages.view'),
  ('sales_manager', 'settings.view'),
  -- Core CRM (team-wide view)
  ('sales_manager', 'leads.view'),
  ('sales_manager', 'leads.view_team'),
  ('sales_manager', 'leads.create'),
  ('sales_manager', 'leads.update'),
  ('sales_manager', 'leads.delete'),
  ('sales_manager', 'contacts.view'),
  ('sales_manager', 'contacts.view_team'),
  ('sales_manager', 'contacts.create'),
  ('sales_manager', 'contacts.update'),
  ('sales_manager', 'contacts.delete'),
  ('sales_manager', 'accounts.view'),
  ('sales_manager', 'accounts.view_team'),
  ('sales_manager', 'accounts.create'),
  ('sales_manager', 'accounts.update'),
  ('sales_manager', 'accounts.delete'),
  ('sales_manager', 'deals.view'),
  ('sales_manager', 'deals.view_team'),
  ('sales_manager', 'deals.create'),
  ('sales_manager', 'deals.update'),
  ('sales_manager', 'deals.delete'),
  ('sales_manager', 'activities.view'),
  ('sales_manager', 'activities.view_team'),
  ('sales_manager', 'activities.create'),
  -- Reporting & Analytics (team-wide)
  ('sales_manager', 'reports.view'),
  ('sales_manager', 'reports.view_team'),
  ('sales_manager', 'forecasting.view'),
  ('sales_manager', 'forecasting.view_team'),
  ('sales_manager', 'forecasting.update'),
  ('sales_manager', 'dashboard.view'),
  ('sales_manager', 'dashboard.view_team'),
  -- Products & Quotes
  ('sales_manager', 'products.view'),
  ('sales_manager', 'quotes.view'),
  ('sales_manager', 'quotes.view_team'),
  ('sales_manager', 'quotes.create'),
  ('sales_manager', 'quotes.update'),
  ('sales_manager', 'quotes.delete'),
  -- Campaigns
  ('sales_manager', 'campaigns.view'),
  ('sales_manager', 'forms.view'),
  -- Data Management (limited)
  ('sales_manager', 'data.export');

-- Account Executive (AE): Lead/opportunity management, deal creation
insert into public.role_permissions (role, permission) values
  -- Core CRM (own records)
  ('ae', 'leads.view'),
  ('ae', 'leads.view_own'),
  ('ae', 'leads.create'),
  ('ae', 'leads.update'),
  ('ae', 'leads.delete'),
  ('ae', 'contacts.view'),
  ('ae', 'contacts.view_own'),
  ('ae', 'contacts.create'),
  ('ae', 'contacts.update'),
  ('ae', 'contacts.delete'),
  ('ae', 'accounts.view'),
  ('ae', 'accounts.view_own'),
  ('ae', 'accounts.create'),
  ('ae', 'accounts.update'),
  ('ae', 'accounts.delete'),
  ('ae', 'deals.view'),
  ('ae', 'deals.view_own'),
  ('ae', 'deals.create'),
  ('ae', 'deals.update'),
  ('ae', 'deals.delete'),
  ('ae', 'activities.view'),
  ('ae', 'activities.view_own'),
  ('ae', 'activities.create'),
  ('ae', 'deal_stages.view'),
  ('ae', 'teams.view'),
  ('ae', 'territories.view'),
  -- Reporting & Analytics (own data)
  ('ae', 'reports.view'),
  ('ae', 'reports.view_own'),
  ('ae', 'forecasting.view'),
  ('ae', 'forecasting.view_own'),
  ('ae', 'forecasting.update'),
  ('ae', 'dashboard.view'),
  -- Products & Quotes
  ('ae', 'products.view'),
  ('ae', 'quotes.view'),
  ('ae', 'quotes.view_own'),
  ('ae', 'quotes.create'),
  ('ae', 'quotes.update'),
  ('ae', 'quotes.delete'),
  -- Campaigns
  ('ae', 'campaigns.view'),
  ('ae', 'forms.view'),
  -- Settings (view only)
  ('ae', 'settings.view');

-- Account Manager (AM): Existing account management, renewals
insert into public.role_permissions (role, permission) values
  -- Core CRM (own records, focus on accounts)
  ('am', 'leads.view'),
  ('am', 'leads.view_own'),
  ('am', 'contacts.view'),
  ('am', 'contacts.view_own'),
  ('am', 'contacts.create'),
  ('am', 'contacts.update'),
  ('am', 'accounts.view'),
  ('am', 'accounts.view_own'),
  ('am', 'accounts.create'),
  ('am', 'accounts.update'),
  ('am', 'deals.view'),
  ('am', 'deals.view_own'),
  ('am', 'deals.create'),
  ('am', 'deals.update'),
  ('am', 'activities.view'),
  ('am', 'activities.view_own'),
  ('am', 'activities.create'),
  ('am', 'deal_stages.view'),
  ('am', 'teams.view'),
  ('am', 'territories.view'),
  -- Reporting & Analytics (own data)
  ('am', 'reports.view'),
  ('am', 'reports.view_own'),
  ('am', 'forecasting.view'),
  ('am', 'forecasting.view_own'),
  ('am', 'dashboard.view'),
  -- Products & Quotes (for renewals)
  ('am', 'products.view'),
  ('am', 'quotes.view'),
  ('am', 'quotes.view_own'),
  ('am', 'quotes.create'),
  ('am', 'quotes.update'),
  -- Campaigns
  ('am', 'campaigns.view'),
  ('am', 'forms.view'),
  -- Settings (view only)
  ('am', 'settings.view');

-- SDR: Lead development, prospecting
insert into public.role_permissions (role, permission) values
  -- Core CRM (limited, lead-focused)
  ('sdr', 'leads.view'),
  ('sdr', 'leads.view_own'),
  ('sdr', 'leads.create'),
  ('sdr', 'leads.update'),
  ('sdr', 'contacts.view'),
  ('sdr', 'contacts.view_own'),
  ('sdr', 'contacts.create'),
  ('sdr', 'contacts.update'),
  ('sdr', 'accounts.view'),
  ('sdr', 'accounts.view_own'),
  ('sdr', 'accounts.create'),
  ('sdr', 'activities.view'),
  ('sdr', 'activities.view_own'),
  ('sdr', 'activities.create'),
  ('sdr', 'deal_stages.view'),
  ('sdr', 'teams.view'),
  ('sdr', 'territories.view'),
  -- Reporting & Analytics (own data)
  ('sdr', 'reports.view'),
  ('sdr', 'reports.view_own'),
  ('sdr', 'dashboard.view'),
  -- Campaigns
  ('sdr', 'campaigns.view'),
  ('sdr', 'forms.view'),
  -- Settings (view only)
  ('sdr', 'settings.view');

-- Create helper function to check if user has permission
create or replace function public.has_permission(user_role public.user_role, check_permission text)
returns boolean as $$
begin
  return exists (
    select 1 from public.role_permissions
    where role = user_role and permission = check_permission
  );
end;
$$ language plpgsql security definer;

-- Create helper function to get current user's role
create or replace function public.get_user_role()
returns public.user_role as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.users
  where id = auth.uid();

  return v_role;
end;
$$ language plpgsql security definer;

-- Create helper function to check if current user has a permission
create or replace function public.current_user_has_permission(check_permission text)
returns boolean as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.users
  where id = auth.uid();

  if v_role is null then
    return false;
  end if;

  return public.has_permission(v_role, check_permission);
end;
$$ language plpgsql security definer;

-- Create helper function to get all permissions for current user
create or replace function public.get_current_user_permissions()
returns text[] as $$
declare
  v_role public.user_role;
  v_permissions text[];
begin
  select role into v_role
  from public.users
  where id = auth.uid();

  if v_role is null then
    return array[]::text[];
  end if;

  select array_agg(permission) into v_permissions
  from public.role_permissions
  where role = v_role;

  return coalesce(v_permissions, array[]::text[]);
end;
$$ language plpgsql security definer;

-- Create helper function to check if user can view team data
-- Returns true if user is admin, sales_manager of a team, or super admin
create or replace function public.can_view_team_data(target_user_id uuid)
returns boolean as $$
declare
  v_current_role public.user_role;
  v_current_team_id uuid;
  v_target_team_id uuid;
begin
  -- Get current user's role and team
  select role, team_id into v_current_role, v_current_team_id
  from public.users
  where id = auth.uid();

  -- Admins can see all data
  if v_current_role = 'admin' then
    return true;
  end if;

  -- Same user can always see their own data
  if target_user_id = auth.uid() then
    return true;
  end if;

  -- Sales managers can see team members' data
  if v_current_role = 'sales_manager' and v_current_team_id is not null then
    select team_id into v_target_team_id
    from public.users
    where id = target_user_id;

    return v_target_team_id = v_current_team_id;
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- Create index for faster permission lookups
create index role_permissions_role_idx on public.role_permissions(role);
create index role_permissions_permission_idx on public.role_permissions(permission);
