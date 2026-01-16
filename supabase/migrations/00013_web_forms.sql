-- Web form field types
create type public.web_form_field_type as enum (
  'text',
  'email',
  'phone',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'number',
  'date',
  'url',
  'hidden'
);

-- Form status
create type public.web_form_status as enum ('draft', 'active', 'paused', 'archived');

-- Form display type
create type public.web_form_display_type as enum ('embedded', 'popup', 'slide_in', 'full_page');

-- Web forms table
create table public.web_forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  slug text not null,
  status public.web_form_status default 'draft' not null,
  -- Form settings
  submit_button_text text default 'Submit' not null,
  success_message text default 'Thank you for your submission!' not null,
  redirect_url text,
  -- Styling
  primary_color text default '#3b82f6',
  background_color text default '#ffffff',
  text_color text default '#1f2937',
  font_family text default 'Inter, sans-serif',
  border_radius text default '8px',
  custom_css text,
  -- Display settings
  display_type public.web_form_display_type default 'embedded' not null,
  show_branding boolean default true not null,
  -- Popup/Modal settings
  popup_trigger text, -- 'time', 'scroll', 'exit_intent', 'click'
  popup_delay_seconds integer default 5,
  popup_scroll_percentage integer default 50,
  -- Spam protection
  enable_captcha boolean default false not null,
  captcha_type text default 'recaptcha_v2', -- 'recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'turnstile'
  captcha_site_key text,
  honeypot_enabled boolean default true not null,
  -- Lead routing
  assignment_rule_id uuid references public.assignment_rules on delete set null,
  default_owner_id uuid references public.users on delete set null,
  default_lead_source text default 'web_form',
  -- Notifications
  notify_on_submission boolean default true not null,
  notification_emails text[], -- additional emails to notify
  send_auto_response boolean default false not null,
  auto_response_subject text,
  auto_response_body text,
  -- UTM tracking
  capture_utm_params boolean default true not null,
  -- Duplicate handling
  duplicate_check_enabled boolean default true not null,
  duplicate_field text default 'email', -- field to check for duplicates
  duplicate_action text default 'create_new', -- 'create_new', 'update_existing', 'reject'
  -- Metadata
  created_by uuid references public.users,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Ensure slug is unique per tenant
  unique(tenant_id, slug)
);

-- Web form fields table
create table public.web_form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.web_forms on delete cascade not null,
  field_type public.web_form_field_type not null,
  label text not null,
  name text not null, -- field identifier for mapping to lead fields
  placeholder text,
  help_text text,
  default_value text,
  -- Validation
  is_required boolean default false not null,
  min_length integer,
  max_length integer,
  pattern text, -- regex pattern for validation
  pattern_error_message text,
  -- Select/Radio options (JSON array)
  options jsonb, -- [{"label": "Option 1", "value": "opt1"}, ...]
  -- Field mapping
  lead_field_mapping text, -- 'first_name', 'last_name', 'email', 'phone', 'company', 'title', 'custom:field_name'
  -- Styling
  width text default '100%', -- '100%', '50%', '33%'
  -- Ordering
  position integer not null,
  -- Conditional logic
  conditional_logic jsonb, -- {"show_if": {"field": "other_field", "operator": "equals", "value": "some_value"}}
  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Web form submissions table
create table public.web_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.web_forms on delete cascade not null,
  tenant_id uuid references public.tenants on delete cascade not null,
  -- Submission data
  submission_data jsonb not null,
  -- Lead tracking
  lead_id uuid references public.leads on delete set null,
  converted_to_lead boolean default false not null,
  conversion_error text,
  -- UTM parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  -- Tracking data
  ip_address text,
  user_agent text,
  referrer_url text,
  page_url text,
  -- Spam detection
  spam_score integer default 0,
  is_spam boolean default false not null,
  honeypot_triggered boolean default false not null,
  captcha_passed boolean,
  -- Processing status
  processed_at timestamptz,
  notification_sent boolean default false not null,
  auto_response_sent boolean default false not null,
  -- Metadata
  created_at timestamptz default now() not null
);

-- Form analytics/views tracking table
create table public.web_form_views (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.web_forms on delete cascade not null,
  -- Tracking data
  session_id text,
  ip_address text,
  user_agent text,
  referrer_url text,
  page_url text,
  -- UTM parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  -- View details
  view_type text default 'impression', -- 'impression', 'interaction', 'abandonment'
  time_on_form_seconds integer,
  fields_filled integer,
  last_field_filled text,
  -- Metadata
  created_at timestamptz default now() not null
);

-- Form A/B test variants
create table public.web_form_variants (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.web_forms on delete cascade not null,
  name text not null,
  description text,
  -- Variant settings (overrides main form settings)
  variant_config jsonb not null, -- can contain any form settings to override
  -- Traffic allocation
  traffic_percentage integer default 50 not null check (traffic_percentage >= 0 and traffic_percentage <= 100),
  is_control boolean default false not null,
  is_active boolean default true not null,
  -- Performance metrics
  views_count integer default 0 not null,
  submissions_count integer default 0 not null,
  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for performance
create index web_forms_tenant_id_idx on public.web_forms(tenant_id);
create index web_forms_status_idx on public.web_forms(status);
create index web_forms_slug_idx on public.web_forms(tenant_id, slug);
create index web_form_fields_form_id_idx on public.web_form_fields(form_id);
create index web_form_fields_position_idx on public.web_form_fields(form_id, position);
create index web_form_submissions_form_id_idx on public.web_form_submissions(form_id);
create index web_form_submissions_tenant_id_idx on public.web_form_submissions(tenant_id);
create index web_form_submissions_lead_id_idx on public.web_form_submissions(lead_id);
create index web_form_submissions_created_at_idx on public.web_form_submissions(created_at);
create index web_form_views_form_id_idx on public.web_form_views(form_id);
create index web_form_views_created_at_idx on public.web_form_views(created_at);
create index web_form_variants_form_id_idx on public.web_form_variants(form_id);

-- Enable RLS
alter table public.web_forms enable row level security;
alter table public.web_form_fields enable row level security;
alter table public.web_form_submissions enable row level security;
alter table public.web_form_views enable row level security;
alter table public.web_form_variants enable row level security;

-- RLS Policies for web_forms
create policy "Users can view own tenant forms"
  on public.web_forms for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant forms"
  on public.web_forms for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant forms"
  on public.web_forms for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant forms"
  on public.web_forms for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for web_form_fields
create policy "Users can view own tenant form fields"
  on public.web_form_fields for select
  using (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert own tenant form fields"
  on public.web_form_fields for insert
  with check (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update own tenant form fields"
  on public.web_form_fields for update
  using (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete own tenant form fields"
  on public.web_form_fields for delete
  using (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- RLS Policies for web_form_submissions
create policy "Users can view own tenant submissions"
  on public.web_form_submissions for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant submissions"
  on public.web_form_submissions for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant submissions"
  on public.web_form_submissions for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for web_form_views
create policy "Users can view own tenant form views"
  on public.web_form_views for select
  using (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert form views"
  on public.web_form_views for insert
  with check (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- RLS Policies for web_form_variants
create policy "Users can view own tenant form variants"
  on public.web_form_variants for select
  using (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert own tenant form variants"
  on public.web_form_variants for insert
  with check (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update own tenant form variants"
  on public.web_form_variants for update
  using (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete own tenant form variants"
  on public.web_form_variants for delete
  using (
    form_id in (
      select id from public.web_forms
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- Public access policies for form submission (anonymous users can submit)
-- This requires a separate function with security definer

-- Function to get public form by slug (for anonymous access)
create or replace function public.get_public_form(p_tenant_slug text, p_form_slug text)
returns jsonb as $$
declare
  v_form record;
  v_fields jsonb;
begin
  -- Get the form
  select wf.* into v_form
  from public.web_forms wf
  inner join public.tenants t on t.id = wf.tenant_id
  where t.slug = p_tenant_slug
    and wf.slug = p_form_slug
    and wf.status = 'active';

  if not found then
    return null;
  end if;

  -- Get form fields
  select jsonb_agg(
    jsonb_build_object(
      'id', wff.id,
      'field_type', wff.field_type,
      'label', wff.label,
      'name', wff.name,
      'placeholder', wff.placeholder,
      'help_text', wff.help_text,
      'default_value', wff.default_value,
      'is_required', wff.is_required,
      'min_length', wff.min_length,
      'max_length', wff.max_length,
      'pattern', wff.pattern,
      'pattern_error_message', wff.pattern_error_message,
      'options', wff.options,
      'width', wff.width,
      'conditional_logic', wff.conditional_logic
    ) order by wff.position
  ) into v_fields
  from public.web_form_fields wff
  where wff.form_id = v_form.id;

  return jsonb_build_object(
    'id', v_form.id,
    'name', v_form.name,
    'description', v_form.description,
    'submit_button_text', v_form.submit_button_text,
    'success_message', v_form.success_message,
    'redirect_url', v_form.redirect_url,
    'primary_color', v_form.primary_color,
    'background_color', v_form.background_color,
    'text_color', v_form.text_color,
    'font_family', v_form.font_family,
    'border_radius', v_form.border_radius,
    'custom_css', v_form.custom_css,
    'show_branding', v_form.show_branding,
    'enable_captcha', v_form.enable_captcha,
    'captcha_type', v_form.captcha_type,
    'captcha_site_key', v_form.captcha_site_key,
    'honeypot_enabled', v_form.honeypot_enabled,
    'fields', coalesce(v_fields, '[]'::jsonb)
  );
end;
$$ language plpgsql security definer;

-- Function to submit form (for anonymous access)
create or replace function public.submit_web_form(
  p_tenant_slug text,
  p_form_slug text,
  p_submission_data jsonb,
  p_utm_params jsonb default null,
  p_tracking_data jsonb default null
)
returns jsonb as $$
declare
  v_form record;
  v_tenant record;
  v_submission_id uuid;
  v_lead_id uuid;
  v_owner_id uuid;
  v_error text;
  v_field_mapping record;
  v_lead_data jsonb := '{}'::jsonb;
  v_honeypot_triggered boolean := false;
begin
  -- Get tenant
  select * into v_tenant
  from public.tenants
  where slug = p_tenant_slug;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid tenant');
  end if;

  -- Get the form
  select * into v_form
  from public.web_forms
  where tenant_id = v_tenant.id
    and slug = p_form_slug
    and status = 'active';

  if not found then
    return jsonb_build_object('success', false, 'error', 'Form not found or inactive');
  end if;

  -- Check honeypot (if there's a field called 'website' or 'url' that should be empty)
  if v_form.honeypot_enabled then
    if p_submission_data ? '_honeypot' and p_submission_data->>'_honeypot' != '' then
      v_honeypot_triggered := true;
    end if;
  end if;

  -- Create submission record
  insert into public.web_form_submissions (
    form_id,
    tenant_id,
    submission_data,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    ip_address,
    user_agent,
    referrer_url,
    page_url,
    honeypot_triggered,
    is_spam
  ) values (
    v_form.id,
    v_tenant.id,
    p_submission_data,
    p_utm_params->>'utm_source',
    p_utm_params->>'utm_medium',
    p_utm_params->>'utm_campaign',
    p_utm_params->>'utm_term',
    p_utm_params->>'utm_content',
    p_tracking_data->>'ip_address',
    p_tracking_data->>'user_agent',
    p_tracking_data->>'referrer_url',
    p_tracking_data->>'page_url',
    v_honeypot_triggered,
    v_honeypot_triggered -- mark as spam if honeypot triggered
  )
  returning id into v_submission_id;

  -- If not spam, create lead
  if not v_honeypot_triggered then
    begin
      -- Build lead data from field mappings
      for v_field_mapping in
        select name, lead_field_mapping
        from public.web_form_fields
        where form_id = v_form.id
          and lead_field_mapping is not null
      loop
        case v_field_mapping.lead_field_mapping
          when 'first_name' then v_lead_data := v_lead_data || jsonb_build_object('first_name', p_submission_data->>v_field_mapping.name);
          when 'last_name' then v_lead_data := v_lead_data || jsonb_build_object('last_name', p_submission_data->>v_field_mapping.name);
          when 'email' then v_lead_data := v_lead_data || jsonb_build_object('email', p_submission_data->>v_field_mapping.name);
          when 'phone' then v_lead_data := v_lead_data || jsonb_build_object('phone', p_submission_data->>v_field_mapping.name);
          when 'company' then v_lead_data := v_lead_data || jsonb_build_object('company', p_submission_data->>v_field_mapping.name);
          when 'title' then v_lead_data := v_lead_data || jsonb_build_object('title', p_submission_data->>v_field_mapping.name);
          else null;
        end case;
      end loop;

      -- Determine owner via assignment rule or default
      if v_form.assignment_rule_id is not null then
        -- Get assignee from rule
        select case
          when ar.rule_type = 'round_robin' then public.get_next_assignee_round_robin(ar.id)
          when ar.rule_type = 'load_balanced' then public.get_next_assignee_load_balanced(ar.id)
          else v_form.default_owner_id
        end into v_owner_id
        from public.assignment_rules ar
        where ar.id = v_form.assignment_rule_id
          and ar.is_active = true;
      end if;

      -- Fallback to default owner
      if v_owner_id is null then
        v_owner_id := v_form.default_owner_id;
      end if;

      -- Create lead
      insert into public.leads (
        tenant_id,
        first_name,
        last_name,
        email,
        phone,
        company,
        title,
        source,
        owner_id,
        status
      ) values (
        v_tenant.id,
        coalesce(v_lead_data->>'first_name', 'Unknown'),
        v_lead_data->>'last_name',
        v_lead_data->>'email',
        v_lead_data->>'phone',
        v_lead_data->>'company',
        v_lead_data->>'title',
        coalesce(v_form.default_lead_source, 'web_form'),
        v_owner_id,
        'new'
      )
      returning id into v_lead_id;

      -- Update submission with lead reference
      update public.web_form_submissions
      set
        lead_id = v_lead_id,
        converted_to_lead = true,
        processed_at = now()
      where id = v_submission_id;

      -- Log activity for lead creation
      insert into public.activities (
        tenant_id,
        entity_type,
        entity_id,
        activity_type,
        subject,
        description
      ) values (
        v_tenant.id,
        'lead',
        v_lead_id,
        'form_submission',
        'Lead created from web form',
        'Lead was automatically created from form submission: ' || v_form.name
      );

    exception when others then
      v_error := SQLERRM;
      update public.web_form_submissions
      set
        conversion_error = v_error,
        processed_at = now()
      where id = v_submission_id;
    end;
  end if;

  return jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'lead_id', v_lead_id,
    'redirect_url', v_form.redirect_url,
    'success_message', v_form.success_message
  );
end;
$$ language plpgsql security definer;

-- Function to track form view
create or replace function public.track_form_view(
  p_tenant_slug text,
  p_form_slug text,
  p_tracking_data jsonb
)
returns jsonb as $$
declare
  v_form_id uuid;
begin
  select wf.id into v_form_id
  from public.web_forms wf
  inner join public.tenants t on t.id = wf.tenant_id
  where t.slug = p_tenant_slug
    and wf.slug = p_form_slug
    and wf.status = 'active';

  if v_form_id is null then
    return jsonb_build_object('success', false, 'error', 'Form not found');
  end if;

  insert into public.web_form_views (
    form_id,
    session_id,
    ip_address,
    user_agent,
    referrer_url,
    page_url,
    utm_source,
    utm_medium,
    utm_campaign,
    view_type
  ) values (
    v_form_id,
    p_tracking_data->>'session_id',
    p_tracking_data->>'ip_address',
    p_tracking_data->>'user_agent',
    p_tracking_data->>'referrer_url',
    p_tracking_data->>'page_url',
    p_tracking_data->>'utm_source',
    p_tracking_data->>'utm_medium',
    p_tracking_data->>'utm_campaign',
    coalesce(p_tracking_data->>'view_type', 'impression')
  );

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Updated at triggers
create trigger web_forms_updated_at before update on public.web_forms
  for each row execute procedure public.handle_updated_at();

create trigger web_form_fields_updated_at before update on public.web_form_fields
  for each row execute procedure public.handle_updated_at();

create trigger web_form_variants_updated_at before update on public.web_form_variants
  for each row execute procedure public.handle_updated_at();
