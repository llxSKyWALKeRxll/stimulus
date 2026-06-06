-- Track whether an exercise is primarily weighted or bodyweight.
-- Bodyweight exercises (pull-ups, push-ups, dips) progress by REPS — weight is
-- optional "added load". This drives default metrics and the set-logging UI.

alter table public.exercises
  add column if not exists kind text not null default 'weighted'
  check (kind in ('weighted', 'bodyweight'));
