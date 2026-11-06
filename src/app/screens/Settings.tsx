import { useEffect } from 'preact/hooks';
import { app, ask, setSave, setSettings } from '../store';
import { Btn, useNav } from '../ui';
import { useObs } from '../obs';
import { onKey } from '../../input/keys';
import { sfx } from '../../audio/sfx';
import type { CpuLevel } from '../../core/ai';

export function AskModal() {
  const a = useObs(app).ask!;
  const [sel, setSel] = useNav(2, { capture: true, initial: 1, onAct: (i) => (sfx.select(), a.resolve(i === 0)), onBack: () => a.resolve(false) });
  return (
    <div class="modal-back ask" onClick={() => a.resolve(false)}>
      <div class="modal panel" onClick={(e) => e.stopPropagation()}>
        <p class="ask-text">{a.text}</p>
        <div class="ask-row">
          <Btn sel={sel === 0} onClick={() => (setSel(0), a.resolve(true))}>{a.yes}</Btn>
          <Btn sel={sel === 1} onClick={() => (setSel(1), a.resolve(false))}>Never mind</Btn>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const a = useObs(app);
  const close = () => app.update((s) => ({ ...s, settingsOpen: false }));
  useEffect(() => onKey((e) => e.action === 'back' && !app.get().ask && close(), { capture: true }), []);
  const s = a.settings;
  return (
    <div class="modal-back" onClick={close}>
      <div class="modal panel settings" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <label class="set-row">
          <span>Sound effects</span>
          <input type="range" min={0} max={100} value={Math.round(s.sfx * 100)} onInput={(e) => setSettings({ sfx: Number((e.target as HTMLInputElement).value) / 100 })} onChange={() => sfx.confirm()} />
        </label>
        <label class="set-row">
          <span>Reduce flashing &amp; shake</span>
          <input type="checkbox" checked={s.reduceFx} onChange={(e) => setSettings({ reduceFx: (e.target as HTMLInputElement).checked })} />
        </label>
        <div class="set-row">
          <span>CPU</span>
          <div class="seg">
            {(['easy', 'normal', 'hard'] as CpuLevel[]).map((l) => (
              <button class={s.cpu === l ? 'on' : ''} key={l} onClick={() => (sfx.select(), setSettings({ cpu: l }))}>{l}</button>
            ))}
          </div>
        </div>
        <table class="controls">
          <tbody>
            <tr><th></th><th>Player 1</th><th>Player 2</th></tr>
            <tr><td>Moves / lanes</td><td>W A S D</td><td>↑ ← ↓ →</td></tr>
            <tr><td>Perform / Keep Cool</td><td>SPACE</td><td>ENTER</td></tr>
            <tr><td>Back</td><td>ESC</td><td>⌫</td></tr>
          </tbody>
        </table>
        <div class="set-foot">
          {a.save && (
            <button class="btn ghost danger" onClick={() => void ask('Erase your shelf and all progress?', 'Erase it').then((ok) => ok && (setSave(null), close()))}>
              Erase progress
            </button>
          )}
          <button class="btn sel" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  );
}
