// Hand-authored types matching the public schema in supabase/migrations/0001.
// Keep in sync with the SQL. If you regenerate with `supabase gen types`, prefer that.

export type Units = 'kg' | 'lb';

export type ExerciseKind = 'weighted' | 'bodyweight';

export type Profile = {
  id: string;
  display_name: string | null;
  units: Units;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export type SubTag = {
  id: string;
  user_id: string;
  parent_tag_id: string;
  name: string;
  created_at: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  kind: ExerciseKind;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  performed_at: string;
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseEntry = {
  id: string;
  session_id: string;
  exercise_id: string;
  user_id: string;
  order_index: number;
  notes: string | null;
  created_at: string;
};

export type WorkoutSet = {
  id: string;
  exercise_entry_id: string;
  user_id: string;
  order_index: number;
  rpe: number | null;
  rest_seconds: number | null;
  notes: string | null;
  created_at: string;
};

export type BodyWeight = {
  id: string;
  user_id: string;
  recorded_on: string; // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
};

export type SetDrop = {
  id: string;
  set_id: string;
  user_id: string;
  order_index: number;
  weight_kg: number;
  reps: number;
  is_bodyweight: boolean;
  is_failure: boolean;
  created_at: string;
};

// Composed shapes returned by helpers in ./queries

export type ExerciseWithTags = Exercise & {
  tags: Tag[];
  sub_tags: SubTag[];
};

export type SetWithDrops = WorkoutSet & {
  drops: SetDrop[];
};

export type ExerciseEntryWithSets = ExerciseEntry & {
  exercise: Exercise;
  sets: SetWithDrops[];
};

export type SessionWithEntries = WorkoutSession & {
  entries: ExerciseEntryWithSets[];
};
