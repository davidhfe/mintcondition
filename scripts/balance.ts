/**
 * Balance report. Runs thousands of simulated showdowns and prints the numbers
 * we tune against (targets in docs/PLAYTEST.md).
 *
 *   npm run balance            # full report
 *   npm run balance -- --quick # fewer seeds
 */
import { ROSTER, toy } from '../src/core/data/toys';
import { ARENA_LIST, effectiveness } from '../src/core/data/arenas';
import { simulate, type SimSide } from '../src/core/sim';
import { SKILL, type CpuLevel } from '../src/core/ai';
import { move } from '../src/core/data/moves';
import {
  applyResult,
  chooseStarter,
  isComplete,
  isUnlocked,
  newSave,
  rollEncounter,
  stewardEncounter,
  stewardReady,
  STARTERS,
  ZONES,
  opponentProfile,
  type Encounter,
  type SaveData,
} from '../src/core/campaign';
import type { ArenaId } from '../src/core/types';

const QUICK = process.argv.includes('--quick');
const SEEDS = QUICK ? 6 : 24;
const LEVEL = 8;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const N = (brain: CpuLevel, hands?: CpuLevel): SimSide => ({ brain, hands: SKILL[hands ?? brain] });

// ── 1. Round robin ──────────────────────────────────────────
const ids = ROSTER.map((t) => t.id);
const wins = new Map<string, number>(ids.map((i) => [i, 0]));
const games = new Map<string, number>(ids.map((i) => [i, 0]));
const matrix = new Map<string, number>(); // `${a}>${b}` → win rate of a vs b
let turnsTotal = 0, battles = 0, overtime = 0, coal = 0, naughtyUses = 0, moveUses = 0, firstMoverWins = 0, tangles = 0;
const moveCount = new Map<string, number>();
const turnHist: number[] = [];
let seed = 1;
for (const a of ids)
  for (const b of ids) {
    if (a === b) continue;
    let aw = 0, n = 0;
    for (const arena of ARENA_LIST)
      for (let k = 0; k < SEEDS; k++) {
        const r = simulate({ arena: arena.id, a: { toyId: a, level: LEVEL }, b: { toyId: b, level: LEVEL }, seed: seed++ }, [N('normal'), N('normal')], true);
        n++; battles++;
        if (r.winner === 0) aw++;
        turnsTotal += r.turns; turnHist.push(r.turns);
        if (r.rounds >= 7) overtime++;
        const firstRound = r.events.find((e) => e.t === 'round');
        if (firstRound && firstRound.t === 'round' && firstRound.first === r.winner) firstMoverWins++;
        for (const e of r.events) {
          if (e.t === 'coal') coal++;
          if (e.t === 'tangle' && e.result === 'tangled') tangles++;
          if (e.t === 'use') {
            moveUses++;
            moveCount.set(e.moveId, (moveCount.get(e.moveId) ?? 0) + 1);
            if (move(e.moveId).naughty) naughtyUses++;
          }
        }
      }
    wins.set(a, wins.get(a)! + aw); games.set(a, games.get(a)! + n);
    wins.set(b, wins.get(b)! + (n - aw)); games.set(b, games.get(b)! + n);
    matrix.set(`${a}>${b}`, aw / n);
  }

console.log(`\n## Round robin — L${LEVEL}, normal vs normal, ${battles} battles\n`);
console.log('| Toy | Type | Win rate |\n|---|---|---|');
const ranked = ids.map((i) => ({ i, wr: wins.get(i)! / games.get(i)! })).sort((x, y) => y.wr - x.wr);
for (const { i, wr } of ranked) console.log(`| ${toy(i).name} | ${toy(i).type} | ${pct(wr)} |`);
turnHist.sort((x, y) => x - y);
console.log(`\n- Avg turns per battle: **${(turnsTotal / battles).toFixed(1)}** (median ${turnHist[turnHist.length >> 1]}, p90 ${turnHist[Math.floor(turnHist.length * 0.9)]})`);
console.log(`- Battles reaching overtime: **${pct(overtime / battles)}**`);
console.log(`- First mover wins: **${pct(firstMoverWins / battles)}**`);
console.log(`- Coal per battle: **${(coal / battles).toFixed(2)}** · Tangles per battle: **${(tangles / battles).toFixed(2)}** · Naughty share of moves: **${pct(naughtyUses / moveUses)}**`);

// matchup extremes (symmetrised)
const pairs: { a: string; b: string; wr: number }[] = [];
for (const a of ids) for (const b of ids) if (a < b) pairs.push({ a, b, wr: (matrix.get(`${a}>${b}`)! + 1 - matrix.get(`${b}>${a}`)!) / 2 });
pairs.sort((x, y) => Math.abs(y.wr - 0.5) - Math.abs(x.wr - 0.5));
console.log('\nMost lopsided matchups:');
for (const p of pairs.slice(0, 8)) {
  const [w, l, wr] = p.wr >= 0.5 ? [p.a, p.b, p.wr] : [p.b, p.a, 1 - p.wr];
  const eff = effectiveness(toy(w).type, toy(l).type);
  console.log(`- ${toy(w).name} beats ${toy(l).name} ${pct(wr)} (${eff})`);
}
let superSum = 0, superN = 0;
for (const p of pairs) {
  const e = effectiveness(toy(p.a).type, toy(p.b).type);
  if (e === 'super') { superSum += p.wr; superN++; } else if (effectiveness(toy(p.b).type, toy(p.a).type) === 'super') { superSum += 1 - p.wr; superN++; }
}
console.log(`\n- Type-advantaged side wins: **${pct(superSum / superN)}**`);

// move usage: flag dead moves
const unused = ROSTER.flatMap((t) => t.moves.map((m) => ({ t: t.name, m, c: moveCount.get(m) ?? 0 })));
const perToy = new Map<string, number>();
for (const u of unused) perToy.set(u.t, (perToy.get(u.t) ?? 0) + u.c);
const rare = unused.filter((u) => u.c / perToy.get(u.t)! < 0.08);
console.log(`- Rarely chosen moves (<8% of that toy's picks): ${rare.length ? rare.map((u) => `${u.t}/${move(u.m).name} ${pct(u.c / perToy.get(u.t)!)}`).join(', ') : 'none'}`);

// ── 2. Arena effect ─────────────────────────────────────────
let homeW = 0, homeN = 0;
for (const a of ids) {
  const home = ARENA_LIST.find((x) => x.boost === toy(a).type)!.id;
  for (const b of ids) {
    if (a === b) continue;
    for (let k = 0; k < SEEDS; k++) {
      const r = simulate({ arena: home, a: { toyId: a, level: LEVEL }, b: { toyId: b, level: LEVEL }, seed: seed++ }, [N('normal'), N('normal')]);
      homeN++; if (r.winner === 0) homeW++;
    }
  }
}
console.log(`- Win rate in your home arena: **${pct(homeW / homeN)}**`);

// ── 3. Skill sensitivity ────────────────────────────────────
console.log('\n## Skill sensitivity (mirror matches, same brain)\n');
for (const [hi, lo] of [['hard', 'normal'], ['normal', 'easy'], ['hard', 'easy']] as const) {
  let w = 0, n = 0;
  for (const a of ids) for (let k = 0; k < SEEDS * 2; k++) {
    const r = simulate({ arena: 'tree', a: { toyId: a, level: LEVEL }, b: { toyId: a, level: LEVEL }, seed: seed++ }, [{ brain: 'normal', hands: SKILL[hi] }, { brain: 'normal', hands: SKILL[lo] }]);
    n++; if (r.winner === 0) w++;
  }
  console.log(`- ${hi} hands vs ${lo} hands: **${pct(w / n)}**`);
}
{
  let w = 0, n = 0;
  for (const a of ids) for (let k = 0; k < SEEDS * 2; k++) {
    const r = simulate({ arena: 'tree', a: { toyId: a, level: LEVEL }, b: { toyId: a, level: LEVEL }, seed: seed++ }, [{ brain: 'hard', hands: SKILL.normal }, { brain: 'easy', hands: SKILL.normal }]);
    n++; if (r.winner === 0) w++;
  }
  console.log(`- hard brain vs easy brain (same hands): **${pct(w / n)}**`);
}

// ── 4. Campaign curve ───────────────────────────────────────
// A "player" with normal hands picks, for each encounter, the shelf toy with the
// best quick-simmed odds. Opponents use the in-game opponentProfile().
function oppSide(e: Encounter): SimSide {
  const p = opponentProfile(e);
  return { brain: p.brain, hands: SKILL[p.hands] };
}
function pickToy(save: SaveData, e: Encounter, seedBase: number): string {
  let best = save.shelf[0]!.uid, bestWr = -1;
  for (const t of save.shelf) {
    let w = 0;
    for (let k = 0; k < 8; k++) {
      const r = simulate({ arena: e.zone, a: { toyId: t.toyId, level: t.level }, b: { toyId: e.toyId, level: e.level }, seed: seedBase + k }, [N('normal'), oppSide(e)]);
      if (r.winner === 0) w++;
    }
    if (w > bestWr) { bestWr = w; best = t.uid; }
  }
  return best;
}
console.log('\n## Campaign curve (normal-skill player, best-odds toy each time)\n');
console.log('| Starter | Battles | Losses | Win% wild | Win% steward | Topper tries | Final levels |\n|---|---|---|---|---|---|---|');
const zoneLoss: Record<string, { b: number; l: number }> = {};
for (const starter of STARTERS) {
  const runs = QUICK ? 3 : 10;
  let tb = 0, tl = 0, ww = 0, wn = 0, sw = 0, sn = 0, topperTries = 0;
  let finalLevels = '';
  for (let run = 0; run < runs; run++) {
    let save = chooseStarter(newSave(0, 1000 + run), starter, 0);
    let guard = 0;
    while (!isComplete(save) && guard++ < 300) {
      const zid = [...ZONES].reverse().find((z) => isUnlocked(save, z.id))!.id as ArenaId;
      let enc: Encounter;
      if (stewardReady(save, zid) && !save.zones[zid].stewardBeaten) enc = stewardEncounter(zid);
      else { const r = rollEncounter(save, zid); save = r.save; enc = r.encounter; }
      const uid = pickToy(save, enc, seed);
      seed += 10;
      const mine = save.shelf.find((t) => t.uid === uid)!;
      const res = simulate({ arena: enc.zone, a: { toyId: mine.toyId, level: mine.level }, b: { toyId: enc.toyId, level: enc.level }, seed: seed++ }, [N('normal'), oppSide(enc)]);
      const won = res.winner === 0;
      tb++; if (!won) tl++;
      const zk = `${toy(starter).name.split(' ').pop()}/${zid}`;
      zoneLoss[zk] ??= { b: 0, l: 0 };
      zoneLoss[zk].b++; if (!won) zoneLoss[zk].l++;
      if (enc.zone === 'tree') topperTries++;
      else if (enc.steward) { sn++; if (won) sw++; } else { wn++; if (won) ww++; }
      save = applyResult(save, uid, enc, won, 0).save;
    }
    if (run === 0) finalLevels = save.shelf.map((t) => `${toy(t.toyId).name.split(' ').pop()} ${t.level}`).join(', ');
  }
  console.log(`| ${toy(starter).name} | ${(tb / runs).toFixed(1)} | ${(tl / runs).toFixed(1)} | ${pct(ww / wn)} | ${pct(sw / sn)} | ${(topperTries / runs).toFixed(1)} | ${finalLevels} |`);
}
console.log('\nLoss rate by starter/department: ' + Object.entries(zoneLoss).map(([z, v]) => `${z} ${pct(v.l / v.b)} (${v.b})`).join(' · '));
