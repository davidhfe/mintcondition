import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ArenaId, Side } from '../../core/types';
import { ABILITIES, ROSTER, toy } from '../../core/data/toys';
import { ARENA_LIST, ARENAS, effectiveness } from '../../core/data/arenas';
import { app, go, stage } from '../store';
import { useObs } from '../obs';
import { thumbnail } from '../portraits';
import { Btn, KeyHint, Portrait, StatBars, TypeLoop, useNav } from '../ui';
import { BattleHud, TypeChip } from '../battle/Hud';
import { BattleController } from '../battle/controller';
import { Director } from '../../render/director';
import { onKey } from '../../input/keys';
import { sfx, unlockAudio } from '../../audio/sfx';
import { statsAt } from '../../core/stats';

export const VERSUS_LEVEL = 8;
const COLS = 7;

function ArenaThumb({ id }: { id: ArenaId }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => void thumbnail(id).then(setU), [id]);
  return u ? <img class="thumb" src={u} alt="" /> : <div class="thumb wait" />;
}

export function VersusSetup({ cpu }: { cpu: boolean }) {
  const a = useObs(app);
  const [arena, setArena] = useState<ArenaId | null>(null);
  return arena ? <ToyPick cpu={cpu} arena={arena} onBack={() => setArena(null)} topper={!!a.save?.zones.tree.stewardBeaten} /> : <ContestPick onPick={setArena} cpu={cpu} />;
}

function ContestPick({ onPick, cpu }: { onPick: (a: ArenaId) => void; cpu: boolean }) {
  useEffect(() => {
    stage().setSet(null);
  }, []);
  const [sel, setSel] = useNav(ARENA_LIST.length, { cols: 5, onAct: (i) => (sfx.confirm(), onPick(ARENA_LIST[i]!.id)), onBack: () => go({ id: 'title' }) });
  return (
    <div class="screen contest">
      <h1 class="headline">Pick the contest. <em>{cpu ? 'You vs the CPU.' : 'P1 vs P2, one keyboard.'}</em></h1>
      <div class="contest-row">
        {ARENA_LIST.map((ar, i) => (
          <button class={`contest-card panel ${i === sel ? 'sel' : ''}`} key={ar.id} onClick={() => (setSel(i), sfx.confirm(), onPick(ar.id))}>
            <ArenaThumb id={ar.id} />
            <div class="cc-name">{ar.contest}</div>
            <div class="cc-place">{ar.place}</div>
            <div class="cc-boost">{ar.boost ? <><TypeChip type={ar.boost} small /> moves ×1.15</> : 'No home team'}</div>
            <div class="cc-blurb">{ar.blurb}</div>
          </button>
        ))}
      </div>
      <KeyHint>Arrows / WASD · <b>SPACE</b> / <b>ENTER</b> to pick · <b>ESC</b> back</KeyHint>
    </div>
  );
}

function ToyPick({ cpu, arena, onBack, topper }: { cpu: boolean; arena: ArenaId; onBack: () => void; topper: boolean }) {
  const roster = useMemo(() => [...ROSTER.map((t) => t.id), ...(topper ? ['topper'] : [])], [topper]);
  const [cur, setCur] = useState<[number, number]>([0, Math.min(roster.length - 1, 4)]);
  const [locked, setLocked] = useState<[boolean, boolean]>([false, false]);
  const dir = useRef<Director | null>(null);
  const curRef = useRef({ cur, locked });
  curRef.current = { cur, locked };

  useEffect(() => {
    const d = new Director(stage(), arena, { toyId: roster[cur[0]]!, deluxe: true }, { toyId: roster[cur[1]]!, deluxe: true });
    d.shotWide(true);
    dir.current = d;
    return () => d.dispose();
  }, []);

  const lockIn = (p: Side) => {
    const { cur: c, locked: l } = curRef.current;
    if (l[p]) return;
    sfx.confirm();
    const next: [boolean, boolean] = [...l] as [boolean, boolean];
    next[p] = true;
    if (cpu && p === 0) {
      next[1] = true;
      const pickIdx = Math.floor(Math.random() * ROSTER.length);
      const nc: [number, number] = [c[0], pickIdx];
      setCur(nc);
      dir.current?.setToy(1, { toyId: roster[pickIdx]!, deluxe: true });
    }
    void dir.current?.hop(p, 0.7);
    setLocked(next);
  };

  const move = (p: Side, delta: number) => {
    const { cur: c, locked: l } = curRef.current;
    if (l[p]) return;
    const n = Math.max(0, Math.min(roster.length - 1, c[p] + delta));
    if (n === c[p]) return;
    sfx.move();
    const nc: [number, number] = [...c] as [number, number];
    nc[p] = n;
    setCur(nc);
    dir.current?.setToy(p, { toyId: roster[n]!, deluxe: true });
  };

  useEffect(() => {
    return onKey((e) => {
      unlockAudio();
      const p: Side = cpu ? 0 : e.player;
      const d = { left: -1, right: 1, up: -COLS, down: COLS }[e.action as 'left'];
      if (e.action === 'back') {
        const { locked: l } = curRef.current;
        if (l[p] && !(cpu && p === 0 && false)) {
          const nl: [boolean, boolean] = [...l] as [boolean, boolean];
          nl[p] = false;
          if (cpu) nl[1] = false;
          setLocked(nl);
        } else onBack();
        return;
      }
      if (e.action === 'act') lockIn(p);
      else if (d !== undefined) move(p, d);
    });
  }, []);

  useEffect(() => {
    if (!locked[0] || !locked[1]) return;
    const t = setTimeout(() => go({ id: 'versusBattle', cpu, arena, toys: [roster[cur[0]]!, roster[cur[1]]!] }), 900);
    return () => clearTimeout(t);
  }, [locked]);

  const card = (p: Side) => {
    const id = roster[cur[p]]!;
    const t = toy(id);
    const foe = toy(roster[cur[p === 0 ? 1 : 0]]!);
    const ab = ABILITIES[t.ability];
    return (
      <div class={`vs-card panel side${p} ${locked[p] ? 'locked' : ''}`}>
        <div class="vs-who">{p === 0 ? 'P1' : cpu ? 'CPU' : 'P2'}{locked[p] && <span class="lockmark">LOCKED</span>}</div>
        <div class="fc-name">{t.name}</div>
        <div class="sc-row"><TypeChip type={t.type} /> <span class="sc-ab">★ {ab.name}</span></div>
        <p class="fc-ab">{ab.text}</p>
        <StatBars s={statsAt(id, 5)} />
        {effectiveness(t.type, foe.type) === 'super' && foe.ability !== 'topBilling' && <div class="badge good">SUPER SWEET vs {foe.name}</div>}
        {ARENAS[arena].boost === t.type && <div class="badge home">HOME CONTEST</div>}
        {!locked[p] && !(cpu && p === 1) && (
          <button class="btn lockin" onClick={() => lockIn(p)}>
            Lock in · <b>{p === 0 ? 'SPACE' : 'ENTER'}</b>
          </button>
        )}
      </div>
    );
  };

  return (
    <div class="screen versus">
      <h1 class="headline sm">{ARENAS[arena].contest} <em>· {ARENAS[arena].blurb}</em></h1>
      {card(0)}
      {card(1)}
      <div class="roster">
        {roster.map((id, i) => (
          <button
            class={`rcell ${cur[0] === i ? 'p1' : ''} ${cur[1] === i ? 'p2' : ''}`}
            key={id}
            onClick={() => {
              const p: Side = cpu || !locked[0] ? 0 : 1;
              move(p, i - curRef.current.cur[p]);
            }}
            onDblClick={() => lockIn(cpu || !locked[0] ? 0 : 1)}
          >
            <Portrait toyId={id} deluxe />
            <span>{toy(id).name}</span>
          </button>
        ))}
      </div>
      <div class="versus-foot">
        <TypeLoop />
        <KeyHint>
          P1 <b>WASD</b> + <b>SPACE</b> {cpu ? '' : <>· P2 <b>ARROWS</b> + <b>ENTER</b></>} · lock in to fight · <b>ESC</b> unlock/back
        </KeyHint>
      </div>
      {locked[0] && locked[1] && <div class="callouts"><div class="callout banner"><span data-text="SHOWDOWN!">SHOWDOWN!</span></div></div>}
    </div>
  );
}

export function VersusBattle({ cpu, arena, toys }: { cpu: boolean; arena: ArenaId; toys: [string, string] }) {
  const a = useObs(app);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<Side | null>(null);
  const ctl = useMemo(
    () =>
      new BattleController(stage(), {
        arena,
        sides: [
          { toyId: toys[0], level: VERSUS_LEVEL, control: cpu ? 'any' : 'p1', label: 'P1' },
          cpu
            ? { toyId: toys[1], level: VERSUS_LEVEL, control: 'cpu', brain: a.settings.cpu, hands: a.settings.cpu, label: 'CPU' }
            : { toyId: toys[1], level: VERSUS_LEVEL, control: 'p2', label: 'P2' },
        ],
        seed: (Date.now() * 2654435761) >>> 0,
      }),
    [round],
  );
  useEffect(() => {
    let live = true;
    setResult(null);
    void ctl.run().then((o) => live && setResult(o.winner));
    return () => {
      live = false;
      ctl.abort();
    };
  }, [ctl]);
  return (
    <>
      <BattleHud hud={ctl.hud} />
      {result !== null && <PostMatch winner={result} cpu={cpu} onRematch={() => setRound((r) => r + 1)} onChange={() => go({ id: 'versus', cpu })} />}
    </>
  );
}

function PostMatch({ winner, cpu, onRematch, onChange }: { winner: Side; cpu: boolean; onRematch: () => void; onChange: () => void }) {
  const opts = [
    { label: 'Rematch', act: onRematch },
    { label: 'Change toys', act: onChange },
    { label: 'Title', act: () => go({ id: 'title' }) },
  ];
  const [sel, setSel] = useNav(3, { onAct: (i) => (sfx.confirm(), opts[i]!.act()) });
  return (
    <div class="postmatch panel">
      <div class={`pm-head side${winner}`}>{winner === 0 ? 'P1' : cpu ? 'CPU' : 'P2'} WINS</div>
      {opts.map((o, i) => (
        <Btn key={o.label} sel={i === sel} onClick={() => (setSel(i), o.act())}>{o.label}</Btn>
      ))}
    </div>
  );
}
