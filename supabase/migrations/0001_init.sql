-- DealSense AI initial schema

create extension if not exists "pgcrypto";

-- Profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  brokerage text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile + free subscription on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');

  insert into public.subscriptions (user_id, tier, status, seats)
  values (new.id, 'free', 'active', 1);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Subscriptions ---------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'team')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  seats int not null default 1,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Only service_role (edge functions) may insert/update subscriptions,
-- so there are intentionally no insert/update policies for regular users.

-- Deals -------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  address text not null,
  stage text not null default 'new' check (stage in ('new', 'analyzing', 'under_contract', 'closed', 'lost')),
  price numeric,
  investment_score int,
  ai_summary text,
  created_at timestamptz not null default now()
);

alter table public.deals enable row level security;

create policy "Users manage own deals" on public.deals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Leads ---------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  lead_score int,
  lead_type text not null default 'buyer' check (lead_type in ('buyer', 'seller', 'renter', 'investor')),
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Users manage own leads" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Analyses (audit trail of every AI call) ------------------------------------
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('deal_analysis', 'listing_copy', 'lead_score', 'market_pulse')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analyses enable row level security;

create policy "Users manage own analyses" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Events (lightweight product analytics) -------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Users can insert own events" on public.events
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users can view own events" on public.events
  for select using (auth.uid() = user_id);

create index if not exists events_user_id_created_at_idx on public.events (user_id, created_at desc);
create index if not exists analyses_user_id_created_at_idx on public.analyses (user_id, created_at desc);
create index if not exists deals_user_id_idx on public.deals (user_id);
create index if not exists leads_user_id_idx on public.leads (user_id);
