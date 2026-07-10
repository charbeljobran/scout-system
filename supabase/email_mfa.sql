create table if not exists public.user_mfa_email_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_mfa_email_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  purpose text not null check (purpose in ('setup', 'login')),
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_mfa_email_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists user_mfa_email_challenges_user_purpose_idx
on public.user_mfa_email_challenges(user_id, purpose, created_at desc);

create index if not exists user_mfa_email_sessions_user_token_idx
on public.user_mfa_email_sessions(user_id, token_hash);

alter table public.user_mfa_email_settings enable row level security;
alter table public.user_mfa_email_challenges enable row level security;
alter table public.user_mfa_email_sessions enable row level security;

drop policy if exists "Email MFA settings readable by owner" on public.user_mfa_email_settings;
create policy "Email MFA settings readable by owner"
on public.user_mfa_email_settings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Email MFA challenges server only" on public.user_mfa_email_challenges;
drop policy if exists "Email MFA sessions server only" on public.user_mfa_email_sessions;

