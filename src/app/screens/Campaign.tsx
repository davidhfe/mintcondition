import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ArenaId } from '../../core/types';
import { ABILITIES, toy } from '../../core/data/toys';
import { ARENAS, effectiveness } from '../../core/data/arenas';
import { move } from '../../core/data/moves';
import {
  applyResult,
  chooseStarter,
  isUnlocked,
  newSave,
  opponentProfile,
  owns,
  rollEncounter,
  stewardEncounter,
  stewardReady,
  STARTERS,
  ZONES,
  type Encounter,
} from '../../core/campaign';
import { isDeluxe, statsAt, xpToNext } from '../../core/stats';
import { app, ask, go, setSave, stage } from '../store';
import { useObs } from '../obs';
import { thumbnail } from '../portraits';
import { Btn, KeyHint, Portrait, StatBars, TypeLoop, useNav } from '../ui';
import { TypeChip } from '../battle/Hud';
import { BattleHud } from '../battle/Hud';
import { BattleController } from '../battle/controller';
import { Director } from '../../render/director';
import { showcase } from '../../render/showcase';
import { sfx } from '../../audio/sfx';
import { onKey } from '../../input/keys';

/** A screen with no 3D, just the printed backdrop in the given colours. */
export function emptyBg(a: number, b: number, dot: number) {
  stage().setSet({ root: new THREE.Group(), bg: { a, b, dot, dotAmt: 0.6, burst: 0.5 } });
}

// ── Starter ─────────────────────────────────────────────────
export function Starter() {
  useEffect(() => emptyBg(0xffe6bf, 0xf2a46b, 0xd9432f), []);
  const pick = (id: string) => {
    sfx.confirm();
    const s = chooseStarter(newSave(Date.now(), (Math.random() * 2 ** 32) >>> 0), id, Date.now());
    setSave(s);
    go({ id: 'map' });
  };
  const [sel] = useNav(STARTERS.length, { cols: 3, onAct: (i) => pick(STARTERS[i]!), onBack: () => go({ id: 'title' }) });
  return (
    <div class="screen starter">
      <h1 class="headline">Pick one. <em>The others can wait.</em></h1>
      <div class="starter-row">
        {STARTERS.map((id, i) => {
          const t = toy(id);
          const ab = ABILITIES[t.ability];
          return (
            <button class={`starter-card panel ${i === sel ? 'sel' : ''}`} key={id} onClick={() => pick(id)}>
              <Portrait toyId={id} />
              <div class="sc-name">{t.name}</div>
              <div class="sc-row"><TypeChip type={t.type} /> <span class="sc-ab">★ {ab.name}</span></div>
              <p class="sc-bio">{t.bio}</p>
              <p class="sc-abtext">{ab.text}</p>
              <StatBars s={statsAt(id, 5)} />
            </button>
          );
        })}
      </div>
      <KeyHint><b>A/D</b> or <b>←/→</b> to browse · <b>SPACE</b> to choose</KeyHint>
    </div>
  );
}

// ── Map ─────────────────────────────────────────────────────
function Thumb({ id }: { id: ArenaId }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => void thumbnail(id).then(setU), [id]);
  return u ? <img class="thumb" src={u} alt="" /> : <div class="thumb wait" />;
}

export function MapScreen() {
  const a = useObs(app);
  const save = a.save!;
  useEffect(() => emptyBg(0xfff1d6, 0xf6c58a, 0xe8344e), []);
  const [choice, setChoice] = useState<ArenaId | null>(null);
  const start = (id: ArenaId, steward: boolean) => {
    sfx.confirm();
    if (steward) go({ id: 'encounter', enc: stewardEncounter(id) });
    else {
      const r = rollEncounter(save, id);
      setSave(r.save);
      go({ id: 'encounter', enc: r.encounter });
    }
  };
  const activate = (i: number) => {
    const z = ZONES[i]!;
    if (!isUnlocked(save, z.id)) {
      sfx.back();
      return;
    }
    if (z.id === 'tree') return start('tree', true);
    if (stewardReady(save, z.id) && !save.zones[z.id].stewardBeaten) setChoice(z.id);
    else start(z.id, false);
  };
  const [sel, setSel] = useNav(ZONES.length, { cols: 3, onAct: activate, onBack: () => go({ id: 'title' }), enabled: !choice && !a.settingsOpen });
  const boxedCount = new Set(save.shelf.map((t) => t.toyId)).size;
  return (
    <div class="screen map">
      <header class="topbar">
        <h1 class="headline sm">The North Pole <em>· every department is on strike</em></h1>
        <div class="topbar-r">
          <Btn kind="ghost" onClick={() => go({ id: 'shelf', back: { id: 'map' } })}>The Shelf · {boxedCount}/13</Btn>
          <Btn kind="ghost" onClick={() => go({ id: 'title' })}>Title</Btn>
        </div>
      </header>
      <div class="map-grid">
        {ZONES.map((z, i) => {
          const ar = ARENAS[z.id];
          const open = isUnlocked(save, z.id);
          const zp = save.zones[z.id];
          const ready = stewardReady(save, z.id) && !zp.stewardBeaten;
          const roster = z.id === 'tree' ? ['topper'] : [...z.wild, z.steward];
          return (
            <div class={`zone panel ${open ? '' : 'locked'} ${i === sel ? 'sel' : ''} z-${z.id}`} key={z.id} onClick={() => { setSel(i); activate(i); }}>
              <Thumb id={z.id} />
              <div class="zone-body">
                <div class="zone-place">{ar.place}</div>
                <div class="zone-contest">{ar.contest}</div>
                {ar.boost && <div class="zone-boost"><TypeChip type={ar.boost} small /> moves get a boost here</div>}
                <div class="zone-pips">
                  {roster.map((t, j) => (
                    <span class={`pip ${owns(save, t) ? 'got' : ''} ${j === 2 || z.id === 'tree' ? 'boss' : ''}`} key={j} title={owns(save, t) ? toy(t).name : '???'} />
                  ))}
                </div>
                <div class="zone-status">
                  {!open ? 'CLOSED — UNION MEETING' : zp.stewardBeaten ? 'Back at work. Rematches welcome.' : ready ? `${z.id === 'tree' ? 'The Topper' : 'The Shop Steward'} will see you.` : `Win ${Math.max(0, 2 - zp.wins)} more to meet the Steward.`}
                </div>
              </div>
              {!open && <div class="stamp">CLOSED</div>}
              {open && ready && z.id !== 'tree' && <div class="stamp gold">STEWARD</div>}
            </div>
          );
        })}
      </div>
      <footer class="map-foot">
        <TypeLoop />
        <span class="foot-note">Each type is <b>SUPER SWEET</b> against the next. Bring the right toy.</span>
      </footer>
      {choice && <ZoneChoice id={choice} onPick={(st) => (setChoice(null), start(choice, st))} onCancel={() => setChoice(null)} />}
    </div>
  );
}

function ZoneChoice({ id, onPick, onCancel }: { id: ArenaId; onPick: (steward: boolean) => void; onCancel: () => void }) {
  const z = ZONES.find((x) => x.id === id)!;
  const opts = [
    { label: `See the Steward — ${toy(z.steward).name}`, st: true },
    { label: 'Look around', st: false },
  ];
  const [sel, setSel] = useNav(2, { onAct: (i) => onPick(opts[i]!.st), onBack: onCancel });
  return (
    <div class="modal-back" onClick={onCancel}>
      <div class="modal panel" onClick={(e) => e.stopPropagation()}>
        <h2>{ARENAS[id].place}</h2>
        {opts.map((o, i) => (
          <Btn key={o.label} sel={sel === i} onClick={() => (setSel(i), onPick(o.st))}>{o.label}</Btn>
        ))}
      </div>
    </div>
  );
}

// ── Encounter ───────────────────────────────────────────────
export function EncounterScreen({ enc }: { enc: Encounter }) {
  const a = useObs(app);
  const save = a.save!;
  const shelf = useMemo(() => [...save.shelf].sort((x, y) => {
    const fx = effectiveness(toy(x.toyId).type, toy(enc.toyId).type) === 'super' ? 1 : 0;
    const fy = effectiveness(toy(y.toyId).type, toy(enc.toyId).type) === 'super' ? 1 : 0;
    return fy - fx || y.level - x.level;
  }), [save, enc]);
  const dir = useRef<Director | null>(null);
  useEffect(() => {
    const d = new Director(stage(), enc.zone, { toyId: shelf[0]!.toyId, deluxe: isDeluxe(shelf[0]!.level) }, { toyId: enc.toyId, deluxe: isDeluxe(enc.level) });
    d.shotWide(true);
    dir.current = d;
    sfx.whoosh();
    return () => d.dispose();
  }, []);
  const fight = (i: number) => {
    sfx.confirm();
    go({ id: 'battle', enc, uid: shelf[i]!.uid });
  };
  const [sel, setSel] = useNav(shelf.length, {
    cols: 99,
    onAct: fight,
    onBack: () => go({ id: 'map' }),
    onMove: (i) => {
      const t = shelf[i]!;
      dir.current?.setToy(0, { toyId: t.toyId, deluxe: isDeluxe(t.level) });
      void dir.current?.hop(0);
    },
  });
  const ft = toy(enc.toyId);
  const ab = ABILITIES[ft.ability];
  return (
    <div class="screen encounter">
      <div class={`foe-card panel ${enc.steward ? 'steward' : ''}`}>
        <div class="fc-kicker">{enc.zone === 'tree' ? 'THE FINALS' : enc.steward ? `SHOP STEWARD · ${ARENAS[enc.zone].place}` : `LOITERING IN ${ARENAS[enc.zone].place.toUpperCase()}`}</div>
        <div class="fc-name">{ft.name} <span class="plate-lvl">L{enc.level}</span></div>
        <div class="sc-row"><TypeChip type={ft.type} /> <span class="sc-ab" title={ab.text}>★ {ab.name}</span></div>
        <p class="fc-taunt">{ft.taunt}</p>
        <p class="fc-ab">{ab.text}</p>
        <div class="fc-contest">Contest: <b>{ARENAS[enc.zone].contest}</b></div>
      </div>
      <div class="pick">
        <div class="pick-title">Send in…</div>
        <div class="pick-row">
          {shelf.map((t, i) => {
            const tt = toy(t.toyId);
            const adv = effectiveness(tt.type, ft.type) === 'super';
            const dis = effectiveness(ft.type, tt.type) === 'super' && tt.ability !== 'topBilling';
            return (
              <button class={`pick-card panel ${i === sel ? 'sel' : ''}`} key={t.uid} onClick={() => (i === sel ? fight(i) : setSel(i))}>
                <Portrait toyId={t.toyId} deluxe={isDeluxe(t.level)} />
                <div class="pc-name">{tt.name}</div>
                <div class="pc-row"><TypeChip type={tt.type} small /> <span class="plate-lvl">L{t.level}</span></div>
                {adv && <div class="badge good">SUPER SWEET</div>}
                {dis && <div class="badge bad">THEY HAVE THE EDGE</div>}
              </button>
            );
          })}
        </div>
      </div>
      <KeyHint><b>←/→</b> choose · <b>SPACE</b> go · <b>ESC</b> back to the map</KeyHint>
    </div>
  );
}

// ── Battle (campaign) ───────────────────────────────────────
export function CampaignBattle({ enc, uid }: { enc: Encounter; uid: string }) {
  const a = useObs(app);
  const save = a.save!;
  const mine = save.shelf.find((t) => t.uid === uid)!;
  const ctl = useMemo(() => {
    const prof = opponentProfile(enc, a.settings.cpu);
    return new BattleController(stage(), {
      arena: enc.zone,
      sides: [
        { toyId: mine.toyId, level: mine.level, control: 'any', label: 'YOU' },
        { toyId: enc.toyId, level: enc.level, control: 'cpu', brain: prof.brain, hands: prof.hands, label: enc.zone === 'tree' ? 'FINALS' : enc.steward ? 'STEWARD' : 'WILD' },
      ],
      seed: (Date.now() ^ save.seed) >>> 0,
      boxOnWin: true,
      coach: save.stats.battles === 0,
    });
  }, []);
  useEffect(() => {
    let live = true;
    void ctl.run().then((out) => {
      if (!live) return;
      const s = app.get().save!;
      const r = applyResult(s, uid, enc, out.winner === 0, Date.now());
      setSave(r.save);
      go({ id: 'results', result: r, won: out.winner === 0, enc, usedUid: uid });
    });
    return () => {
      live = false;
      ctl.abort();
    };
  }, []);
  useEffect(() => onKey((e) => {
    if (e.action !== 'back' || ctl.hud.get().minigame || app.get().ask) return;
    void ask('Walk away from this showdown? It won\'t count.', 'Walk away').then((ok) => ok && go({ id: 'map' }));
  }), []);
  return <BattleHud hud={ctl.hud} />;
}

// ── Results ─────────────────────────────────────────────────
export function Results({ result, won, enc, usedUid }: { result: import('../../core/campaign').ResultSummary; won: boolean; enc: Encounter; usedUid: string }) {
  const save = useObs(app).save!;
  const mine = save.shelf.find((t) => t.uid === usedUid)!;
  const mt = toy(mine.toyId);
  const lu = result.levelUp;
  useEffect(() => {
    const s = stage();
    const set = showcase(enc.zone, [mine.toyId], 0, isDeluxe(mine.level));
    s.setSet(set);
    s.rig.shot({ pos: [2.2, 1.7, 7.5], look: [2.6, 1.3, 0], fov: 32 }, true);
    if (lu.becameDeluxe) sfx.boxed();
  }, []);
  const next = () => {
    sfx.confirm();
    go(result.finished ? { id: 'ending' } : { id: 'map' });
  };
  useNav(1, { onAct: next, onBack: next });
  const already = !result.boxed && won;
  return (
    <div class="screen results">
      <div class="res panel">
        <div class={`res-head ${won ? 'won' : 'lost'}`}>{won ? (already ? `${toy(enc.toyId).name} goes back to work.` : `${toy(enc.toyId).name} is boxed.`) : `${mt.name} needs a minute.`}</div>
        {!won && <p class="res-sub">Nothing lost. Toys heal between showdowns.</p>}
        <div class="res-xp">
          <span>{mt.name}</span>
          <b>+{result.gained} XP</b>
          <div class="xpbar"><div style={{ width: `${mine.level >= 10 ? 100 : (mine.xp / xpToNext(mine.level)) * 100}%` }} /></div>
          <span class="plate-lvl">L{mine.level}</span>
        </div>
        {lu.levelsGained > 0 && <div class="res-line up">Level up! L{mine.level - lu.levelsGained} → L{mine.level}</div>}
        {lu.learned.map((m) => (
          <div class="res-line" key={m}>Learned <b>{move(m).name}</b> <TypeChip type={move(m).type} small /></div>
        ))}
        {lu.becameDeluxe && <div class="res-deluxe"><span>DELUXE EDITION</span> {mt.name} gets the rosette, +10% everything, and a signature move.</div>}
        {result.boxed && (
          <div class="res-boxed">
            <Portrait toyId={result.boxed.toyId} />
            <div>
              <b>New on the shelf:</b> {toy(result.boxed.toyId).name} (L{result.boxed.level})
              <p>{toy(result.boxed.toyId).bio}</p>
            </div>
          </div>
        )}
        {result.benchLevelUps.length > 0 && (
          <div class="res-line">The shelf was watching: {result.benchLevelUps.map((b) => `${toy(save.shelf.find((t) => t.uid === b.uid)!.toyId).name} L${b.level}`).join(', ')}</div>
        )}
        {result.unlocked && <div class="res-unlock">{ARENAS[result.unlocked].place} is open.</div>}
        <Btn kind="big" sel onClick={next}>{result.finished ? 'And then…' : 'Back to the map'}</Btn>
      </div>
    </div>
  );
}

