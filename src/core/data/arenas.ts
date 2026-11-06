import type { ArenaDef, ArenaId, Effectiveness, MoveType, ToyType } from '../types';

export const ARENAS: Readonly<Record<ArenaId, ArenaDef>> = {
  bakery: { id: 'bakery', contest: 'Cookie Bake-Off', place: 'The Bakery', boost: 'warm', blurb: 'Judged on piping, structure, and nerve.' },
  wrapping: { id: 'wrapping', contest: 'Wrap Battle', place: 'The Wrapping Room', boost: 'pine', blurb: 'Hospital corners or go home.' },
  roof: { id: 'roof', contest: 'Light Show', place: 'The Roof', boost: 'spark', blurb: 'Ten thousand bulbs. One extension cord.' },
  yard: { id: 'yard', contest: 'Snowman Build-Off', place: 'The Yard', boost: 'frost', blurb: 'Carrot provided. Dignity not.' },
  tree: { id: 'tree', contest: 'Tree Trimming', place: 'The Big Tree', boost: null, blurb: 'Finals.' },
};
export const ARENA_LIST: readonly ArenaDef[] = Object.values(ARENAS);

/** attacker type → the type it beats. FROST > WARM > PINE > SPARK > FROST. */
export const BEATS: Readonly<Record<ToyType, ToyType>> = {
  frost: 'warm',
  warm: 'pine',
  pine: 'spark',
  spark: 'frost',
};

export const TYPE_LABEL: Readonly<Record<MoveType, string>> = {
  warm: 'WARM',
  frost: 'FROST',
  pine: 'PINE',
  spark: 'SPARK',
  plain: 'PLAIN',
};

export const TYPE_REASON: Readonly<Record<ToyType, string>> = {
  frost: 'Snow smothers the hearth.',
  warm: 'Every pine ends up a Yule log.',
  pine: "Wood doesn't conduct. Look it up.",
  spark: 'Lights thaw the frost.',
};

export function effectiveness(attack: MoveType, defender: ToyType): Effectiveness {
  if (attack === 'plain') return 'neutral';
  if (BEATS[attack] === defender) return 'super';
  if (BEATS[defender] === attack) return 'lukewarm';
  return 'neutral';
}

export const EFFECT_MULT: Readonly<Record<Effectiveness, number>> = {
  super: 1.5,
  neutral: 1,
  lukewarm: 0.67,
};
