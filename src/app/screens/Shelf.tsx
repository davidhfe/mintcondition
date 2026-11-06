import { useEffect } from 'preact/hooks';
import { ABILITIES, TOY_LIST, toy } from '../../core/data/toys';
import { move } from '../../core/data/moves';
import { isDeluxe, MOVE_LEVELS, statsAt, xpToNext } from '../../core/stats';
import { app, go, type Screen } from '../store';
import { useObs } from '../obs';
import { KeyHint, Portrait, StatBars, useNav } from '../ui';
import { TypeChip } from '../battle/Hud';
import { describeMove } from '../battle/controller';
import { emptyBg } from './Campaign';

export function Shelf({ back }: { back: Screen }) {
  const save = useObs(app).save;
  useEffect(() => emptyBg(0xfff1d6, 0xe9c79a, 0x9a5a33), []);
  const [sel, setSel] = useNav(TOY_LIST.length, { cols: 5, onBack: () => go(back) });
  const id = TOY_LIST[sel]!.id;
  const owned = save?.shelf.filter((t) => t.toyId === id).sort((a, b) => b.level - a.level)[0];
  const t = toy(id);
  const ab = ABILITIES[t.ability];
  const count = new Set(save?.shelf.map((x) => x.toyId)).size;
  return (
    <div class="screen shelf">
      <h1 class="headline sm">The Shelf <em>· {count} of {TOY_LIST.length} boxed</em></h1>
      <div class="shelf-grid">
        {TOY_LIST.map((x, i) => {
          const o = save?.shelf.find((s) => s.toyId === x.id);
          return (
            <button class={`scell ${i === sel ? 'sel' : ''} ${o ? '' : 'missing'}`} key={x.id} onClick={() => setSel(i)}>
              <Portrait toyId={x.id} deluxe={o ? isDeluxe(o.level) : false} hidden={!o} />
              <span>{o ? x.name : '???'}</span>
              {o && <b class="plate-lvl">L{o.level}</b>}
            </button>
          );
        })}
      </div>
      <div class="shelf-detail panel">
        {owned ? (
          <>
            <div class="fc-name">{t.name} <span class="plate-lvl">L{owned.level}</span> {isDeluxe(owned.level) && <span class="chip deluxe">DELUXE</span>}</div>
            <div class="sc-row"><TypeChip type={t.type} /> <span class="sc-ab">★ {ab.name}</span></div>
            <p class="fc-taunt">{t.bio}</p>
            <p class="fc-ab">{ab.text}</p>
            <div class="xpbar"><div style={{ width: `${owned.level >= 10 ? 100 : (owned.xp / xpToNext(owned.level)) * 100}%` }} /></div>
            <StatBars s={statsAt(id, owned.level)} />
            <ul class="movelist">
              {t.moves.map((m, i) => {
                const mv = move(m);
                const known = owned.level >= MOVE_LEVELS[i]!;
                return (
                  <li class={known ? '' : 'locked'} key={m}>
                    <TypeChip type={mv.type} small /> <b>{mv.name}</b> <span>{known ? describeMove(mv) : `Learns at L${MOVE_LEVELS[i]}${i === 3 ? ' (Deluxe)' : ''}`}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <div class="fc-name">???</div>
            <p class="fc-taunt">Not boxed yet. Somewhere in the workshop, something is loitering.</p>
          </>
        )}
      </div>
      <KeyHint>Arrows / WASD to browse · <b>ESC</b> back</KeyHint>
    </div>
  );
}
