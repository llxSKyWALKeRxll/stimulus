-- Lets the app check, before sending an OTP, whether an account already exists
-- for a given email/phone — so the register flow can warn the user up front
-- instead of silently emailing an existing account a login code.
--
-- Returns only a boolean (existence), never any account data. Runs as the
-- definer so it can read auth.users; callable by the anon role (pre-auth).
create or replace function public.account_exists(
  p_email text default null,
  p_phone text default null
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from auth.users
    where (p_email is not null and email = lower(p_email))
       or (p_phone is not null and phone = p_phone)
  );
$$;

revoke all on function public.account_exists(text, text) from public;
grant execute on function public.account_exists(text, text) to anon, authenticated;
