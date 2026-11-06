export type ToyType = 'warm' | 'frost' | 'pine' | 'spark';
export type MoveType = ToyType | 'plain';
export type MiniGame = 'rhythm' | 'timing' | 'mash';
export type StatKey = 'flair' | 'poise' | 'hustle';
export type Side = 0 | 1;
export type Difficulty = 1 | 2 | 3;
export type DefenseGrade = 'perfect' | 'good' | 'none';
export type PerfGrade = 'perfect' | 'great' | 'ok' | 'sloppy';
export type Effectiveness = 'super' | 'neutral' | 'lukewarm';

/** How the stage animates a move. The renderer maps these to choreography. */
export type AnimKind = 'lunge' | 'spin' | 'hop' | 'pose' | 'shake' | 'stomp' | 'sing';

export type AbilityId =
  | 'unretired'
  | 'cantCatchMe'
  | 'coalFired'
  | 'perfectionist'
  | 'steady'
  | 'surprise'
  | 'optimized'
  | 'racket'
  | 'noFilter'
  | 'shakeMeUp'
  | 'slippery'
  | 'bigSoftie'
  | 'topBilling';

export type StatChanges = Partial<Record<StatKey, number>>;

export interface MoveDef {
  id: string;
  name: string;
  type: MoveType;
  kind: 'show' | 'trick';
  /** SHOW only. */
  power?: number;
  game: MiniGame;
  difficulty: Difficulty;
  /** Naughty List points added on use. */
  naughty?: number;
  self?: StatChanges;
  foe?: StatChanges;
  /** Fraction of max Spirit restored (scaled by performance). */
  heal?: number;
  /** Base chance to Tangle the foe (scaled by performance). */
  tangle?: number;
  /** Fraction of foe POISE ignored. */
  pierce?: number;
  /** Onomatopoeia lettered on impact. */
  word: string;
  anim: AnimKind;
  blurb: string;
}

export interface BaseStats {
  spirit: number;
  flair: number;
  poise: number;
  hustle: number;
}

export interface ToyDef {
  id: string;
  name: string;
  type: ToyType;
  base: BaseStats;
  ability: AbilityId;
  /** Learned at levels 1, 1, 3, 6 (the last is the Deluxe signature). */
  moves: [string, string, string, string];
  bio: string;
  /** Extra line used when it shows up in the wild. */
  taunt: string;
  /** Not collectible in the wild / hidden in versus until boxed. */
  boss?: boolean;
}

export interface AbilityDef {
  id: AbilityId;
  name: string;
  text: string;
  /** Abilities that fire once show a "ready" badge until spent. */
  oneShot?: boolean;
}

export type ArenaId = 'bakery' | 'wrapping' | 'roof' | 'yard' | 'tree';

export interface ArenaDef {
  id: ArenaId;
  contest: string;
  place: string;
  boost: ToyType | null;
  blurb: string;
}
