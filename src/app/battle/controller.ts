/**
 * Runs one showdown: asks the humans (menus, minigames, Keep Cool), asks the
 * CPU, applies the rules, and narrates every event through the director + HUD.
 */
import * as THREE from 'three';
import type { ArenaId, DefenseGrade, MoveDef, PerfGrade, Side, StatKey } from '../../core/types';
import { beginTurn, createBattle, planMove, resolveMove, type BattleEvent, type BattleState, type MovePlan } from '../../core/battle';
import { chooseMove, rollDefense, rollScore, SKILL, type CpuLevel } from '../../core/ai';
import { move } from '../../core/data/moves';
import { ABILITIES, toy } from '../../core/data/toys';
import { ARENAS, effectiveness } from '../../core/data/arenas';
import { isDeluxe, STAT_LABEL } from '../../core/stats';
import type { Control } from '../../input/keys';
import type { Stage } from '../../render/stage';
import { Director } from '../../render/director';
import { hex, TYPE_COLOR } from '../../render/palette';
import { sfx, voice } from '../../audio/sfx';
import { Obs } from '../obs';
import type { Callout, CalloutStyle, HudState, MoveView, SideHud } from './hud';

export interface Combatant {
  toyId: string;
  level: number;
  control: Control | 'cpu';
  brain?: CpuLevel;
  hands?: CpuLevel;
  label: string;
}

export interface BattleConfig {
  arena: ArenaId;
  sides: [Combatant, Combatant];
  seed: number;
  /** Campaign: drop a gift box over the loser if side 0 wins. */
  boxOnWin?: boolean;
  /** First showdown ever: explain the controls once, in context. */
  coach?: boolean;
}

export interface BattleOutcome {
  winner: Side;
  turns: number;
}

class Aborted extends Error {}
const other = (s: Side): Side => (s === 0 ? 1 : 0);
let uid = 1;

/** Playtest telemetry: harmless array the e2e/playtest harness can read. */
type LogEntry = Record<string, string | number | boolean>;
function tlog(e: LogEntry) {
  const w = window as unknown as { __mcLog?: LogEntry[] };
  (w.__mcLog ??= []).push({ t: Math.round(performance.now()), ...e });
}

const COACH = {
  menu: 'Pick a move. Every move is a performance: nail it and it lands harder.',
  defend: 'Incoming! Press SPACE as the ring closes to keep your cool.',
} as const;

export const KEEP_COOL_SECONDS = 0.9;

export function describeMove(m: MoveDef): string {
  const bits: string[] = [];
  if (m.power) bits.push(`${m.power} POW`);
  const stat = (c: Partial<Record<StatKey, number>> | undefined, who: string) => {
    if (!c) return;
    for (const [k, v] of Object.entries(c) as [StatKey, number][]) bits.push(`${who}${STAT_LABEL[k]} ${v > 0 ? '+' : ''}${v}`);
  };
  stat(m.self, '');
  stat(m.foe, 'FOE ');
  if (m.heal) bits.push(`HEAL ${Math.round(m.heal * 100)}%`);
  if (m.tangle) bits.push(`${Math.round(m.tangle * 100)}% TANGLE`);
  if (m.pierce) bits.push('PIERCES POISE');
  return bits.join(' · ');
}

const GRADE_TEXT: Record<PerfGrade, string> = { perfect: 'PERFECT!', great: 'GREAT!', ok: 'OK', sloppy: 'SLOPPY…' };

export class BattleController {
  readonly hud: Obs<HudState>;
  readonly director: Director;
  private state: BattleState;
  private alive = true;
  private cpu = { rng: 0 };
  private overtimeAnnounced = false;
  private coached = new Set<string>();
  private startedAt = performance.now();

  constructor(private stage: Stage, private cfg: BattleConfig) {
    this.state = createBattle({ arena: cfg.arena, a: { toyId: cfg.sides[0].toyId, level: cfg.sides[0].level }, b: { toyId: cfg.sides[1].toyId, level: cfg.sides[1].level }, seed: cfg.seed });
    this.cpu.rng = (cfg.seed * 2654435761) >>> 0;
    this.director = new Director(stage, cfg.arena, { toyId: cfg.sides[0].toyId, deluxe: isDeluxe(cfg.sides[0].level) }, { toyId: cfg.sides[1].toyId, deluxe: isDeluxe(cfg.sides[1].level) });
    this.hud = new Obs<HudState>({
      sides: [this.sideHud(0), this.sideHud(1)],
      contest: ARENAS[cfg.arena].contest,
      round: 0,
      overtime: 1,
      menu: null,
      minigame: null,
      defense: null,
      caption: null,
      callouts: [],
      words: [],
      turn: null,
      coach: null,
      vs: null,
      showHud: false,
    });
  }

  private sideHud(side: Side): SideHud {
    const b = this.state.sides[side].b;
    const t = toy(b.toyId);
    const ab = ABILITIES[t.ability];
    const c = this.cfg.sides[side];
    return {
      toyId: b.toyId,
      name: t.name,
      type: t.type,
      level: b.level,
      deluxe: isDeluxe(b.level),
      spirit: b.spirit,
      maxSpirit: b.maxSpirit,
      ghost: b.spirit,
      naughty: this.state.sides[side].naughty,
      stages: { ...b.stages },
      tangled: b.tangled,
      ability: ab.name,
      abilityText: ab.text,
      abilityReady: ab.oneShot ? true : null,
      abilityFlash: 0,
      hitAt: 0,
      control: c.control,
      label: c.label,
    };
  }

  abort() {
    this.alive = false;
    this.hud.update((h) => ({ ...h, menu: null, minigame: null, defense: null }));
    this.director.dispose();
  }

  // ── helpers ────────────────────────────────────────────

  private async wait(s: number) {
    await this.stage.rt.wait(s);
    if (!this.alive) throw new Aborted();
  }

  private patch(p: Partial<HudState>) {
    this.hud.update((h) => ({ ...h, ...p }));
  }

  private patchSide(side: Side, p: Partial<SideHud>) {
    this.hud.update((h) => {
      const sides = [...h.sides] as [SideHud, SideHud];
      sides[side] = { ...sides[side], ...p };
      return { ...h, sides };
    });
  }

  private setSpirit(side: Side, spirit: number) {
    const hurt = spirit < this.hud.get().sides[side].spirit;
    this.patchSide(side, hurt ? { spirit, hitAt: Date.now() } : { spirit });
    void this.stage.rt.wait(0.55).then(() => this.patchSide(side, { ghost: spirit }));
  }

  call(text: string, style: CalloutStyle, o: Partial<Callout> = {}, ms = 1100) {
    const c: Callout = { id: uid++, text, style, ...o };
    this.hud.update((h) => ({ ...h, callouts: [...h.callouts, c] }));
    void this.stage.rt.wait(ms / 1000).then(() => this.hud.update((h) => ({ ...h, callouts: h.callouts.filter((x) => x.id !== c.id) })));
  }

  private word(text: string, at: THREE.Vector3, color: string, size = 1) {
    const p = this.stage.project(at);
    const w = { id: uid++, text, x: p.x, y: p.y, color, rot: (Math.random() - 0.5) * 0.4, size };
    this.hud.update((h) => ({ ...h, words: [...h.words, w] }));
    void this.stage.rt.wait(1.0).then(() => this.hud.update((h) => ({ ...h, words: h.words.filter((x) => x.id !== w.id) })));
  }

  private moveViews(side: Side): MoveView[] {
    const foeType = toy(this.state.sides[other(side)].b.toyId).type;
    return this.state.sides[side].b.moves.map((id) => {
      const m = move(id);
      return { id, name: m.name, type: m.type, kind: m.kind, power: m.power, game: m.game, difficulty: m.difficulty, naughty: m.naughty, blurb: m.blurb, effect: describeMove(m), superVsFoe: m.kind === 'show' && effectiveness(m.type, foeType) === 'super', home: m.kind === 'show' && ARENAS[this.cfg.arena].boost === m.type };
    });
  }

  private askMove(side: Side): Promise<string> {
    return new Promise((resolve) => {
      this.patch({
        menu: {
          side,
          control: this.cfg.sides[side].control as Control,
          moves: this.moveViews(side),
          resolve: (id) => {
            this.patch({ menu: null });
            resolve(id);
          },
        },
      });
    });
  }

  private askPerformance(side: Side, plan: MovePlan): Promise<number> {
    return new Promise((resolve) => {
      this.patch({
        minigame: {
          id: uid++,
          side,
          control: this.cfg.sides[side].control as Control,
          game: plan.move.game,
          difficulty: plan.difficulty,
          speed: plan.speed,
          moveName: plan.move.name,
          type: plan.move.type,
          resolve: (score) => {
            this.patch({ minigame: null });
            resolve(score);
          },
        },
      });
    });
  }

  private async askDefense(side: Side, duration: number): Promise<DefenseGrade> {
    // The camera was just cut to a two-shot; wait one frame so projection uses it.
    await this.stage.rt.wait(0.001);
    const p = this.stage.project(this.director.head(side));
    return new Promise((resolve) => {
      this.patch({
        defense: {
          id: uid++,
          side,
          control: this.cfg.sides[side].control as Control,
          duration,
          x: p.x,
          y: p.y,
          resolve: (g) => {
            this.patch({ defense: null });
            resolve(g);
          },
        },
      });
    });
  }

  private async cpuDefense(side: Side, duration: number): Promise<DefenseGrade> {
    await this.stage.rt.wait(duration);
    return rollDefense(this.cpu, SKILL[this.cfg.sides[side].hands ?? 'normal']);
  }

  // ── the loop ───────────────────────────────────────────

  async run(): Promise<BattleOutcome> {
    try {
      const vs = ([0, 1] as const).map((s) => ({ toyId: this.cfg.sides[s].toyId, name: toy(this.cfg.sides[s].toyId).name, label: this.cfg.sides[s].label, level: this.cfg.sides[s].level }));
      this.patch({ showHud: false, vs });
      sfx.whoosh();
      void this.stage.rt.wait(0.35).then(() => sfx.impact(true));
      const intro = this.director.intro();
      await this.wait(1.7);
      this.patch({ vs: null });
      this.call(this.hud.get().contest.toUpperCase(), 'banner', {}, 1500);
      sfx.round();
      voice('showdown');
      await intro;
      await this.wait(0.6);
      this.director.shotWide();
      this.patch({ showHud: true });
      await this.wait(0.3);
      while (this.state.winner === null) await this.turn();
      return await this.ending();
    } catch (e) {
      if (e instanceof Aborted) return { winner: 1, turns: this.state.turns };
      throw e;
    }
  }

  private async turn() {
    const t = beginTurn(this.state);
    this.state = t.state;
    await this.play(t.events);
    if (!t.canAct) return;
    const actor = t.actor;
    const foe = other(actor);
    const me = this.cfg.sides[actor];
    this.patch({ turn: actor });
    this.director.shotFocus(actor);
    let moveId: string;
    if (me.control === 'cpu') {
      await this.wait(0.6);
      moveId = chooseMove(this.state, actor, me.brain ?? 'normal', this.cpu);
    } else {
      if (this.cfg.coach && !this.coached.has('menu')) {
        this.coached.add('menu');
        this.patch({ coach: { text: COACH.menu, where: 'top' } });
      }
      moveId = await this.askMove(actor);
      this.patch({ coach: null });
      if (!this.alive) throw new Aborted();
    }
    const plan = planMove(this.state, actor, moveId);
    const m = plan.move;
    sfx.whoosh();
    this.call(m.name.toUpperCase(), 'move', { color: hex(TYPE_COLOR[m.type]), side: actor }, 1300);
    this.patch({ caption: { title: `${toy(this.state.sides[actor].b.toyId).name} — ${m.name}`, text: m.blurb, side: actor } });
    await this.director.anticipate(actor, m);

    let score: number;
    if (me.control === 'cpu') {
      await this.director.tremble(actor, 0.55);
      score = rollScore(this.cpu, SKILL[me.hands ?? 'normal'], plan.difficulty, plan.speed);
    } else {
      score = await this.askPerformance(actor, plan);
      if (!this.alive) throw new Aborted();
      tlog({ kind: 'perf', game: m.game, difficulty: plan.difficulty, speed: plan.speed, score: Math.round(score * 100) / 100 });
    }
    this.gradeCallout(score, actor);
    await this.wait(0.25);

    if (m.kind === 'show') {
      let def: DefenseGrade = 'none';
      const foeToy = this.state.sides[foe].b;
      const big = score >= 0.9 || (effectiveness(m.type, toy(foeToy.toyId).type) === 'super' && toy(foeToy.toyId).ability !== 'topBilling');
      if (plan.willDodge) {
        await this.director.release(actor, m);
      } else {
        const D = KEEP_COOL_SECONDS;
        const R = this.director.releaseTime(m.anim);
        this.director.shotDefense(actor);
        if (this.cfg.coach && this.cfg.sides[foe].control !== 'cpu' && !this.coached.has('defend')) {
          this.coached.add('defend');
          this.patch({ coach: { text: COACH.defend, where: 'bottom' } });
        }
        const defP = this.cfg.sides[foe].control === 'cpu' ? this.cpuDefense(foe, D) : this.askDefense(foe, D);
        if (this.cfg.sides[foe].control !== 'cpu') sfx.ring();
        await this.director.tremble(actor, D - R);
        await this.director.release(actor, m);
        this.director.impact(foe, m.type, big);
        sfx.impact(big);
        sfx.type(m.type);
        this.word(m.word, this.director.head(foe).add(new THREE.Vector3(0, 0.5, 0)), hex(TYPE_COLOR[m.type]), big ? 1.35 : 1);
        def = await defP;
        if (!this.alive) throw new Aborted();
        this.patch({ coach: null });
        if (this.cfg.sides[foe].control !== 'cpu') tlog({ kind: 'defense', grade: def });
      }
      const r = resolveMove(this.state, actor, moveId, score, def);
      this.state = r.state;
      await this.play(r.events);
      if (this.state.winner === null) await this.director.recover(actor);
    } else {
      await this.director.trick(actor, m);
      sfx.type(m.type);
      const r = resolveMove(this.state, actor, moveId, score, 'none');
      this.state = r.state;
      await this.play(r.events);
    }
    this.patch({ turn: null, caption: null });
    if (this.state.winner === null) {
      this.director.shotWide();
      await this.wait(0.35);
    }
  }

  private gradeCallout(score: number, side: Side) {
    const g: PerfGrade = score >= 0.9 ? 'perfect' : score >= 0.65 ? 'great' : score >= 0.35 ? 'ok' : 'sloppy';
    this.call(GRADE_TEXT[g], 'grade', { side, color: g === 'perfect' ? '#ffc73a' : g === 'great' ? '#2ad4e0' : g === 'ok' ? '#fff4e0' : '#9a8fa8' }, 900);
    sfx[g]();
    if (g === 'perfect') voice('perfect');
  }

  private async play(events: BattleEvent[]) {
    for (const e of events) {
      switch (e.t) {
        case 'round':
          this.patch({ round: e.round, overtime: e.overtime });
          if (e.overtime > 1 && !this.overtimeAnnounced) {
            this.overtimeAnnounced = true;
            this.call('OVERTIME', 'banner', {}, 1600);
            this.patch({ caption: { text: 'The judges are getting restless. Everything hits harder now.' } });
            sfx.round();
            voice('overtime');
            await this.wait(1.4);
          } else if (e.round > 1) {
            this.call(`ROUND ${e.round}`, 'small', {}, 800);
          }
          break;
        case 'decay':
          this.patchSide(e.side, { naughty: e.value });
          break;
        case 'skip': {
          this.director.shotFocus(e.side);
          this.call('TANGLED!', 'naughty', { side: e.side }, 1000);
          this.patch({ caption: { text: `${toy(this.state.sides[e.side].b.toyId).name} spends the turn getting untangled.` } });
          sfx.tangle();
          await this.wait(1.1);
          this.director.tangle(e.side, false);
          this.patchSide(e.side, { tangled: false });
          this.patch({ caption: null });
          break;
        }
        case 'use':
        case 'perf':
          break;
        case 'dodge':
          this.call("CAN'T CATCH ME!", 'ability', { side: e.side }, 1200);
          sfx.whoosh();
          await this.director.dodge(e.side);
          break;
        case 'hit': {
          this.setSpirit(e.side, e.spirit);
          if (e.eff === 'super') {
            this.call('SUPER SWEET!', 'super', {}, 1200);
            sfx.superSweet();
            voice('superSweet');
          }
          if (e.defense === 'perfect') {
            this.call('UNFAZED!', 'defense', { side: e.side }, 1000);
            sfx.unfazed();
          } else if (e.defense === 'good') {
            this.call('STEADY', 'defense', { side: e.side }, 900);
            sfx.steady();
          }
          const frac = e.amount / this.state.sides[e.side].b.maxSpirit;
          await this.director.flinch(e.side, Math.min(1.4, 0.4 + frac * 3));
          break;
        }
        case 'stat': {
          this.patchSide(e.side, { stages: { ...this.state.sides[e.side].b.stages } });
          if (e.blocked || e.delta === 0) {
            this.word(e.blocked ? 'NOPE' : 'MAXED', this.director.top(e.side), '#fff4e0', 0.7);
            break;
          }
          this.director.statFx(e.side, e.delta > 0);
          const arrows = (e.delta > 0 ? '▲' : '▼').repeat(Math.abs(e.delta));
          this.word(`${STAT_LABEL[e.stat]} ${arrows}`, this.director.top(e.side), e.delta > 0 ? '#7cf27c' : '#ff5c7a', 0.75);
          if (e.delta > 0) sfx.statUp();
          else sfx.statDown();
          await this.wait(0.45);
          break;
        }
        case 'fizzle':
          this.call('…FIZZLED', 'small', { side: e.side }, 900);
          sfx.fizzle();
          await this.wait(0.6);
          break;
        case 'heal':
          this.setSpirit(e.side, e.spirit);
          this.director.healFx(e.side);
          this.word(`+${e.amount}`, this.director.top(e.side), '#7cf27c', 0.8);
          sfx.heal();
          await this.wait(0.4);
          break;
        case 'tangle':
          if (e.result === 'tangled') {
            this.director.tangle(e.side, true);
            this.patchSide(e.side, { tangled: true });
            this.call('TANGLED!', 'naughty', { side: e.side }, 1000);
            sfx.tangle();
          } else {
            this.word(e.result === 'immune' ? 'SLIPPED FREE' : e.result === 'resisted' ? 'SHRUGGED IT OFF' : 'MISSED', this.director.top(e.side), '#fff4e0', 0.7);
          }
          await this.wait(0.5);
          break;
        case 'naughty':
          this.patchSide(e.side, { naughty: e.value });
          this.call('NAAAUGHTY!', 'naughty', { side: e.side }, 1100);
          sfx.naughty();
          voice('naughty');
          await this.wait(0.5);
          break;
        case 'coal':
          this.patchSide(e.side, { naughty: 0 });
          this.call(e.healed ? 'COAL! (DELICIOUS)' : 'COAL!', 'coal', { side: e.side }, 1300);
          sfx.coal();
          voice('coal');
          await this.director.coal(e.side, e.healed);
          this.setSpirit(e.side, e.spirit);
          await this.wait(0.3);
          break;
        case 'ability': {
          const ab = ABILITIES[e.ability];
          this.patchSide(e.side, { abilityFlash: Date.now(), ...(ab.oneShot ? { abilityReady: false } : {}) });
          if (e.ability === 'unretired') {
            this.call('NOT YET.', 'ability', { side: e.side }, 1300);
            await this.wait(0.6);
          }
          break;
        }
        case 'ko':
          this.patch({ caption: null, showHud: true });
          sfx.ko();
          this.call('HUMBUGGED!', 'ko', {}, 1800);
          voice('humbugged');
          await this.director.ko(e.side);
          await this.wait(0.5);
          break;
        case 'win':
          break;
      }
    }
  }

  private async ending(): Promise<BattleOutcome> {
    const w = this.state.winner!;
    tlog({ kind: 'battle', winner: w, turns: this.state.turns, rounds: this.state.round, secs: Math.round((performance.now() - this.startedAt) / 100) / 10, a: this.cfg.sides[0].toyId, b: this.cfg.sides[1].toyId });
    const l = other(w);
    this.patch({ turn: null, menu: null, minigame: null, defense: null });
    sfx.victory();
    await this.director.victory(w);
    if (this.cfg.boxOnWin && w === 0) {
      await this.wait(0.2);
      const p = this.director.boxUp(l);
      await this.wait(0.65);
      sfx.boxed();
      this.call('BOXED!', 'boxed', {}, 1800);
      voice('boxed');
      await p;
      await this.wait(1.0);
    } else {
      this.call(`${toy(this.cfg.sides[w].toyId).name.toUpperCase()} WINS`, 'banner', {}, 1800);
      await this.wait(1.6);
    }
    return { winner: w, turns: this.state.turns };
  }
}

