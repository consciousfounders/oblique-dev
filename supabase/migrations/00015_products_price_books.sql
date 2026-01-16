-- Product status enum
create type public.product_status as enum ('active', 'inactive', 'discontinued');

-- Price book type enum
create type public.price_book_type as enum ('standard', 'partner', 'enterprise', 'custom');

-- Quote status enum
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  sku text not null,
  description text,
  category text,
  family text,
  status public.product_status default 'active' not null,
  list_price numeric(12,2),
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(tenant_id, sku)
);

-- Price books table
create table public.price_books (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  type public.price_book_type default 'standard' not null,
  description text,
  is_active boolean default true not null,
  is_default boolean default false not null,
  currency text default 'USD' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Price book entries (product pricing per price book)
create table public.price_book_entries (
  id uuid primary key default gen_random_uuid(),
  price_book_id uuid references public.price_books on delete cascade not null,
  product_id uuid references public.products on delete cascade not null,
  unit_price numeric(12,2) not null,
  min_quantity integer default 1,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(price_book_id, product_id)
);

-- Volume pricing tiers
create table public.volume_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  price_book_entry_id uuid references public.price_book_entries on delete cascade not null,
  min_quantity integer not null,
  max_quantity integer,
  unit_price numeric(12,2) not null,
  discount_percentage numeric(5,2),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Deal products (line items)
create table public.deal_products (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals on delete cascade not null,
  product_id uuid references public.products on delete cascade not null,
  price_book_entry_id uuid references public.price_book_entries on delete set null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null,
  discount_percentage numeric(5,2) default 0,
  discount_amount numeric(12,2) default 0,
  line_total numeric(12,2) not null,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Quotes table
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  deal_id uuid references public.deals on delete set null,
  quote_number text not null,
  name text not null,
  status public.quote_status default 'draft' not null,
  account_id uuid references public.accounts on delete set null,
  contact_id uuid references public.contacts on delete set null,
  price_book_id uuid references public.price_books on delete set null,
  billing_name text,
  billing_street text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text,
  shipping_name text,
  shipping_street text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text,
  subtotal numeric(12,2) default 0,
  discount_percentage numeric(5,2) default 0,
  discount_amount numeric(12,2) default 0,
  tax_percentage numeric(5,2) default 0,
  tax_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  terms text,
  notes text,
  expires_at date,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  owner_id uuid references public.users on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Quote line items
create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes on delete cascade not null,
  product_id uuid references public.products on delete set null,
  name text not null,
  description text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null,
  discount_percentage numeric(5,2) default 0,
  discount_amount numeric(12,2) default 0,
  line_total numeric(12,2) not null,
  position integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index products_tenant_id_idx on public.products(tenant_id);
create index products_status_idx on public.products(status);
create index products_sku_idx on public.products(sku);
create index products_category_idx on public.products(category);
create index price_books_tenant_id_idx on public.price_books(tenant_id);
create index price_books_is_active_idx on public.price_books(is_active);
create index price_book_entries_price_book_id_idx on public.price_book_entries(price_book_id);
create index price_book_entries_product_id_idx on public.price_book_entries(product_id);
create index volume_pricing_tiers_price_book_entry_id_idx on public.volume_pricing_tiers(price_book_entry_id);
create index deal_products_deal_id_idx on public.deal_products(deal_id);
create index deal_products_product_id_idx on public.deal_products(product_id);
create index quotes_tenant_id_idx on public.quotes(tenant_id);
create index quotes_deal_id_idx on public.quotes(deal_id);
create index quotes_status_idx on public.quotes(status);
create index quote_line_items_quote_id_idx on public.quote_line_items(quote_id);

-- Enable RLS
alter table public.products enable row level security;
alter table public.price_books enable row level security;
alter table public.price_book_entries enable row level security;
alter table public.volume_pricing_tiers enable row level security;
alter table public.deal_products enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;

-- RLS Policies for products
create policy "Users can view own tenant products"
  on public.products for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant products"
  on public.products for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant products"
  on public.products for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant products"
  on public.products for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for price_books
create policy "Users can view own tenant price_books"
  on public.price_books for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant price_books"
  on public.price_books for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant price_books"
  on public.price_books for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant price_books"
  on public.price_books for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for price_book_entries (via price_book tenant)
create policy "Users can view price_book_entries"
  on public.price_book_entries for select
  using (
    price_book_id in (
      select id from public.price_books
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert price_book_entries"
  on public.price_book_entries for insert
  with check (
    price_book_id in (
      select id from public.price_books
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update price_book_entries"
  on public.price_book_entries for update
  using (
    price_book_id in (
      select id from public.price_books
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete price_book_entries"
  on public.price_book_entries for delete
  using (
    price_book_id in (
      select id from public.price_books
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- RLS Policies for volume_pricing_tiers (via price_book_entry -> price_book tenant)
create policy "Users can view volume_pricing_tiers"
  on public.volume_pricing_tiers for select
  using (
    price_book_entry_id in (
      select pbe.id from public.price_book_entries pbe
      join public.price_books pb on pbe.price_book_id = pb.id
      where pb.tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert volume_pricing_tiers"
  on public.volume_pricing_tiers for insert
  with check (
    price_book_entry_id in (
      select pbe.id from public.price_book_entries pbe
      join public.price_books pb on pbe.price_book_id = pb.id
      where pb.tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update volume_pricing_tiers"
  on public.volume_pricing_tiers for update
  using (
    price_book_entry_id in (
      select pbe.id from public.price_book_entries pbe
      join public.price_books pb on pbe.price_book_id = pb.id
      where pb.tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete volume_pricing_tiers"
  on public.volume_pricing_tiers for delete
  using (
    price_book_entry_id in (
      select pbe.id from public.price_book_entries pbe
      join public.price_books pb on pbe.price_book_id = pb.id
      where pb.tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- RLS Policies for deal_products (via deal tenant)
create policy "Users can view deal_products"
  on public.deal_products for select
  using (
    deal_id in (
      select id from public.deals
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert deal_products"
  on public.deal_products for insert
  with check (
    deal_id in (
      select id from public.deals
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update deal_products"
  on public.deal_products for update
  using (
    deal_id in (
      select id from public.deals
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete deal_products"
  on public.deal_products for delete
  using (
    deal_id in (
      select id from public.deals
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- RLS Policies for quotes
create policy "Users can view own tenant quotes"
  on public.quotes for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant quotes"
  on public.quotes for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant quotes"
  on public.quotes for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant quotes"
  on public.quotes for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for quote_line_items (via quote tenant)
create policy "Users can view quote_line_items"
  on public.quote_line_items for select
  using (
    quote_id in (
      select id from public.quotes
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert quote_line_items"
  on public.quote_line_items for insert
  with check (
    quote_id in (
      select id from public.quotes
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update quote_line_items"
  on public.quote_line_items for update
  using (
    quote_id in (
      select id from public.quotes
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete quote_line_items"
  on public.quote_line_items for delete
  using (
    quote_id in (
      select id from public.quotes
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- Updated at triggers
create trigger products_updated_at before update on public.products
  for each row execute procedure public.handle_updated_at();

create trigger price_books_updated_at before update on public.price_books
  for each row execute procedure public.handle_updated_at();

create trigger price_book_entries_updated_at before update on public.price_book_entries
  for each row execute procedure public.handle_updated_at();

create trigger volume_pricing_tiers_updated_at before update on public.volume_pricing_tiers
  for each row execute procedure public.handle_updated_at();

create trigger deal_products_updated_at before update on public.deal_products
  for each row execute procedure public.handle_updated_at();

create trigger quotes_updated_at before update on public.quotes
  for each row execute procedure public.handle_updated_at();

create trigger quote_line_items_updated_at before update on public.quote_line_items
  for each row execute procedure public.handle_updated_at();
