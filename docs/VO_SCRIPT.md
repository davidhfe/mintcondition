# Announcer VO

The game ships silent on voice. If you generate announcer clips, drop them in
`public/vo/` as `<id>.mp3` and list the ids in `public/vo/manifest.json`:

```json
["showdown", "perfect", "superSweet", "naughty", "coal", "overtime", "humbugged", "boxed"]
```

They load once at boot and play on top of the SFX. Missing ids are skipped,
so you can add them one at a time.

## Direction

A fighting-game announcer who has been asked to work a cookie contest and has
decided to take it completely seriously. Big, warm, a little hoarse. Never
winks at the camera — the joke is that he means it.

| id | Line | When | Notes |
|---|---|---|---|
| `showdown` | "SHOWDOWN!" | Contest banner at the start of every battle | Full arena-announcer. Hold the "OW". |
| `perfect` | "PERFECT!" | A minigame scored ≥ 90% | Crisp, quick, delighted. Under 0.8s. |
| `superSweet` | "SUPER SWEET!" | Type advantage lands | The signature line. Rising pitch on "SWEET". |
| `naughty` | "NAAAAUGHTY!" | A naughty move is used | Stretched. Scandalised and thrilled in equal measure. |
| `coal` | "COAL!" | The Naughty List hits 100 | Flat, final. A judge's gavel. |
| `overtime` | "OVERTIME!" | Round 7 begins | Urgent. |
| `humbugged` | "HUMBUGGED!" | A toy's Spirit hits zero | The KO call. Biggest read in the set. |
| `boxed` | "BOXED!" | Campaign win: the box drops | Satisfied. A little smug. |

Keep each clip under ~1.2s with no leading silence; the callouts are timed to
the hit, not to the audio.
