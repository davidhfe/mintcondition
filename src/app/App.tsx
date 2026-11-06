import { useEffect, useRef } from 'preact/hooks';
import { app, type Screen } from './store';
import { useObs } from './obs';
import { Title } from './screens/Title';
import { Intro, Ending } from './screens/Story';
import { Starter, MapScreen, EncounterScreen, CampaignBattle, Results } from './screens/Campaign';
import { VersusSetup, VersusBattle } from './screens/Versus';
import { Shelf } from './screens/Shelf';
import { AskModal, SettingsModal } from './screens/Settings';
import { sfx } from '../audio/sfx';

function key(s: Screen): string {
  if (s.id === 'battle') return `battle-${s.uid}-${s.enc.toyId}`;
  if (s.id === 'versus') return `versus-${s.cpu}`;
  if (s.id === 'versusBattle') return `vb-${s.toys.join('-')}-${s.arena}`;
  return s.id;
}

function Current({ s }: { s: Screen }) {
  switch (s.id) {
    case 'title': return <Title />;
    case 'intro': return <Intro />;
    case 'starter': return <Starter />;
    case 'map': return <MapScreen />;
    case 'encounter': return <EncounterScreen enc={s.enc} />;
    case 'battle': return <CampaignBattle enc={s.enc} uid={s.uid} />;
    case 'results': return <Results result={s.result} won={s.won} enc={s.enc} usedUid={s.usedUid} />;
    case 'ending': return <Ending />;
    case 'versus': return <VersusSetup cpu={s.cpu} />;
    case 'versusBattle': return <VersusBattle cpu={s.cpu} arena={s.arena} toys={s.toys} />;
    case 'shelf': return <Shelf back={s.back} />;
  }
}

export function App() {
  const a = useObs(app);
  const k = key(a.screen);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else sfx.page();
  }, [k]);
  return (
    <>
      <div class="screen-wrap" key={k}>
        <Current s={a.screen} />
      </div>
      <div class="wipe" key={`w-${k}`} />
      {a.settingsOpen && <SettingsModal />}
      {a.ask && <AskModal />}
    </>
  );
}
