import type { MoveDef } from '../types';

const list: MoveDef[] = [
  // ── Big Ted ──────────────────────────────────────────────
  { id: 'cocoaPour', name: 'Cocoa Pour', type: 'warm', kind: 'show', power: 55, game: 'timing', difficulty: 1, word: 'GLUG', anim: 'pose', blurb: 'A perfect spiral. Nobody asked.' },
  { id: 'fluffUp', name: 'Fluff Up', type: 'plain', kind: 'trick', self: { poise: 2 }, game: 'timing', difficulty: 1, word: 'FLUMF', anim: 'shake', blurb: 'Re-stuffs himself with dignity.' },
  { id: 'hibernate', name: 'Hibernate', type: 'plain', kind: 'trick', heal: 0.3, game: 'timing', difficulty: 2, word: 'ZZZ', anim: 'pose', blurb: 'Takes a nap in the middle of a contest.' },
  { id: 'bigHug', name: 'The Big Hug', type: 'warm', kind: 'show', power: 85, game: 'mash', difficulty: 3, word: 'SQUOOSH', anim: 'lunge', blurb: 'Goes on for slightly too long.' },

  // ── Ginger Snap ──────────────────────────────────────────
  { id: 'hotBatch', name: 'Hot Batch', type: 'warm', kind: 'show', power: 55, game: 'rhythm', difficulty: 1, word: 'SIZZLE', anim: 'hop', blurb: 'Fresh out. Still smoking.' },
  { id: 'runRunRun', name: 'Run Run Run', type: 'plain', kind: 'trick', self: { flair: 1, hustle: 1 }, game: 'timing', difficulty: 1, word: 'ZOOM', anim: 'spin', blurb: "As fast as he can. He'll tell you how fast." },
  { id: 'crumbTrail', name: 'Crumb Trail', type: 'plain', kind: 'trick', naughty: 30, tangle: 0.6, game: 'timing', difficulty: 2, word: 'CRUNCH', anim: 'hop', blurb: 'Leaves crumbs. Someone slips.' },
  { id: 'icingOnTop', name: 'Icing on Top', type: 'warm', kind: 'show', power: 85, game: 'rhythm', difficulty: 3, word: 'SPLORT', anim: 'spin', blurb: "Freehand piping. He's not even looking." },

  // ── Chuggs ───────────────────────────────────────────────
  { id: 'fullSteam', name: 'Full Steam', type: 'warm', kind: 'show', power: 60, game: 'mash', difficulty: 2, word: 'CHOO CHOO', anim: 'lunge', blurb: 'Zero to forty. On carpet.' },
  { id: 'whistleStop', name: 'Whistle Stop', type: 'plain', kind: 'trick', foe: { hustle: -1, flair: -1 }, game: 'timing', difficulty: 1, word: 'TOOOOT', anim: 'sing', blurb: 'Loud enough to lose your train of thought.' },
  { id: 'coalShovel', name: 'Coal Shovel', type: 'plain', kind: 'trick', naughty: 45, self: { flair: 2 }, game: 'timing', difficulty: 2, word: 'SHUNK', anim: 'shake', blurb: 'Shovels in coal. On purpose.' },
  { id: 'lastStop', name: 'Last Stop', type: 'warm', kind: 'show', power: 90, game: 'mash', difficulty: 3, word: 'CHOOOOOO', anim: 'lunge', blurb: 'End of the line. Everybody off.' },

  // ── Colonel Crunch ───────────────────────────────────────
  { id: 'nutcrackerSuite', name: 'Nutcracker Suite', type: 'pine', kind: 'show', power: 55, game: 'rhythm', difficulty: 1, word: 'CRACK', anim: 'spin', blurb: 'A ballet. In full uniform.' },
  { id: 'atAttention', name: 'At Attention', type: 'plain', kind: 'trick', self: { poise: 1, flair: 1 }, game: 'timing', difficulty: 1, word: 'HUT', anim: 'pose', blurb: 'Stands straighter. Somehow.' },
  { id: 'nitpick', name: 'Nitpick', type: 'plain', kind: 'trick', naughty: 30, foe: { poise: -2 }, game: 'timing', difficulty: 2, word: 'TSK TSK', anim: 'pose', blurb: 'Finds fault. Lists it. Alphabetically.' },
  { id: 'salute21', name: '21-Nut Salute', type: 'pine', kind: 'show', power: 90, game: 'rhythm', difficulty: 3, word: 'KRAK-KRAK-KRAK', anim: 'stomp', blurb: 'Twenty-one walnuts. In tempo.' },

  // ── Dobbin ───────────────────────────────────────────────
  { id: 'backAndForth', name: 'Back and Forth', type: 'pine', kind: 'show', power: 55, game: 'timing', difficulty: 1, word: 'CREAK', anim: 'shake', blurb: "It's in the name." },
  { id: 'giddyUp', name: 'Giddy Up', type: 'plain', kind: 'trick', self: { hustle: 1, flair: 1 }, game: 'timing', difficulty: 1, word: 'GIDDYAP', anim: 'hop', blurb: 'Rocks slightly faster.' },
  { id: 'longFace', name: 'Long Face', type: 'pine', kind: 'trick', foe: { flair: -2 }, game: 'timing', difficulty: 2, word: 'SIGH', anim: 'pose', blurb: 'Looks at them. Disappointed.' },
  { id: 'fullGallop', name: 'Full Gallop', type: 'pine', kind: 'show', power: 85, game: 'mash', difficulty: 3, word: 'KLOP-KLOP', anim: 'stomp', blurb: 'Hooves everywhere. Distance covered: none.' },

  // ── Jack ─────────────────────────────────────────────────
  { id: 'popGoes', name: 'Pop Goes', type: 'pine', kind: 'show', power: 60, game: 'timing', difficulty: 1, word: 'POP!', anim: 'hop', blurb: 'Exactly when you expected. Still works.' },
  { id: 'woundUp', name: 'Wound Up', type: 'plain', kind: 'trick', self: { flair: 2 }, game: 'timing', difficulty: 1, word: 'KRRK-KRRK', anim: 'shake', blurb: 'Tighter. Tighter. Tighter.' },
  { id: 'jumpScare', name: 'Jump Scare', type: 'plain', kind: 'trick', naughty: 35, tangle: 0.7, game: 'timing', difficulty: 2, word: 'BOO', anim: 'lunge', blurb: 'Not festive. Very effective.' },
  { id: 'jackpot', name: 'Jackpot', type: 'pine', kind: 'show', power: 90, game: 'timing', difficulty: 3, word: 'BOIIING', anim: 'hop', blurb: 'Fully wound. Fully sprung.' },

  // ── Sprocket ─────────────────────────────────────────────
  { id: 'circleBack', name: 'Circle Back', type: 'spark', kind: 'show', power: 55, game: 'timing', difficulty: 1, word: 'BZZT', anim: 'spin', blurb: 'Revisits an earlier point. With slides.' },
  { id: 'synergize', name: 'Synergize', type: 'plain', kind: 'trick', self: { flair: 1, hustle: 1 }, game: 'timing', difficulty: 1, word: 'BEEP', anim: 'pose', blurb: 'Aligns its verticals.' },
  { id: 'downsize', name: 'Downsize', type: 'spark', kind: 'trick', naughty: 30, foe: { flair: -2 }, game: 'timing', difficulty: 2, word: 'CLUNK', anim: 'pose', blurb: "Let's take this offline." },
  { id: 'mandatoryFun', name: 'Mandatory Fun', type: 'spark', kind: 'show', power: 80, game: 'rhythm', difficulty: 3, word: 'WHEE.', anim: 'spin', blurb: 'Attendance is required.' },

  // ── Cymon ────────────────────────────────────────────────
  { id: 'crash', name: 'Crash!', type: 'spark', kind: 'show', power: 55, game: 'mash', difficulty: 1, word: 'CRASH', anim: 'shake', blurb: 'One cymbal. Then the other.' },
  { id: 'encore', name: 'Encore', type: 'plain', kind: 'trick', self: { flair: 2 }, game: 'timing', difficulty: 1, word: 'AGAIN!', anim: 'pose', blurb: 'Starts again from the top.' },
  { id: 'wakeNeighbors', name: 'Wake the Neighbors', type: 'spark', kind: 'show', power: 70, naughty: 30, foe: { poise: -1 }, game: 'rhythm', difficulty: 2, word: 'CLANG CLANG', anim: 'shake', blurb: "It's 3 a.m. somewhere." },
  { id: 'cymbalSolo', name: 'Cymbal Solo', type: 'spark', kind: 'show', power: 85, game: 'rhythm', difficulty: 3, word: 'TSSSHH', anim: 'shake', blurb: 'Eleven minutes. Abridged.' },

  // ── Chatterbox ───────────────────────────────────────────
  { id: 'chatter', name: 'Chatter', type: 'spark', kind: 'show', power: 50, game: 'mash', difficulty: 1, word: 'CHK-CHK-CHK', anim: 'hop', blurb: 'Says nothing. Constantly.' },
  { id: 'trashTalk', name: 'Trash Talk', type: 'plain', kind: 'trick', naughty: 30, foe: { poise: -2 }, game: 'timing', difficulty: 1, word: 'YAP YAP', anim: 'hop', blurb: 'Mostly about your paint job.' },
  { id: 'gnash', name: 'Gnash', type: 'spark', kind: 'show', power: 65, naughty: 35, pierce: 0.5, game: 'mash', difficulty: 2, word: 'GNASH', anim: 'lunge', blurb: "It's all teeth. It's only teeth." },
  { id: 'sayCheese', name: 'Say Cheese', type: 'spark', kind: 'show', power: 80, tangle: 0.25, game: 'timing', difficulty: 3, word: 'GRIN', anim: 'pose', blurb: "A smile you'll see when you close your eyes." },

  // ── Dame Flurry ──────────────────────────────────────────
  { id: 'shakeItUp', name: 'Shake It Up', type: 'frost', kind: 'show', power: 55, game: 'rhythm', difficulty: 1, word: 'SHHK-SHHK', anim: 'shake', blurb: 'Does her own shaking now.' },
  { id: 'whiteout', name: 'Whiteout', type: 'frost', kind: 'trick', foe: { flair: -1, hustle: -1 }, game: 'timing', difficulty: 1, word: 'FWOOSH', anim: 'spin', blurb: "Can't see the competition. Or anything." },
  { id: 'glassAct', name: 'Glass Act', type: 'plain', kind: 'show', power: 60, game: 'timing', difficulty: 2, word: 'TING', anim: 'pose', blurb: 'Hard to follow. Harder to clean.' },
  { id: 'blizzardBallad', name: 'Blizzard Ballad', type: 'frost', kind: 'show', power: 90, game: 'rhythm', difficulty: 3, word: 'LA-LAAA', anim: 'sing', blurb: "Sings. It's a lot." },

  // ── Slick ────────────────────────────────────────────────
  { id: 'tripleAxel', name: 'Triple Axel', type: 'frost', kind: 'show', power: 55, game: 'timing', difficulty: 1, word: 'WHIRL', anim: 'spin', blurb: 'Lands it. Looks at the judges.' },
  { id: 'coldShoulder', name: 'Cold Shoulder', type: 'frost', kind: 'trick', naughty: 30, foe: { poise: -2 }, game: 'timing', difficulty: 1, word: 'HMPH', anim: 'pose', blurb: 'Ignores them. Pointedly.' },
  { id: 'bellySlide', name: 'Belly Slide', type: 'plain', kind: 'show', power: 65, game: 'mash', difficulty: 2, word: 'ZWOOP', anim: 'lunge', blurb: 'Undignified. Unstoppable.' },
  { id: 'blackIce', name: 'Black Ice', type: 'frost', kind: 'show', power: 85, naughty: 30, tangle: 0.3, game: 'timing', difficulty: 3, word: 'SKRRT', anim: 'spin', blurb: 'Leaves a patch. Skates off whistling.' },

  // ── Abner ────────────────────────────────────────────────
  { id: 'snowAngel', name: 'Snow Angel', type: 'frost', kind: 'show', power: 50, game: 'timing', difficulty: 1, word: 'FWUMP', anim: 'stomp', blurb: 'Lies down. Makes art.' },
  { id: 'bigShrug', name: 'Big Shrug', type: 'plain', kind: 'trick', self: { poise: 2 }, game: 'timing', difficulty: 1, word: 'MEH', anim: 'pose', blurb: "Doesn't know. Doesn't care." },
  { id: 'snowdrift', name: 'Snowdrift', type: 'frost', kind: 'trick', foe: { hustle: -2 }, game: 'timing', difficulty: 2, word: 'FLUMP', anim: 'stomp', blurb: 'Buries their feet. Apologises.' },
  { id: 'avalanche', name: 'Avalanche', type: 'frost', kind: 'show', power: 85, game: 'mash', difficulty: 3, word: 'WHUMPF', anim: 'stomp', blurb: 'Everything, all at once, downhill.' },

  // ── The Topper ───────────────────────────────────────────
  { id: 'twinkle', name: 'Twinkle', type: 'spark', kind: 'show', power: 65, game: 'rhythm', difficulty: 2, word: 'TWINK', anim: 'spin', blurb: 'Look at her. No, really.' },
  { id: 'warmGlow', name: 'Warm Glow', type: 'warm', kind: 'show', power: 60, game: 'timing', difficulty: 2, word: 'GLOW', anim: 'pose', blurb: 'Radiates. Insufferably.' },
  { id: 'snowShine', name: 'Snow Shine', type: 'frost', kind: 'show', power: 60, game: 'timing', difficulty: 2, word: 'SHIMMER', anim: 'sing', blurb: 'Catches the light. Keeps it.' },
  { id: 'spotlight', name: 'Spotlight', type: 'plain', kind: 'trick', self: { flair: 1, poise: 1 }, game: 'timing', difficulty: 1, word: 'TA-DA', anim: 'pose', blurb: 'Brought her own lighting rig.' },
];

export const MOVES: Readonly<Record<string, MoveDef>> = Object.fromEntries(list.map((m) => [m.id, m]));
export const MOVE_LIST: readonly MoveDef[] = list;

export function move(id: string): MoveDef {
  const m = MOVES[id];
  if (!m) throw new Error(`Unknown move: ${id}`);
  return m;
}
