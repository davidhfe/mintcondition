import { useEffect } from 'preact/hooks';
import { app, setSave, setSettings } from '../store';
import { useObs } from '../obs';
import { onKey } from '../../input/keys';
import { sfx } from '../../audio/sfx';
import type { CpuLevel } from '../../core/ai';

export function SettingsModal() {
  const a = useObs(app);
  const close = () => app.update((s) => ({ ...s, settingsOpen: false }));
  useEffect(() => onKey((e) => e.action === 'back' && close()), []);
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
            <button class="btn ghost danger" onClick={() => confirm('Erase your shelf and progress?') && (setSave(null), close())}>
              Erase progress
            </button>
          )}
          <button class="btn sel" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  );
}
