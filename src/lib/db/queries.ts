import { supabase } from '../supabase';
import type {
  BodyWeight,
  Exercise,
  ExerciseEntryWithSets,
  ExerciseKind,
  ExerciseWithTags,
  Profile,
  SessionWithEntries,
  SetDrop,
  SubTag,
  Tag,
  WorkoutSession,
} from './types';

// ============================================================
// Auth
// ============================================================

/**
 * Whether an account already exists for the given email or phone. Used by the
 * register flow to warn the user before we send a code. Returns only a boolean.
 */
export async function accountExists(opts: { email?: string; phone?: string }): Promise<boolean> {
  const { data, error } = await supabase.rpc('account_exists', {
    p_email: opts.email ?? null,
    p_phone: opts.phone ?? null,
  });
  if (error) throw error;
  return data === true;
}

// ============================================================
// Profile
// ============================================================

export async function getProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function updateProfile(
  patch: Partial<Pick<Profile, 'display_name' | 'units' | 'age' | 'gender' | 'height_cm'>>,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

// ============================================================
// Tags
// ============================================================

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTag(input: { name: string; color?: string | null }): Promise<Tag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('tags')
    .insert({ name: input.name, color: input.color ?? null, user_id: user.id })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(id: string) {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw error;
}

export async function listSubTags(): Promise<SubTag[]> {
  const { data, error } = await supabase.from('sub_tags').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createSubTag(input: { parent_tag_id: string; name: string }): Promise<SubTag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('sub_tags')
    .insert({ parent_tag_id: input.parent_tag_id, name: input.name, user_id: user.id })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubTag(id: string) {
  const { error } = await supabase.from('sub_tags').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Exercises
// ============================================================

export async function listExercises(): Promise<ExerciseWithTags[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select(`
      *,
      exercise_tags(tag:tags(*)),
      exercise_sub_tags(sub_tag:sub_tags(*))
    `)
    .eq('is_archived', false)
    .order('name', { ascending: true });
  if (error) throw error;
  type Row = Exercise & {
    exercise_tags: { tag: Tag }[];
    exercise_sub_tags: { sub_tag: SubTag }[];
  };
  return (data as Row[] ?? []).map((row) => ({
    ...row,
    tags: row.exercise_tags.map((r) => r.tag).filter(Boolean),
    sub_tags: row.exercise_sub_tags.map((r) => r.sub_tag).filter(Boolean),
  }));
}

export async function getExercise(id: string): Promise<ExerciseWithTags | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select(`
      *,
      exercise_tags(tag:tags(*)),
      exercise_sub_tags(sub_tag:sub_tags(*))
    `)
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  const row = data as Exercise & {
    exercise_tags: { tag: Tag }[];
    exercise_sub_tags: { sub_tag: SubTag }[];
  };
  return {
    ...row,
    tags: row.exercise_tags.map((r) => r.tag).filter(Boolean),
    sub_tags: row.exercise_sub_tags.map((r) => r.sub_tag).filter(Boolean),
  };
}

export type ExerciseInput = {
  name: string;
  notes?: string | null;
  kind?: ExerciseKind;
  tagIds: string[];
  subTagIds: string[];
};

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: exercise, error } = await supabase
    .from('exercises')
    .insert({
      name: input.name,
      notes: input.notes ?? null,
      kind: input.kind ?? 'weighted',
      user_id: user.id,
    })
    .select('*')
    .single();
  if (error) throw error;

  if (input.tagIds.length) {
    const { error: tagErr } = await supabase.from('exercise_tags').insert(
      input.tagIds.map((tag_id) => ({ exercise_id: exercise.id, tag_id })),
    );
    if (tagErr) throw tagErr;
  }
  if (input.subTagIds.length) {
    const { error: stErr } = await supabase.from('exercise_sub_tags').insert(
      input.subTagIds.map((sub_tag_id) => ({ exercise_id: exercise.id, sub_tag_id })),
    );
    if (stErr) throw stErr;
  }
  return exercise;
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<void> {
  const patch: Record<string, unknown> = { name: input.name, notes: input.notes ?? null };
  if (input.kind) patch.kind = input.kind;
  const { error } = await supabase.from('exercises').update(patch).eq('id', id);
  if (error) throw error;

  // Replace tag/sub-tag associations.
  await supabase.from('exercise_tags').delete().eq('exercise_id', id);
  await supabase.from('exercise_sub_tags').delete().eq('exercise_id', id);

  if (input.tagIds.length) {
    await supabase
      .from('exercise_tags')
      .insert(input.tagIds.map((tag_id) => ({ exercise_id: id, tag_id })));
  }
  if (input.subTagIds.length) {
    await supabase
      .from('exercise_sub_tags')
      .insert(input.subTagIds.map((sub_tag_id) => ({ exercise_id: id, sub_tag_id })));
  }
}

export async function archiveExercise(id: string) {
  const { error } = await supabase.from('exercises').update({ is_archived: true }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// Workout sessions / entries / sets / drops
// ============================================================

export async function createWorkoutSession(
  input: { performed_at?: string; notes?: string | null } = {},
): Promise<WorkoutSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: user.id,
      performed_at: input.performed_at ?? new Date().toISOString(),
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkoutSession(
  id: string,
  patch: Partial<Pick<WorkoutSession, 'title' | 'notes' | 'performed_at'>>,
) {
  const { error } = await supabase.from('workout_sessions').update(patch).eq('id', id);
  if (error) throw error;
}

/** Distinct workout titles the user has used before, most-recent first (autocomplete). */
export async function listWorkoutTitles(): Promise<string[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('title, performed_at')
    .not('title', 'is', null)
    .order('performed_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of (data as { title: string | null }[]) ?? []) {
    const t = r.title?.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Delete a workout and everything under it (entries → sets → drops cascade). */
export async function deleteWorkoutSession(id: string) {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function getSession(id: string): Promise<SessionWithEntries | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      entries:exercise_entries(
        *,
        exercise:exercises(*),
        sets(*, drops:set_drops(*))
      )
    `)
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  const row = data as WorkoutSession & {
    entries: (ExerciseEntryWithSets & { sets: { drops: SetDrop[] }[] })[];
  };
  row.entries.forEach((e) => {
    e.sets.sort((a, b) => a.order_index - b.order_index);
    e.sets.forEach((s) => s.drops.sort((a, b) => a.order_index - b.order_index));
  });
  row.entries.sort((a, b) => a.order_index - b.order_index);
  return row as SessionWithEntries;
}

export async function listRecentSessions(limit = 20): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function addExerciseToSession(input: {
  session_id: string;
  exercise_id: string;
  order_index: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('exercise_entries')
    .insert({ ...input, user_id: user.id })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function removeExerciseEntry(id: string) {
  const { error } = await supabase.from('exercise_entries').delete().eq('id', id);
  if (error) throw error;
}

export type DropInput = {
  weight_kg: number;
  reps: number;
  is_bodyweight?: boolean;
  is_failure?: boolean;
};

/**
 * Adds a set (with one or more drops) to an exercise entry.
 * A regular set has a single drop. A drop set has 2+ drops in `drops`.
 */
export async function addSet(input: {
  exercise_entry_id: string;
  order_index: number;
  rpe?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  drops: DropInput[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: set, error } = await supabase
    .from('sets')
    .insert({
      exercise_entry_id: input.exercise_entry_id,
      user_id: user.id,
      order_index: input.order_index,
      rpe: input.rpe ?? null,
      rest_seconds: input.rest_seconds ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  const dropRows = input.drops.map((d, i) => ({
    set_id: set.id,
    user_id: user.id,
    order_index: i,
    weight_kg: d.weight_kg,
    reps: d.reps,
    is_bodyweight: d.is_bodyweight ?? false,
    is_failure: d.is_failure ?? false,
  }));
  const { error: dropErr } = await supabase.from('set_drops').insert(dropRows);
  if (dropErr) throw dropErr;

  return set;
}

export async function deleteSet(id: string) {
  const { error } = await supabase.from('sets').delete().eq('id', id);
  if (error) throw error;
}

/** Replaces all drops on a set — used when editing a logged set's weights/reps. */
export async function updateSetDrops(setId: string, drops: DropInput[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error: delErr } = await supabase.from('set_drops').delete().eq('set_id', setId);
  if (delErr) throw delErr;

  const dropRows = drops.map((d, i) => ({
    set_id: setId,
    user_id: user.id,
    order_index: i,
    weight_kg: d.weight_kg,
    reps: d.reps,
    is_bodyweight: d.is_bodyweight ?? false,
    is_failure: d.is_failure ?? false,
  }));
  const { error } = await supabase.from('set_drops').insert(dropRows);
  if (error) throw error;
}

// ============================================================
// Body weight
// ============================================================

export async function listBodyWeights(limit = 180): Promise<BodyWeight[]> {
  const { data, error } = await supabase
    .from('body_weights')
    .select('*')
    .order('recorded_on', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Log (or overwrite) today's body weight. One entry per calendar day. */
export async function logBodyWeight(weightKg: number, recordedOn?: string): Promise<BodyWeight> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('body_weights')
    .upsert(
      { user_id: user.id, weight_kg: weightKg, recorded_on: recordedOn ?? today },
      { onConflict: 'user_id,recorded_on' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// Progress queries — used by the per-exercise graphs
// ============================================================

export type ProgressPoint = {
  session_id: string;
  performed_at: string;
  /** Max weight (kg) lifted across all sets/drops in this session. */
  max_weight_kg: number;
  /** Reps achieved at the max weight. */
  reps_at_max: number;
  /** Sum of weight × reps across all drops in this session. */
  total_volume_kg: number;
  /** Epley-estimated 1RM (kg) from the best (weight × reps) drop. */
  est_one_rm_kg: number;
  /** Most reps performed in a single drop/set this session (bodyweight progression). */
  max_reps: number;
  /** Total reps across all drops this session. */
  total_reps: number;
};

/** Soft duplicate check — find a user's exercises whose name matches (case-insensitive). */
export async function findExercisesByName(name: string): Promise<Exercise[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_archived', false)
    .ilike('name', trimmed);
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Session summaries (history + dashboard cards)
// ============================================================

export type SessionSummary = WorkoutSession & {
  exerciseCount: number;
  setCount: number;
  totalVolumeKg: number;
  totalReps: number;
  exerciseNames: string[];
  tagNames: string[];
};

type SummaryRow = WorkoutSession & {
  entries: {
    exercise: { name: string; exercise_tags: { tag: { name: string } | null }[] } | null;
    sets: { drops: { weight_kg: number; reps: number }[] }[];
  }[];
};

function mapSessionSummary(row: SummaryRow): SessionSummary {
  let setCount = 0;
  let totalVolumeKg = 0;
  let totalReps = 0;
  const exerciseNames: string[] = [];
  const tagSet = new Set<string>();
  row.entries.forEach((e) => {
    if (e.exercise?.name) exerciseNames.push(e.exercise.name);
    e.exercise?.exercise_tags?.forEach((et) => {
      if (et.tag?.name) tagSet.add(et.tag.name);
    });
    e.sets.forEach((s) => {
      setCount += 1;
      s.drops.forEach((d) => {
        totalVolumeKg += d.weight_kg * d.reps;
        totalReps += d.reps;
      });
    });
  });
  const { entries, ...session } = row;
  return {
    ...(session as WorkoutSession),
    exerciseCount: row.entries.length,
    setCount,
    totalVolumeKg,
    totalReps,
    exerciseNames,
    tagNames: [...tagSet],
  };
}

const SUMMARY_SELECT = `
  *,
  entries:exercise_entries(
    exercise:exercises(name, exercise_tags(tag:tags(name))),
    sets(drops:set_drops(weight_kg, reps))
  )
`;

export async function listSessionSummaries(limit = 30): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SUMMARY_SELECT)
    .order('performed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as unknown as SummaryRow[]) ?? []).map(mapSessionSummary);
}

/** Sessions within [startISO, endISO) — used for a calendar day's detail. */
export async function listSessionSummariesBetween(
  startISO: string,
  endISO: string,
): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SUMMARY_SELECT)
    .gte('performed_at', startISO)
    .lt('performed_at', endISO)
    .order('performed_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as SummaryRow[]) ?? []).map(mapSessionSummary);
}

/** Lightweight list of every session timestamp — feeds the calendar heat dots. */
export async function listWorkoutDays(): Promise<{ id: string; performed_at: string }[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, performed_at')
    .order('performed_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Cross-exercise progression (Progress tab)
// ============================================================

export type ExerciseProgressSummary = {
  exercise: Exercise;
  points: ProgressPoint[];
  latest: ProgressPoint | null;
  best1RMKg: number;
  /** % change in est. 1RM, latest vs previous session. */
  trendPct: number | null;
  sessionCount: number;
};

function computePoint(
  sets: { drops: { weight_kg: number; reps: number }[] }[],
): Omit<ProgressPoint, 'session_id' | 'performed_at'> {
  let maxWeight = 0;
  let repsAtMax = 0;
  let volume = 0;
  let est1rm = 0;
  let maxReps = 0;
  let totalReps = 0;
  sets.forEach((s) =>
    s.drops.forEach((d) => {
      volume += d.weight_kg * d.reps;
      totalReps += d.reps;
      if (d.reps > maxReps) maxReps = d.reps;
      if (d.weight_kg > maxWeight || (d.weight_kg === maxWeight && d.reps > repsAtMax)) {
        maxWeight = d.weight_kg;
        repsAtMax = d.reps;
      }
      const e = d.reps <= 0 ? 0 : d.reps === 1 ? d.weight_kg : d.weight_kg * (1 + d.reps / 30);
      if (e > est1rm) est1rm = e;
    }),
  );
  return {
    max_weight_kg: maxWeight,
    reps_at_max: repsAtMax,
    total_volume_kg: volume,
    est_one_rm_kg: est1rm,
    max_reps: maxReps,
    total_reps: totalReps,
  };
}

export async function listExerciseProgressSummaries(): Promise<ExerciseProgressSummary[]> {
  const { data, error } = await supabase
    .from('exercise_entries')
    .select(`
      exercise_id,
      exercise:exercises(*),
      session:workout_sessions(performed_at),
      sets(drops:set_drops(weight_kg, reps))
    `)
    .order('created_at', { ascending: true });
  if (error) throw error;

  type Row = {
    exercise_id: string;
    exercise: Exercise | null;
    session: { performed_at: string } | null;
    session_id?: string;
    sets: { drops: { weight_kg: number; reps: number }[] }[];
  };
  const rows = (data as unknown as Row[]) ?? [];

  const byExercise = new Map<string, ExerciseProgressSummary>();
  for (const r of rows) {
    if (!r.exercise || r.exercise.is_archived || !r.session) continue;
    const point: ProgressPoint = {
      session_id: '',
      performed_at: r.session.performed_at,
      ...computePoint(r.sets),
    };
    let summary = byExercise.get(r.exercise_id);
    if (!summary) {
      summary = {
        exercise: r.exercise,
        points: [],
        latest: null,
        best1RMKg: 0,
        trendPct: null,
        sessionCount: 0,
      };
      byExercise.set(r.exercise_id, summary);
    }
    summary.points.push(point);
  }

  const result: ExerciseProgressSummary[] = [];
  for (const summary of byExercise.values()) {
    summary.points.sort(
      (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime(),
    );
    summary.sessionCount = summary.points.length;
    summary.latest = summary.points[summary.points.length - 1] ?? null;
    summary.best1RMKg = summary.points.reduce((m, p) => Math.max(m, p.est_one_rm_kg), 0);
    const prev = summary.points[summary.points.length - 2];
    if (summary.latest && prev && prev.est_one_rm_kg > 0) {
      summary.trendPct =
        ((summary.latest.est_one_rm_kg - prev.est_one_rm_kg) / prev.est_one_rm_kg) * 100;
    }
    result.push(summary);
  }
  // Most recently trained first.
  result.sort((a, b) => {
    const ad = a.latest ? new Date(a.latest.performed_at).getTime() : 0;
    const bd = b.latest ? new Date(b.latest.performed_at).getTime() : 0;
    return bd - ad;
  });
  return result;
}

export async function getExerciseProgress(exerciseId: string): Promise<ProgressPoint[]> {
  const { data, error } = await supabase
    .from('exercise_entries')
    .select(`
      session_id,
      session:workout_sessions(performed_at),
      sets(drops:set_drops(weight_kg, reps))
    `)
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  type Row = {
    session_id: string;
    session: { performed_at: string } | null;
    sets: { drops: { weight_kg: number; reps: number }[] }[];
  };
  const rows = (data as unknown as Row[] | null) ?? [];

  return rows
    .filter((r) => r.session)
    .map((r) => ({
      session_id: r.session_id,
      performed_at: r.session!.performed_at,
      ...computePoint(r.sets),
    }));
}
