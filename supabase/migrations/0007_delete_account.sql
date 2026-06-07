-- In-app account deletion (Google Play requirement for apps with accounts).
-- The client can't touch auth.users with the anon key, so this security-definer
-- function lets a signed-in user erase *their own* account + all data.
--
-- Every user table is `references auth.users(id) on delete cascade`, so deleting
-- the auth row wipes everything — except exercise_entries -> exercises is RESTRICT,
-- so we clear entries first to avoid a cascade-ordering conflict.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove the RESTRICT dependency (cascades sets -> set_drops), then the rest
  -- cascades from the auth.users delete below.
  delete from public.exercise_entries where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
