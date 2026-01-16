-- Team hierarchy levels
create type public.team_level as enum ('organization', 'region', 'team');

-- Assignment rule types
create type public.assignment_rule_type as enum ('round_robin', 'load_balanced', 'skill_based');

-- Territory criteria types
create type public.territory_criteria_type as enum ('geographic', 'industry', 'company_size', 'named_accounts');

-- Teams table (supports hierarchies: organization → region → team)
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  level public.team_level default 'team' not null,
  parent_team_id uuid references public.teams on delete set null,
  manager_id uuid references public.users,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Team members junction table
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  is_lead boolean default false not null,
  joined_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique(team_id, user_id)
);

-- Territories table
create table public.territories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  team_id uuid references public.teams on delete set null,
  owner_id uuid references public.users,
  is_active boolean default true not null,
  auto_assign boolean default false not null,
  priority integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Territory criteria (rules for matching records to territories)
create table public.territory_criteria (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.territories on delete cascade not null,
  criteria_type public.territory_criteria_type not null,
  field_name text not null,
  operator text not null,
  field_value text not null,
  created_at timestamptz default now() not null
);

-- Named accounts for territories (specific accounts assigned to a territory)
create table public.territory_accounts (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.territories on delete cascade not null,
  account_id uuid references public.accounts on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(territory_id, account_id)
);

-- Assignment rules table
create table public.assignment_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  rule_type public.assignment_rule_type not null,
  entity_type text not null,
  team_id uuid references public.teams on delete cascade,
  territory_id uuid references public.territories on delete cascade,
  is_active boolean default true not null,
  priority integer default 0 not null,
  config jsonb default '{}' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Assignment rule members (users eligible for assignment)
create table public.assignment_rule_members (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.assignment_rules on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  weight integer default 1 not null,
  max_assignments integer,
  current_assignments integer default 0 not null,
  skills text[] default '{}',
  last_assigned_at timestamptz,
  created_at timestamptz default now() not null,
  unique(rule_id, user_id)
);

-- Assignment history (track what was assigned to whom)
create table public.assignment_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  rule_id uuid references public.assignment_rules on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  assigned_to uuid references public.users not null,
  assigned_by uuid references public.users,
  assignment_reason text,
  created_at timestamptz default now() not null
);

-- Add team_id to users for primary team assignment
alter table public.users add column team_id uuid references public.teams on delete set null;

-- Add territory_id to accounts, leads for territory assignment
alter table public.accounts add column territory_id uuid references public.territories on delete set null;
alter table public.leads add column territory_id uuid references public.territories on delete set null;

-- Indexes for performance
create index teams_tenant_id_idx on public.teams(tenant_id);
create index teams_parent_team_id_idx on public.teams(parent_team_id);
create index teams_manager_id_idx on public.teams(manager_id);
create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_user_id_idx on public.team_members(user_id);
create index territories_tenant_id_idx on public.territories(tenant_id);
create index territories_team_id_idx on public.territories(team_id);
create index territory_criteria_territory_id_idx on public.territory_criteria(territory_id);
create index territory_accounts_territory_id_idx on public.territory_accounts(territory_id);
create index territory_accounts_account_id_idx on public.territory_accounts(account_id);
create index assignment_rules_tenant_id_idx on public.assignment_rules(tenant_id);
create index assignment_rules_team_id_idx on public.assignment_rules(team_id);
create index assignment_rules_territory_id_idx on public.assignment_rules(territory_id);
create index assignment_rule_members_rule_id_idx on public.assignment_rule_members(rule_id);
create index assignment_rule_members_user_id_idx on public.assignment_rule_members(user_id);
create index assignment_history_tenant_id_idx on public.assignment_history(tenant_id);
create index assignment_history_entity_idx on public.assignment_history(entity_type, entity_id);
create index accounts_territory_id_idx on public.accounts(territory_id);
create index leads_territory_id_idx on public.leads(territory_id);
create index users_team_id_idx on public.users(team_id);

-- Enable RLS
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.territories enable row level security;
alter table public.territory_criteria enable row level security;
alter table public.territory_accounts enable row level security;
alter table public.assignment_rules enable row level security;
alter table public.assignment_rule_members enable row level security;
alter table public.assignment_history enable row level security;

-- RLS Policies for teams
create policy "Users can view own tenant teams"
  on public.teams for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Admins can manage teams"
  on public.teams for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for team_members
create policy "Users can view team members in own tenant"
  on public.team_members for select
  using (
    team_id in (
      select id from public.teams
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Admins can manage team members"
  on public.team_members for all
  using (
    team_id in (
      select id from public.teams
      where tenant_id in (
        select tenant_id from public.users
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- RLS Policies for territories
create policy "Users can view own tenant territories"
  on public.territories for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Admins can manage territories"
  on public.territories for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for territory_criteria
create policy "Users can view territory criteria in own tenant"
  on public.territory_criteria for select
  using (
    territory_id in (
      select id from public.territories
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Admins can manage territory criteria"
  on public.territory_criteria for all
  using (
    territory_id in (
      select id from public.territories
      where tenant_id in (
        select tenant_id from public.users
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- RLS Policies for territory_accounts
create policy "Users can view territory accounts in own tenant"
  on public.territory_accounts for select
  using (
    territory_id in (
      select id from public.territories
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Admins can manage territory accounts"
  on public.territory_accounts for all
  using (
    territory_id in (
      select id from public.territories
      where tenant_id in (
        select tenant_id from public.users
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- RLS Policies for assignment_rules
create policy "Users can view own tenant assignment rules"
  on public.assignment_rules for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Admins can manage assignment rules"
  on public.assignment_rules for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for assignment_rule_members
create policy "Users can view rule members in own tenant"
  on public.assignment_rule_members for select
  using (
    rule_id in (
      select id from public.assignment_rules
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Admins can manage rule members"
  on public.assignment_rule_members for all
  using (
    rule_id in (
      select id from public.assignment_rules
      where tenant_id in (
        select tenant_id from public.users
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- RLS Policies for assignment_history
create policy "Users can view own tenant assignment history"
  on public.assignment_history for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant assignment history"
  on public.assignment_history for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at triggers
create trigger teams_updated_at before update on public.teams
  for each row execute procedure public.handle_updated_at();

create trigger territories_updated_at before update on public.territories
  for each row execute procedure public.handle_updated_at();

create trigger assignment_rules_updated_at before update on public.assignment_rules
  for each row execute procedure public.handle_updated_at();

-- Function to get next assignee using round-robin
create or replace function public.get_next_assignee_round_robin(p_rule_id uuid)
returns uuid as $$
declare
  v_user_id uuid;
begin
  -- Get the member who was assigned least recently (or never)
  select user_id into v_user_id
  from public.assignment_rule_members
  where rule_id = p_rule_id
    and (max_assignments is null or current_assignments < max_assignments)
  order by last_assigned_at nulls first, current_assignments asc
  limit 1;

  -- Update the assignment tracking
  if v_user_id is not null then
    update public.assignment_rule_members
    set
      last_assigned_at = now(),
      current_assignments = current_assignments + 1
    where rule_id = p_rule_id and user_id = v_user_id;
  end if;

  return v_user_id;
end;
$$ language plpgsql security definer;

-- Function to get next assignee using load-balanced assignment
create or replace function public.get_next_assignee_load_balanced(p_rule_id uuid)
returns uuid as $$
declare
  v_user_id uuid;
begin
  -- Get the member with lowest current assignments weighted by their capacity
  select user_id into v_user_id
  from public.assignment_rule_members
  where rule_id = p_rule_id
    and (max_assignments is null or current_assignments < max_assignments)
  order by
    case
      when max_assignments is not null and max_assignments > 0
      then current_assignments::float / max_assignments::float
      else current_assignments::float / 100.0
    end asc,
    last_assigned_at nulls first
  limit 1;

  -- Update the assignment tracking
  if v_user_id is not null then
    update public.assignment_rule_members
    set
      last_assigned_at = now(),
      current_assignments = current_assignments + 1
    where rule_id = p_rule_id and user_id = v_user_id;
  end if;

  return v_user_id;
end;
$$ language plpgsql security definer;

-- Function to match account to territory based on criteria
create or replace function public.match_account_to_territory(p_account_id uuid)
returns uuid as $$
declare
  v_territory_id uuid;
  v_account record;
begin
  -- Get account details
  select * into v_account from public.accounts where id = p_account_id;

  if not found then
    return null;
  end if;

  -- First check if this is a named account in any territory
  select territory_id into v_territory_id
  from public.territory_accounts
  where account_id = p_account_id
  limit 1;

  if v_territory_id is not null then
    return v_territory_id;
  end if;

  -- Then check criteria-based matching (highest priority first)
  select t.id into v_territory_id
  from public.territories t
  inner join public.territory_criteria tc on tc.territory_id = t.id
  where t.tenant_id = v_account.tenant_id
    and t.is_active = true
    and t.auto_assign = true
    and (
      (tc.criteria_type = 'industry' and tc.field_name = 'industry' and
       case tc.operator
         when 'equals' then v_account.industry = tc.field_value
         when 'contains' then v_account.industry ilike '%' || tc.field_value || '%'
         else false
       end)
      or
      (tc.criteria_type = 'company_size' and tc.field_name = 'employee_count' and
       case tc.operator
         when 'equals' then v_account.employee_count = tc.field_value
         when 'contains' then v_account.employee_count ilike '%' || tc.field_value || '%'
         else false
       end)
    )
  order by t.priority desc
  limit 1;

  return v_territory_id;
end;
$$ language plpgsql security definer;
