import { useEffect } from 'preact/hooks';
import { app, ask, go, setSave, stage } from '../store';
import { useObs } from '../obs';
import { Btn, KeyHint, useNav } from '../ui';
import { showcase, TITLE_SHOT } from '../../render/showcase';
import { sfx } from '../../audio/sfx';

export function Title() {
  const a = useObs(app);
  useEffect(() => {
    const s = stage();
    const set = showcase('tree', ['jack', 'dameFlurry', 'oddrey', 'colonelCrunch', 'chatterbox'], 3.6);
    s.setSet(set);
    s.rig.shot({ ...TITLE_SHOT, pos: [-2.6, 6, 18] }, true);
    s.rig.shot(TITLE_SHOT, false, 1.2);
    s.rig.drift = 0.6;
    return () => {
      s.rig.drift = 0.15;
    };
  }, []);
  const hasSave = !!a.save && a.save.shelf.length > 0;
  const items = [
    ...(hasSave ? [{ label: 'Continue', act: () => go({ id: 'map' }) }] : []),
    {
      label: hasSave ? 'New Game' : 'Story',
      act: async () => {
        if (hasSave && !(await ask('Start over? Your shelf will be emptied.', 'Start over'))) return;
        setSave(null);
        go({ id: 'intro' });
      },
    },
    { label: 'Versus — 2 Players', act: () => go({ id: 'versus', cpu: false }) },
    { label: 'Versus — CPU', act: () => go({ id: 'versus', cpu: true }) },
    ...(hasSave ? [{ label: 'The Shelf', act: () => go({ id: 'shelf', back: { id: 'title' } }) }] : []),
    { label: 'Settings', act: () => app.update((s) => ({ ...s, settingsOpen: true })) },
  ];
  const [sel, setSel] = useNav(items.length, {
    onAct: (i) => {
      sfx.confirm();
      items[i]!.act();
    },
    enabled: !a.settingsOpen && !a.ask,
  });
  return (
    <div class="screen title">
      <div class="logo">
        <div class="logo-mint" data-text="Mint">Mint</div>
        <div class="logo-cond" data-text="Condition">Condition</div>
        <div class="tagline">Toys don't fight. They compete.</div>
      </div>
      <nav class="title-menu">
        {items.map((it, i) => (
          <Btn key={it.label} sel={i === sel} onClick={() => { setSel(i); it.act(); }} kind="big">
            {it.label}
          </Btn>
        ))}
      </nav>
      {a.notice && <div class="notice panel" onClick={() => app.update((s) => ({ ...s, notice: null }))}>{a.notice}</div>}
      <KeyHint>P1 <b>WASD</b> + <b>SPACE</b> · P2 <b>ARROWS</b> + <b>ENTER</b> · Mouse works too</KeyHint>
    </div>
  );
}
