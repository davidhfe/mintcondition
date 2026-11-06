import type { MiniGame, MoveType, Side, StatKey, ToyType, DefenseGrade } from '../../core/types';
import type { Control } from '../../input/keys';

export interface MoveView {
  id: string;
  name: string;
  type: MoveType;
  kind: 'show' | 'trick';
  power?: number;
  game: MiniGame;
  difficulty: number;
  naughty?: number;
  blurb: string;
  /** Short mechanical summary, e.g. "FLAIR +2" or "60% TANGLE". */
  effect: string;
  superVsFoe: boolean;
  /** Matches the contest's home type (×1.15). */
  home: boolean;
}

export interface SideHud {
  toyId: string;
  name: string;
  type: ToyType;
  level: number;
  deluxe: boolean;
  spirit: number;
  maxSpirit: number;
  /** Lags behind spirit so damage reads as a chunk (fighting-game ghost bar). */
  ghost: number;
  naughty: number;
  stages: Record<StatKey, number>;
  tangled: boolean;
  ability: string;
  abilityText: string;
  abilityReady: boolean | null;
  /** Brief highlight when the ability fires. */
  abilityFlash: number;
  control: Control | 'cpu';
  label: string;
}

export interface MenuReq {
  side: Side;
  control: Control;
  moves: MoveView[];
  resolve: (moveId: string) => void;
}

export interface MinigameReq {
  id: number;
  side: Side;
  control: Control;
  game: MiniGame;
  difficulty: number;
  speed: number;
  moveName: string;
  type: MoveType;
  resolve: (score: number) => void;
}

export interface DefenseReq {
  id: number;
  side: Side;
  control: Control;
  /** Seconds until the ring closes. */
  duration: number;
  x: number;
  y: number;
  resolve: (g: DefenseGrade) => void;
}

export type CalloutStyle = 'grade' | 'super' | 'naughty' | 'defense' | 'ko' | 'boxed' | 'ability' | 'small' | 'move' | 'coal' | 'banner';

export interface Callout {
  id: number;
  text: string;
  style: CalloutStyle;
  color?: string;
  side?: Side;
  /** Screen position (px); centred if absent. */
  x?: number;
  y?: number;
}

export interface Word {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  rot: number;
  size: number;
}

export interface HudState {
  sides: [SideHud, SideHud];
  contest: string;
  round: number;
  overtime: number;
  menu: MenuReq | null;
  minigame: MinigameReq | null;
  defense: DefenseReq | null;
  caption: { title?: string; text: string; side?: Side } | null;
  callouts: Callout[];
  words: Word[];
  turn: Side | null;
  /** First-battle coaching note. */
  coach: { text: string; where: 'top' | 'bottom' } | null;
  /** Fighting-game VS splash at the start. */
  vs: { toyId: string; name: string; label: string; level: number }[] | null;
  showHud: boolean;
}
