import { Units } from './db/types';

const KG_PER_LB = 0.45359237;

export function kgToDisplay(kg: number, units: Units): number {
  return units === 'lb' ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, units: Units): number {
  return units === 'lb' ? value * KG_PER_LB : value;
}

export function formatWeight(kg: number, units: Units, opts: { withUnit?: boolean } = {}): string {
  const v = kgToDisplay(kg, units);
  const rounded = Math.round(v * 10) / 10;
  const text = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return opts.withUnit ? `${text} ${units}` : text;
}

/** Epley's formula: estimated 1-rep max. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Total volume of a single (weight, reps) entry. */
export function dropVolumeKg(weightKg: number, reps: number): number {
  return weightKg * reps;
}
