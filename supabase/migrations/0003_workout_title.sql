-- Optional user-given name for a workout (e.g. "Push day", "Leg day").
-- Past titles power an autocomplete when naming future workouts.

alter table public.workout_sessions
  add column if not exists title text;
