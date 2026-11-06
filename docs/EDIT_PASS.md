# Edit pass

The brief: *"Claude, you have a habit of adding and adding. And some of the
additions are saccharine. Make sure we've earned it."*

So this is the ledger. The rule applied to every feature and every line:
**does it show up on screen in one battle, and does it make that battle better
or funnier?** If not, it went.

## Cut

| What | Why |
|---|---|
| **"LUKEWARM"** (not-very-effective) | The sim showed type-advantaged toys winning 87–95% with a penalty in play. Advantage-only lands at 74% and leaves one fewer rule to learn. |
| **Teams + switching** | 1v1 keeps every turn about the two toys on stage. *Choosing which toy to bring* is the strategy layer. |
| **Catch rates, items, an inventory** | Win = boxed. The contest *is* the catch. |
| **Accuracy / misses** | Your hands are the accuracy stat. |
| **Damage numbers** | The fighting-game ghost bar shows the chunk. Numbers made it read like a spreadsheet. |
| **A scrolling battle log** | One narrator caption per move, then it's gone. |
| **Tutorial screens** | Two in-context lines during the *first* showdown only, then never again. |
| **Five typefaces** | Tested seven, kept two: the narrator (Fraunces) and the announcer (Bangers). |
| **Per-arena minigame skins** (sprinkle notes, ribbon needles…) | The minigames take the move's type colour. Reskins were decoration, not play. |
| **A Christmas Eve countdown** | The intro promised "four days". Nothing counted down. Promise removed rather than a timer added. |
| **Native browser `confirm()` dialogs** | Replaced with the game's own modal, which also stops a battle underneath from stealing the keypress. |
| **Music** | By request. SFX are synthesised; there's a VO hook if you want an announcer. |
| **Online play** | Needs a server. Out of scope for a static Vercel joke. |
| **The `skippable` HUD flag, unused moves, unused fonts** | Dead weight found in review. |

## Rewritten

**The tone had a tic.** Reading every bio, taunt and move blurb in one sitting
showed one formula doing most of the work — three-fragment staccato
("Fast. Knows it. Mentions it.", "Inescapable. Warm. Long.") or a lone adverb
as the punchline ("Ominously", "Menacingly", "Innocently", "Kindly", and
"Loudly" twice). One or two of those is a voice; twenty is a crutch. About a
third of the lines were rewritten toward specific images:

| Before | After |
|---|---|
| Ginger Snap — *Fast. Knows it. Mentions it.* | *Has never been caught. Brings it up a lot.* |
| Sprocket — *has scheduled this showdown.* | *sent a calendar invite for this.* |
| Slick — *does a lap. Unprompted.* | *does a lap of honour. Nothing has happened yet.* |
| The Big Hug — *Inescapable. Warm. Long.* | *Goes on for slightly too long.* |
| Back and Forth — *Back. And forth. Relentlessly.* | *It's in the name.* |
| Full Gallop — *Gallops furiously. Goes nowhere.* (repeated Dobbin's bio) | *Hooves everywhere. Distance covered: none.* |
| Circle Back — *Revisits an earlier point. Loudly.* | *Revisits an earlier point. With slides.* |
| Spotlight — *Lights herself. Personally.* | *Brought her own lighting rig.* |

The title tagline used to be the intro's punchline ("…then they unionized"),
which spoiled it two screens early. It's now the premise in five words:
**"Toys don't fight. They compete."**

A unit test (`tests/core/data.test.ts`) fails if any flavour line runs past 12
words, so the edit holds.

## Kept, because it earned it

Each of these shows up on screen within a battle:

| System | Where you see it |
|---|---|
| Types | `SUPER SWEET!` callout, chips on every card, the loop on the map |
| Naughty List | `NAAAUGHTY!` callout + meter; coal is rare, which is why it lands |
| Abilities | Chip on the nameplate that flashes (and strikes through when spent) |
| Keep Cool | The ring, every hit — both players stay on the keys |
| Overtime | Banner + the round tag going gold. Found by the simulator, not added for flavour |
| Home contest | Was invisible mid-battle → now a chip in the move detail |
| Racket (Cymon) | Was invisible → now flagged in the minigame header |
| Deluxe Edition | The rosette on the model, a results card, the signature move |

## Added back

Two things went *in* during the edit, because their absence was the problem:

- **Oddrey on screen.** The protagonist only existed in memo text. One model,
  used three times (title, the KA-BLOOM panel, the ending). Singed eyebrows
  are the only joke.
- **A VS splash.** The brief asked for over-the-top fighting-game style; the
  VS screen is the genre's signature. It plays *during* the intro camera move,
  so it costs no time.

## Saccharine check

No hugging it out, no "true meaning of Christmas", no toy learning to love
being a toy. The ending is three panels and the last word goes to management:
*"Good work. Do not touch the Cheer Condenser again."*
