-- Profile details captured during first-time onboarding.
-- display_name (already present) holds the user's name; null display_name means
-- the user has not completed onboarding yet.

alter table public.profiles
  add column if not exists age int
    check (age is null or (age >= 13 and age <= 120)),
  add column if not exists gender text
    check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  add column if not exists height_cm numeric
    check (height_cm is null or (height_cm > 0 and height_cm < 300));
