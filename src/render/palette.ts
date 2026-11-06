/**
 * The palette. Deliberately not "Christmas default" red/green: deep plum ink,
 * warm cream paper, candy red, spruce teal, gold foil — and the two comic
 * misprint colours, which double as player colours (P1 cyan, P2 magenta).
 */
import type { MoveType } from '../core/types';

export const INK = 0x1a1026;
export const PAPER = 0xfff4e0;
export const CANDY = 0xe8344e;
export const SPRUCE = 0x155e4f;
export const GOLD = 0xffc73a;
export const CYAN = 0x2ad4e0;
export const MAGENTA = 0xff3d8b;

export const PLAYER_RIM = [CYAN, MAGENTA] as const;

export const TYPE_COLOR: Readonly<Record<MoveType, number>> = {
  warm: 0xff7a2f,
  frost: 0x7fd8ff,
  pine: 0x43b56d,
  spark: 0xffd23f,
  plain: 0xd9c8b4,
};

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
