import { useEffect, useState } from 'preact/hooks';
import type { Side } from '../../core/types';
import { TYPE_LABEL } from '../../core/data/arenas';
import { STAT_LABEL } from '../../core/stats';
import { accepts, labelFor, onKey, type Action } from '../../input/keys';
import { sfx } from '../../audio/sfx';
import { hex, TYPE_COLOR } from '../../render/palette';
import { useObs, type Obs } from '../obs';
import type { HudState, MenuReq, SideHud } from './hud';
import { KeepCool, MinigameView } from './Minigames';
import { Portrait } from '../ui';
import { isDeluxe } from '../../core/stats';

export function TypeChip({ type, small }: { type: keyof typeof TYPE_LABEL; small?: boolean }) {
  return (
    <span class={`chip type ${small ? 'sm' : ''}`} style={{ background: hex(TYPE_COLOR[type]) }}>
      {TYPE_LABEL[type]}
    </span>
  );
}

const GAME_LABEL = { rhythm: 'RHYTHM', timing: 'TIMING', mash: 'MASH' } as const;

function Nameplate({ s, side, active }: { s: SideHud; side: Side; active: boolean }) {
  const pct = (v: number) => `${Math.max(0, (v / s.maxSpirit) * 100)}%`;
  const low = s.spirit / s.maxSpirit < 0.3;
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!s.abilityFlash) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1100);
    return () => clearTimeout(t);
  }, [s.abilityFlash]);
  return (
    <div class={`plate side${side} ${active ? 'active' : ''}`}>
      <div class="plate-who">{s.label}</div>
      <div class="plate-top">
        <span class="plate-name">{s.name}</span>
        <span class="plate-lvl">L{s.level}</span>
        {s.deluxe && <span class="chip deluxe">DELUXE</span>}
        <TypeChip type={s.type} small />
      </div>
      <div class={`bar spirit ${low ? 'low' : ''}`}>
        <div class="ghost" style={{ width: pct(s.ghost) }} />
        <div class="fill" style={{ width: pct(s.spirit) }} />
        <span class="bar-num">{s.spirit}</span>
      </div>
      <div class="plate-row">
        <div class={`naughty ${s.naughty >= 70 ? 'hot' : ''}`} title="Naughty List — at 100 you get coal">
          <span>NAUGHTY</span>
          <div class="nbar"><div style={{ width: `${s.naughty}%` }} /></div>
        </div>
        <span class={`chip ability ${s.abilityReady === false ? 'spent' : ''} ${pulse ? 'pulse' : ''}`} title={s.abilityText}>
          ★ {s.ability}
        </span>
      </div>
      <div class="plate-stats">
        {(Object.keys(s.stages) as (keyof typeof s.stages)[]).map((k) =>
          s.stages[k] !== 0 ? (
            <span class={`chip stage ${s.stages[k] > 0 ? 'up' : 'down'}`} key={k}>
              {STAT_LABEL[k]} {(s.stages[k] > 0 ? '▲' : '▼').repeat(Math.abs(s.stages[k]))}
            </span>
          ) : null,
        )}
        {s.tangled && <span class="chip stage down">TANGLED</span>}
      </div>
    </div>
  );
}

const SLOTS: Action[] = ['up', 'left', 'right', 'down'];

function MoveMenu({ menu, foeName }: { menu: MenuReq; foeName: string }) {
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [menu]);
  useEffect(() => {
    return onKey((e) => {
      if (!accepts(menu.control, e.player)) return;
      if (e.action === 'act') {
        sfx.confirm();
        menu.resolve(menu.moves[sel]!.id);
        return;
      }
      const i = SLOTS.indexOf(e.action);
      if (i < 0 || i >= menu.moves.length) return;
      if (i === sel && !e.repeat) {
        sfx.confirm();
        menu.resolve(menu.moves[i]!.id);
      } else {
        sfx.move();
        setSel(i);
      }
    });
  }, [menu, sel]);
  const m = menu.moves[sel]!;
  return (
    <div class={`menu side${menu.side}`} data-control={menu.control}>
      <div class="diamond">
        {menu.moves.map((mv, i) => (
          <button
            key={mv.id}
            class={`mcard slot-${SLOTS[i]} ${i === sel ? 'sel' : ''}`}
            style={{ '--tc': hex(TYPE_COLOR[mv.type]) }}
            onPointerEnter={() => i !== sel && (setSel(i), sfx.move())}
            onClick={() => {
              sfx.confirm();
              menu.resolve(mv.id);
            }}
          >
            <span class="key">{labelFor(menu.control, SLOTS[i]!)}</span>
            <span class="mname">{mv.name}</span>
            <span class="mmeta">
              {mv.kind === 'show' ? `${mv.power} POW` : 'TRICK'}
              {mv.naughty ? <b class="nflag"> · NAUGHTY</b> : null}
            </span>
          </button>
        ))}
      </div>
      <div class="mdetail panel">
        <div class="md-top">
          <TypeChip type={m.type} small />
          <span class="md-game">{GAME_LABEL[m.game]} {'★'.repeat(m.difficulty)}</span>
          {m.superVsFoe && <span class="chip sweet">SUPER SWEET vs {foeName}</span>}
          {m.home && <span class="chip deluxe">HOME CONTEST +15%</span>}
        </div>
        <div class="md-name">{m.name}</div>
        <div class="md-effect">{m.effect}{m.naughty ? ` · +${m.naughty} NAUGHTY` : ''}</div>
        <div class="md-blurb">{m.blurb}</div>
        <div class="md-hint">{labelFor(menu.control, 'act')} or tap again to perform</div>
      </div>
    </div>
  );
}

export function BattleHud({ hud }: { hud: Obs<HudState> }) {
  const h = useObs(hud);
  const foe = h.menu ? h.sides[h.menu.side === 0 ? 1 : 0] : null;
  return (
    <div class="hud">
      {h.showHud && (
        <>
          <Nameplate s={h.sides[0]} side={0} active={h.turn === 0} />
          <Nameplate s={h.sides[1]} side={1} active={h.turn === 1} />
          <div class={`roundtag ${h.overtime > 1 ? 'ot' : ''}`}>
            <span>{h.contest}</span>
            <b>{h.overtime > 1 ? `OVERTIME ×${h.overtime.toFixed(2)}` : `ROUND ${Math.max(1, h.round)}`}</b>
          </div>
        </>
      )}
      {h.caption && !h.menu && !h.minigame && (
        <div class={`caption panel ${h.caption.side !== undefined ? `side${h.caption.side}` : ''}`} key={h.caption.text}>
          {h.caption.title && <b>{h.caption.title}</b>}
          <span>{h.caption.text}</span>
        </div>
      )}
      {h.vs && (
        <div class="vs-splash">
          {h.vs.map((v, i) => (
            <div class={`vs-half side${i}`} key={i}>
              <Portrait toyId={v.toyId} deluxe={isDeluxe(v.level)} />
              <div class="vs-name"><small>{v.label}</small>{v.name}</div>
            </div>
          ))}
          <div class="vs-vs">VS</div>
        </div>
      )}
      {h.coach && <div class={`coach panel ${h.coach.where}`} key={h.coach.text}>{h.coach.text}</div>}
      {h.menu && foe && <MoveMenu menu={h.menu} foeName={foe.name} />}
      {h.minigame && <MinigameView req={h.minigame} />}
      {h.defense && <KeepCool req={h.defense} key={h.defense.id} />}
      <div class="words">
        {h.words.map((w) => (
          <div class="word" key={w.id} style={{ left: `${w.x}px`, top: `${w.y}px`, color: w.color, '--rot': `${w.rot}rad`, '--sz': w.size }}>
            {w.text}
          </div>
        ))}
      </div>
      <div class="callouts">
        {h.callouts.map((c) => (
          <div class={`callout ${c.style} ${c.side !== undefined ? `side${c.side}` : ''}`} key={c.id} style={{ '--cc': c.color ?? '' }}>
            <span data-text={c.text}>{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
