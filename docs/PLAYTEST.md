# Playtest & balance

Three kinds of testing, from cheapest to closest-to-a-person:

1. **Simulation** — `npm run balance` plays ~20,000 showdowns between CPU
   brains with modelled "hands" (minigame skill) and reports win rates, battle
   length, skill sensitivity and a full campaign curve.
2. **Bot playtests through the real UI** — `tests/e2e/bot.js` reads the DOM
   (note positions, the timing needle, the closing ring) and presses real keys,
   so the game's own timing and judging code is what's measured. Run at three
   skill levels; telemetry is collected from `window.__mcLog`.
3. **Screenshot review** — every screen and every battle beat captured and
   looked at, at 16:9 desktop, phone landscape and phone portrait.

## 1 · Simulation

Targets: every toy 42–58%; type advantage ~70–75% (decisive in campaign, not
a lock in versus); a clearly better player wins ~3 in 4 mirror matches;
campaign ~15 showdowns with stewards beatable and the Topper a real finale.

### Round robin — L8 Deluxe, 15,840 battles

| Toy | Type | Win rate |
|---|---|---|
| Dame Flurry | FROST | 56.3% |
| Abner | FROST | 53.8% |
| Slick | FROST | 51.8% |
| Sprocket | SPARK | 51.2% |
| Chatterbox | SPARK | 50.4% |
| Chuggs | WARM | 50.3% |
| Big Ted | WARM | 49.1% |
| Cymon | SPARK | 49.0% |
| Colonel Crunch | PINE | 48.8% |
| Dobbin | PINE | 47.5% |
| Ginger Snap | WARM | 46.4% |
| Jack | PINE | 45.5% |

- Type-advantaged side wins **~75%**. Home contest **~60%**.
- Median battle **7 turns** (p90 17); **~23%** reach overtime.
- First mover wins **~56%** — speed matters, doesn't decide.
- Skill: hard hands beat normal **~75%**, normal beat easy **~80%**; a smarter
  brain with the same hands wins **~63%**.

### Campaign curve — normal-skill player

| Starter | Showdowns | Losses | Wild wins | Steward wins | Topper tries |
|---|---|---|---|---|---|
| Big Ted | 15.3 | 2.3 | 93% | 76% | 1.4 |
| Slick | 16.4 | 3.4 | 92% | 82% | 2.8 |
| Chatterbox | 14.1 | 1.1 | 93% | 91% | 1.1 |

Chatterbox is the easy start, Slick the hard one (its weak department, the
Roof, arrives before you've boxed a counter). That spread is deliberate
enough to keep: the starter cards say what each toy is like.

### What the simulator caught

| Finding | Fix |
|---|---|
| Type advantage won **95%** of matchups | Removed the disadvantage penalty; advantage ×1.25 only → 74% |
| Better hands won **84%** of mirrors | Performance range ×0.7–1.25 (was 0.6–1.3), Keep Cool −40/−20% (was −50/−25%) |
| **Big Ted vs Big Ted never ended** (heal + defence stall) | Overtime from round 7: damage ×1.35, ×1.7… |
| Roster spread **28–65%** | Slick, Ginger, Jack, Cymon up; Ted, Crunch, Dobbin, Chatterbox down |
| The Topper took **up to 131 tries** (and 5.1 for a Slick start after the Keep Cool recalibration) | Normal hands, L9, lower base stats → 1.1–2.8 tries |
| Freshly boxed counters were too weak to use next door | New toys join at best−1; the shelf earns 30% XP |
| The Roof was a wall (**47–73%** loss) | Smoothed the level curve |

## 2 · Bot playtests through the real UI

### Round 1 — and why it was the wrong test

The first bot reacted to the DOM once per frame. In this headless environment
WebGL runs in software at 5–12fps, so every reading was up to 200ms stale:
timing scores came out flat (~0.3) regardless of bot skill and Keep Cool was
almost never hit. It also used Big Ted, whose level-3 moves are *all* timing
games, so rhythm and mash were never exercised. Two useful results survived:

- **Big Ted vs Big Ted ran 34 turns (190s).** Linear overtime was too gentle →
  overtime now compounds ×1.4 per round.
- **It prompted the calibration below**, which turned out to matter far more.

### The calibration — `npm run curve`

`scripts/minigame-curve.ts` runs the *real* scoring functions against a
person modelled as a timing error σ (with a 25ms late bias for display and
input latency). Before calibration, a first-timer (σ≈110ms) scored ~0.70 on
every rhythm difficulty and got PERFECT on Keep Cool half the time, while the
CPU's "normal" hands assume 0.66. People would have flattened the campaign and
★★★ wasn't harder than ★. After:

| Game | σ=25 regular | σ=45 good | σ=70 average | σ=110 first time |
|---|---|---|---|---|
| Rhythm ★ / ★★★ | 0.96 / 0.92 | 0.85 / 0.78 | 0.70 / 0.62 | 0.52 / 0.44 |
| Timing ★ / ★★★ | 0.94 / 0.85 | 0.86 / 0.72 | 0.76 / 0.57 | 0.60 / 0.41 |
| Keep Cool (perfect / steady) | 88% / 12% | 62% / 36% | 42% / 42% | 28% / 35% |

CPU "normal" hands: 0.66 / 0.52, Keep Cool 35% / 40% — i.e. an average person.
Mash is deliberately the forgiving one (★ target 12 presses in 2s).

### Round 2 — bot v2, through the real UI

The bot now predicts *when* each note arrives / the needle crosses / the ring
closes (MutationObservers on the DOM) and schedules a real keypress for that
moment plus N(25ms, σ). The game judges by event timestamp, so frame rate no
longer matters. Versus vs CPU (normal), P1 = Dame Flurry and Cymon (between
them: rhythm ★/★★/★★★, timing ★/★★, mash ★), Tree Trimming:

| σ | Rhythm | Keep Cool (perfect / steady / none) | Results |
|---|---|---|---|
| 30ms | 0.92 (★), 0.88 (★★★) | 5 / 0 / 2 | W 7 turns 57s · W 9 turns 64s |
| 70ms | 0.64 | 4 / 4 / 1 | L 7 turns 47s · L 9 turns 62s |
| 110ms | 0.61 | 2 / 2 / 3 | L 5 turns 37s · L 8 turns 57s |

- Scores track σ the way the curve predicts (small samples — this verifies
  the wiring, the curve is the statistics).
- **Battles: 5–9 turns, 37–64s wall-clock** (~7s a turn). That's the length we
  wanted: long enough for a comeback, short enough for "one more".
- The σ=70 bot losing to CPU-normal is fair: it picks moves at random (70%
  attacks), the CPU picks by expected value.
- 6 full battles, 0 errors.

## 3 · Screenshot review — bugs found and fixed

| Found | Fix |
|---|---|
| Keep Cool ring rendered **off-screen** (projected while the camera was close on the attacker) | Cut to a two-shot first, project after one frame |
| Mash meter **invisible** for PLAIN moves (beige on cream) | Gold fill for PLAIN |
| Snowfall rendered as **one giant sphere** | Custom shader ignored `instanceMatrix`; fixed |
| Snow globe glass rendered **navy** | Ink hull was filling it from behind; glass uses ID-pass ink instead. Also fixed premultiplied-alpha compositing (faint dark fringe on every silhouette) |
| Slow devices ran **in slow motion** | Frame delta was clamped at 50ms; now 250ms, so wall-clock pacing holds at 12fps |
| First-battle coach note **covered the ring** it explained | Defend tip moved to the bottom |
| Phone portrait **cropped the scene** | Camera keeps a minimum horizontal field of view; "best played sideways" hint |
| Title logo covered two toys; KA-BLOOM clipped; results panel covered the toy; versus roster covered the stage | Re-framed / re-laid out |
| Editing source **reloaded the page mid-playtest** (dev-server hot reload) | Playtests now run against a static production build |

## Known limits

- **The bot can't measure fun.** It proves the minigames are fair and
  consistent across types; it can't tell you whether an 8-note rhythm at
  290ms feels good. The first real-person questions: is d3 rhythm too fast, is
  the d3 mash target too high, is a 90-second versus match the right length?
- **Counter-picking in versus.** Both players pick on one screen; whoever locks
  second can counter. Fighting games live with this; the worst matchups are
  ~95/5 (e.g. Ginger Snap vs Jack), so a "blind pick" toggle is the obvious
  next feature if it bothers anyone.
- **Bot timing is frame-bound** in this headless environment (~12fps
  software WebGL), so its scores understate what it would get at 60fps.
