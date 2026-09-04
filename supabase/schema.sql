create table if not exists conversations (
  wa_id text primary key,
  state text not null,
  business_mode text check (business_mode is null or business_mode = 'cleaner'),
  customer_name text,
  package_id text,
  requested_start timestamptz,
  concern_category text,
  booking_id uuid,
  updated_at timestamptz not null default now()
);

-- Keep existing deployments compatible when this schema is run again.
alter table conversations add column if not exists business_mode text;

create table if not exists bookings (
  id uuid primary key,
  wa_id text not null,
  customer_name text not null,
  package_id text not null check (package_id in ('package_1', 'package_2', 'package_3', 'ora_demo')),
  requested_start timestamptz not null,
  confirmed_start timestamptz,
  deposit_pence integer not null check (deposit_pence > 0),
  status text not null,
  stripe_session_id text unique,
  calendar_event_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend existing deployments for the generic ORA interactive demo.
alter table bookings drop constraint if exists bookings_package_id_check;
alter table bookings add constraint bookings_package_id_check
  check (package_id in ('package_1', 'package_2', 'package_3', 'ora_demo'));

create table if not exists processed_events (
  provider text not null check (provider in ('meta', 'stripe')),
  event_id text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table if not exists handoffs (
  id uuid primary key,
  wa_id text not null,
  category text not null,
  summary text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists integration_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table conversations enable row level security;
alter table bookings enable row level security;
alter table processed_events enable row level security;
alter table handoffs enable row level security;
alter table integration_secrets enable row level security;

-- No client policies are created. Only the server-side service role can access these tables.
