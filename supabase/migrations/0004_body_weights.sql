-- Track the user's body weight over time (one entry per day; re-logging upserts).
-- Stored in kg internally like everything else; the UI converts to kg/lb.

create table if not exists public.body_weights (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_on date not null default current_date,
  weight_kg numeric(6,2) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, recorded_on)
);

create index if not exists idx_body_weights_user_date
  on public.body_weights(user_id, recorded_on desc);

alter table public.body_weights enable row level security;

create policy body_weights_owner on public.body_weights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
