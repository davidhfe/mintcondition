import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { onKey } from '../../input/keys';
import { sfx, unlockAudio } from '../../audio/sfx';
import { go, stage } from '../store';
import { sceneShot } from '../portraits';
import { showcase } from '../../render/showcase';
import { KeyHint } from '../ui';
import type { ArenaId } from '../../core/types';

interface PanelDef {
  cls: string;
  body: ComponentChildren;
}

function Memo({ re, children, sign = '— Mgmt' }: { re: string; children: ComponentChildren; sign?: string }) {
  return (
    <div class="memo">
      <div class="memo-head">MEMO <span>Re: {re}</span></div>
      <div class="memo-body">{children}</div>
      <div class="memo-sign">{sign}</div>
    </div>
  );
}

function SceneImg({ k, arena, toys, shot = 'group' }: { k: string; arena: ArenaId; toys: string[]; shot?: 'group' | 'face' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const cam = shot === 'face' ? { pos: [0.4, 1.7, 3.6] as [number, number, number], look: [0, 1.45, 0.6] as [number, number, number], fov: 34 } : { pos: [0, 2.3, 10] as [number, number, number], look: [0, 1.3, 0] as [number, number, number], fov: 36 };
    void sceneShot(k, () => showcase(arena, toys, 3.2), cam, 720, 400).then(setUrl);
  }, [k]);
  return url ? <img class="panel-img" src={url} alt="" /> : <div class="panel-img wait" />;
}

function Page({ panels, onDone }: { panels: PanelDef[]; onDone: () => void }) {
  const [shown, setShown] = useState(1);
  const next = () => {
    unlockAudio();
    if (shown >= panels.length) {
      sfx.confirm();
      onDone();
    } else {
      sfx.page();
      setShown((n) => n + 1);
    }
  };
  useEffect(() => onKey((e) => (e.action === 'act' ? next() : e.action === 'back' ? onDone() : undefined)), [shown]);
  return (
    <div class="screen story" onClick={next}>
      <div class={`page n${panels.length}`}>
        {panels.map((p, i) => (
          <div class={`spanel ${p.cls} ${i < shown ? 'in' : ''}`} key={i}>
            {p.body}
          </div>
        ))}
      </div>
      <KeyHint>
        <b>SPACE</b> / click to continue · <b>ESC</b> to skip
      </KeyHint>
    </div>
  );
}

export function Intro() {
  useEffect(() => {
    stage().setSet(null);
  }, []);
  return (
    <Page
      onDone={() => go({ id: 'starter' })}
      panels={[
        { cls: 'night', body: <><p class="cap">The kids were good this year.</p><p class="cap late">All of them.</p></> },
        { cls: 'paper', body: <Memo re="Magic shortfall">Oddrey — top up the Cheer Condenser.</Memo> },
        { cls: 'boom', body: <><SceneImg k="intro-oddrey" arena="tree" toys={['oddrey']} shot="face" /><div class="sfx-word over" data-text="KA-BLOOM">KA-BLOOM</div><p class="cap">Oddrey topped it up.</p></> },
        { cls: 'img', body: <><SceneImg k="intro-toys" arena="wrapping" toys={['sprocket', 'jack', 'bigTed', 'cymon', 'slick']} /><p class="cap">Every toy in the workshop woke up. Within the hour, they'd unionized.</p></> },
        {
          cls: 'paper',
          body: (
            <Memo re="The toys">
              They won't get in the box unless someone beats them at something. Christmas Eve is coming regardless.
              <p class="ps">P.S. This is your fault.</p>
            </Memo>
          ),
        },
      ]}
    />
  );
}

export function Ending() {
  useEffect(() => {
    stage().setSet(null);
  }, []);
  return (
    <Page
      onDone={() => go({ id: 'title' })}
      panels={[
        { cls: 'night', body: <><p class="cap">The Topper agreed to go on top of the tree.</p><p class="cap late">She said it was her idea.</p></> },
        { cls: 'img', body: <><SceneImg k="ending-toys" arena="tree" toys={['chuggs', 'dameFlurry', 'oddrey', 'colonelCrunch', 'sprocket']} /><p class="cap">Every toy got boxed. Christmas shipped on time.</p></> },
        {
          cls: 'paper',
          body: (
            <Memo re="The incident">
              Good work. Do not touch the Cheer Condenser again.
              <p class="ps">P.S. The Topper is now available in Versus. She insisted.</p>
            </Memo>
          ),
        },
      ]}
    />
  );
}
