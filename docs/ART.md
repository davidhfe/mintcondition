# Art direction — "printed toys"

**One sentence:** real toys, built from the shapes toys are actually made of,
printed on cheap newsprint by a press that's slightly out of register.

![battle](img/battle.png)

## The rules

1. **Toys are primitives.** Spheres, cylinders, rounded boxes, extrusions. If a
   real toy wouldn't be made that way, neither is ours. No sculpting — the
   charm is the construction.
2. **Ink everything, twice.** Thick silhouettes (inverted hull, ~4px at 1080p)
   and thin inner contours wherever two parts meet (ID-buffer edges, ~1.6px).
   Line-weight contrast is what makes it read as *drawn*.
3. **Three bands, and the middle one is dots.** Light / halftone / shadow. The
   halftone is a 45° screen in screen space, so it stays the same size as the
   camera moves — like print, not like a texture.
4. **Shadows go cool, not black.** Each colour's shade is darkened and nudged
   toward violet, the way a colourist would choose it.
5. **The press is off.** Cyan/magenta misregistration on every frame, which
   kicks hard on impacts. Those two colours are also the player colours (P1
   cyan, P2 magenta) — they're the rim lights on the toys and the borders on
   the HUD.
6. **Animate on twos.** Toys move at 12 drawings a second; the camera moves at
   60. That mismatch is the Spider-Verse feel. Hit-stop and slow-mo are on the
   game clock; screen FX run on the real clock so they still flicker during
   a freeze.
7. **Big hits get a page layout.** Impact frames (two-tone paper/ink for ~80ms),
   radial speed lines, and a diagonal **panel split** that cuts to the target's
   face. Small hits get a flash, lines and a word. Earned spectacle only.
8. **Two typefaces.** Fraunces for the narrator (names, captions, menus — the
   classy voice). Bangers for the announcer and the sound effects (the loud
   voice). Never mix them in one line.
9. **Sets are toy theatres.** A platform the toys stand on, then cut-out layers
   at a few depths so camera moves get real parallax. Every set has one joke
   in it (the oven, the scissors on the wall, the competition's unfinished
   snowman).

## Palette

| Token | Hex | Use |
|---|---|---|
| Ink | `#1a1026` | Lines, text, shadows on UI. Plum-black, never `#000`. |
| Paper | `#fff4e0` | Panels, highlights. |
| Candy | `#e8344e` | The red. Stamps, naughty, low health. |
| Gold | `#ffc73a` | Selection, Deluxe, PERFECT. |
| Spruce | `#155e4f` | The green — teal-leaning, not Christmas-card kelly. |
| Cyan / Magenta | `#2ad4e0` / `#ff3d8b` | Misprint fringes, P1 / P2. |
| WARM / FROST / PINE / SPARK | `#ff7a2f` / `#7fd8ff` / `#43b56d` / `#ffd23f` | Types. |

## What we didn't do

- **No bloom, no depth of field, no PBR.** They fight the print look.
- **No music video lighting.** One key light, fixed. Drama comes from the
  camera and the layout, not from the lamps.
- **No glossy everything.** Gloss is reserved for things that are actually
  shiny: tin, glass, glazed wood, cymbals, ornaments.
