import { render } from 'preact';
// Latin subsets only: every string in the game is English.
import '@fontsource/bangers/latin-400.css';
import '@fontsource/fraunces/latin-400.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-900.css';
import '@fontsource/fraunces/latin-400-italic.css';
import '@fontsource/fraunces/latin-600-italic.css';
import '@fontsource/fraunces/latin-900-italic.css';
import './styles/app.css';
import { Stage } from './render/stage';
import { app, stageRef } from './app/store';
import { App } from './app/App';
import { loadVoiceOver, sfx, unlockAudio } from './audio/sfx';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const stage = new Stage(canvas);
stage.setReduceFx(app.get().settings.reduceFx || matchMedia('(prefers-reduced-motion: reduce)').matches);
stageRef.current = stage;
stage.start();

addEventListener('pointerdown', unlockAudio, { once: true });
// Our key handling owns Space/Enter; a focused button would otherwise activate twice.
addEventListener('click', (e) => (e.target as HTMLElement).closest?.('button') && (document.activeElement as HTMLElement | null)?.blur());
addEventListener('keydown', unlockAudio, { once: true });
void loadVoiceOver();

render(<App />, document.getElementById('ui')!);

// Test hook: lets the e2e suite inspect state without reaching into modules.
(window as unknown as { __mc: unknown }).__mc = { app, stage, sfx };
