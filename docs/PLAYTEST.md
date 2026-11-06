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
| Big Ted | WARM | 54.1% |
| Ginger Snap | WARM | 53.8% |
| Abner | FROST | 52.3% |
| Chatterbox | SPARK | 52.3% |
| Dame Flurry | FROST | 51.9% |
| Slick | FROST | 51.9% |
| Sprocket | SPARK | 49.4% |
| Jack | PINE | 48.8% |
| Chuggs | WARM | 48.5% |
| Colonel Crunch | PINE | 47.4% |
| Cymon | SPARK | 45.3% |
| Dobbin | PINE | 44.5% |

- Type-advantaged side wins **74.2%**. Home contest **61.3%**.
- Median battle **7 turns** (p90 16); **20%** reach overtime.
- First mover wins **58%** — speed matters, doesn't decide.
- Skill: hard hands beat normal **73%**, normal beat easy **77%**; a smarter
  brain with the same hands wins **65%**.

### Campaign curve — normal-skill player

| Starter | Showdowns | Losses | Wild wins | Steward wins | Topper tries |
|---|---|---|---|---|---|
| Big Ted | 15.1 | 2.1 | 98% | 78% | 1.8 |
| Slick | 15.8 | 2.8 | 91% | 85% | 2.3 |
| Chatterbox | 13.7 | 0.7 | 98% | 98% | 1.4 |

### What the simulator caught

| Finding | Fix |
|---|---|
| Type advantage won **95%** of matchups | Removed the disadvantage penalty; advantage ×1.25 only → 74% |
| Better hands won **84%** of mirrors | Performance range ×0.7–1.25 (was 0.6–1.3), Keep Cool −40/−20% (was −50/−25%) |
| **Big Ted vs Big Ted never ended** (heal + defence stall) | Overtime from round 7: damage ×1.35, ×1.7… |
| Roster spread **28–65%** | Slick, Ginger, Jack, Cymon up; Ted, Crunch, Dobbin, Chatterbox down |
| The Topper took **up to 131 tries** | Normal hands, L9, lower base stats |
| Freshly boxed counters were too weak to use next door | New toys join at best−1; the shelf earns 30% XP |
| The Roof was a wall (**47–73%** loss) | Smoothed the level curve |

## 2 · Bot playtests through the real UI

BOT_RESULTS

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
