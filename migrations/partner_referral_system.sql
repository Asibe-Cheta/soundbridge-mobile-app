-- ============================================================
-- partners
-- ============================================================
create table if not exists public.partners (
  id                          uuid        primary key default gen_random_uuid(),
  user_id                     uuid        not null references public.profiles(id) on delete cascade,
  referral_code               text        not null unique,
  referral_link               text        not null unique,
  commission_rate             decimal     not null default 0.10,
  total_referrals             integer     not null default 0,
  total_subscribers_referred  integer     not null default 0,
  total_commission_earned     decimal     not null default 0,
  created_at                  timestamptz not null default now()
);

alter table public.partners enable row level security;

create policy "Partners can read own record"
  on public.partners for select
  using (auth.uid() = user_id);

create index if not exists partners_referral_code_idx on public.partners(referral_code);
create index if not exists partners_user_id_idx       on public.partners(user_id);

-- ============================================================
-- referral_signups
-- ============================================================
create table if not exists public.referral_signups (
  id                uuid        primary key default gen_random_uuid(),
  partner_id        uuid        not null references public.partners(id) on delete cascade,
  referred_user_id  uuid        not null references public.profiles(id) on delete cascade,
  signed_up_at      timestamptz not null default now(),
  converted_to_paid boolean     not null default false,
  converted_at      timestamptz,
  subscription_tier text,
  commission_amount decimal,
  commission_paid   boolean     not null default false,
  unique(partner_id, referred_user_id)
);

alter table public.referral_signups enable row level security;

-- Partners see their own referrals (anonymised — no direct user data exposed)
create policy "Partners can read own referral signups"
  on public.referral_signups for select
  using (
    exists (
      select 1 from public.partners
      where id = referral_signups.partner_id
      and user_id = auth.uid()
    )
  );

create index if not exists referral_signups_partner_id_idx       on public.referral_signups(partner_id);
create index if not exists referral_signups_referred_user_id_idx on public.referral_signups(referred_user_id);

-- ============================================================
-- institutional_access
-- ============================================================
create table if not exists public.institutional_access (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  institution text        not null,   -- 'sound_academy'
  access_tier text        not null default 'premium',
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  is_active   boolean     not null default true,
  unique(user_id, institution)
);

alter table public.institutional_access enable row level security;

create policy "Users can read own institutional access"
  on public.institutional_access for select
  using (auth.uid() = user_id);

create index if not exists institutional_access_user_id_idx    on public.institutional_access(user_id);
create index if not exists institutional_access_expires_at_idx on public.institutional_access(expires_at);

-- ============================================================
-- RPC: record_referral_signup
-- Called from mobile after a new user signs up via a referral link.
-- Looks up the partner by referral_code and creates a referral_signups row.
-- ============================================================
create or replace function public.record_referral_signup(
  p_referred_user_id uuid,
  p_referral_code    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
begin
  select id into v_partner_id
  from partners
  where referral_code = lower(trim(p_referral_code));

  if not found then return; end if;

  -- Don't track self-referrals
  if exists (select 1 from partners where id = v_partner_id and user_id = p_referred_user_id) then
    return;
  end if;

  insert into referral_signups (partner_id, referred_user_id)
  values (v_partner_id, p_referred_user_id)
  on conflict (partner_id, referred_user_id) do nothing;

  update partners
  set total_referrals = total_referrals + 1
  where id = v_partner_id;
end;
$$;

grant execute on function public.record_referral_signup(uuid, text) to authenticated;

-- ============================================================
-- RPC: record_referral_conversion
-- Called from the backend when a referred user subscribes to a paid tier.
-- Updates commission totals on the partner record.
-- ============================================================
create or replace function public.record_referral_conversion(
  p_referred_user_id uuid,
  p_subscription_tier text,
  p_monthly_value decimal
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signup        referral_signups%rowtype;
  v_commission    decimal;
  v_partner       partners%rowtype;
begin
  select rs.* into v_signup
  from referral_signups rs
  where rs.referred_user_id = p_referred_user_id
  and not rs.converted_to_paid
  limit 1;

  if not found then return; end if;

  select p.* into v_partner from partners p where p.id = v_signup.partner_id;
  if not found then return; end if;

  v_commission := p_monthly_value * v_partner.commission_rate;

  update referral_signups
  set converted_to_paid    = true,
      converted_at         = now(),
      subscription_tier    = p_subscription_tier,
      commission_amount    = v_commission
  where id = v_signup.id;

  update partners
  set total_subscribers_referred = total_subscribers_referred + 1,
      total_commission_earned    = total_commission_earned + v_commission
  where id = v_partner.id;
end;
$$;

-- Only callable by service role (backend webhook), not by authenticated users directly
-- grant execute on function public.record_referral_conversion(uuid, text, decimal) to service_role;

-- ============================================================
-- RPC: grant_institutional_access
-- Called from mobile after a Sound Academy student signs up.
-- Creates an institutional_access record and upgrades the profile tier.
-- ============================================================
create or replace function public.grant_institutional_access(
  p_user_id     uuid,
  p_institution text,
  p_access_tier text default 'premium'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into institutional_access (user_id, institution, access_tier, expires_at)
  values (p_user_id, p_institution, p_access_tier, now() + interval '1 year')
  on conflict (user_id, institution) do update
    set access_tier = excluded.access_tier,
        granted_at  = now(),
        expires_at  = now() + interval '1 year',
        is_active   = true;

  update profiles
  set subscription_tier       = p_access_tier,
      subscription_status     = 'active',
      subscription_period_end = (now() + interval '1 year')::text,
      updated_at              = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.grant_institutional_access(uuid, text, text) to authenticated;

-- ============================================================
-- Seed: Dan Edmund partner record
-- ============================================================
do $$
begin
  if not exists (
    select 1 from public.partners
    where user_id = '55b5bc91-5f6a-4155-9594-2e0237417976'
  ) then
    insert into public.partners (user_id, referral_code, referral_link, commission_rate)
    values (
      '55b5bc91-5f6a-4155-9594-2e0237417976',
      'danedmund',
      'https://soundbridge.live/join?ref=danedmund',
      0.10
    );
  end if;
end $$;
