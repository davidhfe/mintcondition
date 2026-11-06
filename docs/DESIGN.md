# MINT CONDITION — design

> The kids were good this year. All of them. The North Pole ran short on magic,
> so Oddrey was told to top up the Cheer Condenser. Oddrey topped it up.
> Every toy in the workshop woke up. Within the hour, they'd unionized.

Toys don't fight. They **compete** — cookie decorating, gift wrapping, light
shows — and they take it as seriously as a title bout. Beat a toy at its own
game and it agrees to get in the box.

## Tone rules (the edit filter)

1. **Deadpan narrator, LOUD announcer.** Captions are dry and short (Fraunces
   italic). Callouts are enormous (Bangers). Never both in one line.
2. **No speeches about the true meaning of Christmas.** No hugging it out. The
   joke is the earnestness of the competition.
3. **Every line under ~12 words.** If a toy bio needs two sentences, cut one.
4. **A feature must show up on screen within one battle or it's cut.**

## The loop

```
Map ─▶ pick a department ─▶ a toy is loitering ─▶ pick your toy (type matters)
 ▲                                                        │
 │                                                  SHOWDOWN (1v1)
 │                                                        │
 └── level up / learn moves / DELUXE EDITION ◀── win: toy is BOXED, joins your shelf
                                                  lose: no penalty, some XP
```

- Four departments + a finale. Each department's toys share a type; what you
  box in one department is the counter for the next, so the route teaches the
  type loop without a tutorial:
  **Bakery (WARM) → Wrapping Room (PINE) → Roof (SPARK) → Yard (FROST) → The Big Tree.**
- Each department has two wild toys and a **Shop Steward** (mini-boss). Box
  both wild toys (or win three times) and the Steward will see you. Beat the
  Steward to open the next department.
- Toys heal fully after every showdown. Losing costs nothing but time.
- Save is automatic (localStorage) after every result.

## Showdown rules

1v1, in rounds. Each round the faster toy (HUSTLE) acts first. On your turn you
pick one of up to four moves. **Every move is a performance**: a 2-second skill
minigame decides how well it lands.

| Stat | Meaning |
|---|---|
| **SPIRIT** | Health. Hit zero and you're **HUMBUGGED**. |
| **FLAIR** | How impressive your showing-off is. |
| **POISE** | How hard it is to rattle you. |
| **HUSTLE** | Who goes first. |

**Moves** are either **SHOW** (rattle the opponent's Spirit) or **TRICK**
(stat changes, healing, tangling). Some are **NAUGHTY** — stronger, but they
fill your **Naughty List** meter.

### Performance minigames (attacker)

| Game | Input | Score |
|---|---|---|
| **RHYTHM** | arrows scroll to a line; hit the lane (P1 `WASD`, P2 `↑←↓→`) | mean timing accuracy |
| **TIMING** | a needle sweeps; stop it in the sweet spot (P1 `Space`, P2 `Enter`) | distance from center |
| **MASH** | hammer the action key | presses ÷ target |

Score 0–1 → power ×0.6 … ×1.3. Grades: **PERFECT** ≥0.9, **GREAT** ≥0.65,
**OK** ≥0.35, else **SLOPPY**. Bigger moves have harder minigames.

### Keep Cool (defender)

When a SHOW move is about to land, a ring closes on the defender. Press your
action key as it closes: **UNFAZED** (perfect, −50%) or **STEADY** (−25%).
Early press = flinch, no reduction. Keeps both players' hands on the keys
every turn.

### Types

Four types in a loop. Advantage ×1.5 (**SUPER SWEET!**), disadvantage ×0.67
(**LUKEWARM**). Non-adjacent pairs are neutral. PLAIN moves are always neutral.

```
FROST ──▶ WARM ──▶ PINE ──▶ SPARK ──▶ FROST
 snow       every pine     wood doesn't   lights thaw
 smothers   ends up a      conduct.       the frost.
 the hearth Yule log.      Look it up.
```

### The Naughty List

Per player. Naughty moves add 25–40; it drains 8 at the start of each of your
turns. At 100: **COAL** — 20% of max Spirit, meter resets.

### Arenas (the "battle" you select)

The contest matters: moves matching the arena's type get ×1.2.

| Contest | Department | Boost |
|---|---|---|
| Cookie Bake-Off | The Bakery | WARM |
| Wrap Battle | The Wrapping Room | PINE |
| Light Show | The Roof | SPARK |
| Snowman Build-Off | The Yard | FROST |
| Tree Trimming | The Big Tree | — |

### Progression

Levels 1–10. Stats scale `base × (0.6 + 0.08·L)`. Moves unlock at L1, L1, L3, L6.
At **L6** a toy becomes a **DELUXE EDITION**: +10% stats, gold trim, and its
signature move. (This is the "evolution" — a toy industry joke, not a new
creature.) Win XP = `18 + 9·foeLevel`; a loss still gives 40%.

### Damage

```
power × (FLAIR'/POISE') × (0.6+0.08·L) × 0.45
      × type × arena × performance × keepCool × ability × rand(0.9–1.0)
```
Stat stages −3…+3 multiply by (3+s)/3 or 3/(3−s).

## Roster — 12 toys + 1

Each toy has one **ability**: one rule, visible on screen when it fires.

| Toy | Type | Ability | Bio |
|---|---|---|---|
| Big Ted | WARM | **Unretired** — first KO leaves him at 1 Spirit | Retired from boxing. Unretired for boxing. |
| Ginger Snap | WARM | **Can't Catch Me** — dodges the first SHOW aimed at him | Fast. Knows it. Mentions it. |
| Chuggs | WARM | **Coal-Fired** — COAL heals instead of hurts | Runs on coal. Has made peace with that. |
| Colonel Crunch | PINE | **Perfectionist** — PERFECT lands ×1.5, not ×1.3 | Has cracked 4,000 walnuts. Will tell you about each. |
| Dobbin | PINE | **Steady** — Keep Cool is never worse than STEADY | Goes nowhere. Takes his time getting there. |
| Jack | PINE | **Surprise!** — first SHOW move ×1.5 | Wound up since 1987. |
| Sprocket | SPARK | **Optimized** — repeating a move: +15% per repeat | Let's circle back on that. |
| Cymon | SPARK | **Racket** — opponent's minigames run 20% faster | Knows one song. It's this one. |
| Chatterbox | SPARK | **No Filter** — Naughty moves fill the list half as fast | No body. No filter. |
| Dame Flurry | FROST | **Shake Me Up** — +1 FLAIR every time she's rattled | Has been shaken. Will not be stirred. |
| Slick | FROST | **Slippery** — can't be Tangled or slowed | Fastest thing on ice. Only thing on ice. |
| Abner | FROST | **Big Softie** — recovers 6% Spirit after each turn | Big. Soft. Slightly damp. |
| *The Topper* | SPARK | **Top Billing** — no weaknesses | Will not come down. Frankly, a star. |

## Versus

**Two players, one keyboard.** P1: `WASD` + `Space`. P2: arrows + `Enter`.
Pick the contest, both pick a toy at once (counter-picking is part of it), lock
in, go. Versus toys are Level 8 Deluxe with full movesets — the roster is open
from the start. Also playable vs CPU.

## Explicitly cut

- **Switching / teams of 6.** 1v1 keeps every turn about the two toys on stage.
  Choosing *which* toy to bring is the strategic layer.
- **Catch rates / items.** Win = boxed. No inventory.
- **Accuracy / misses.** Your hands are the accuracy stat.
- **Music.** SFX only, per the brief.
- **Online play.** Needs a server; out of scope.
