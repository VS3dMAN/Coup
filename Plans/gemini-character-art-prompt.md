# Gemini Image-Generation Prompt — Coup Character & Role Art

> Copy everything below the horizontal rule into Gemini. It is written as a single
> self-contained brief; Gemini has no knowledge of this project, so the brief carries all
> the context itself. Generate the images one at a time, in the order given.

---

## ROLE

You are the art director and illustrator for a web-based digital adaptation of the
bluffing card game **Coup**. I need you to generate a complete, visually unified set of
**character portrait illustrations** for the game's five role cards, plus matching square
emblem crops and a card back. Everything must look like it was painted by one artist, in
one sitting, for one deck.

Read the entire brief before generating anything. Then generate the images **one image per
response**, in the numbered order in the DELIVERABLES section, and label each one with its
exact target filename so I can save it correctly.

---

## PART 1 — WHAT THE GAME IS

Coup is a game of deception set in a decaying Renaissance-era city-state. The old
government has collapsed; ambitious nobles manoeuvre in the ruins of a corrupt court,
buying influence with coins, lying about which officials they control, assassinating
rivals, and bleeding the treasury. Each player secretly holds two "influence" cards, each
card being a **court official** they claim to command. Players constantly bluff about which
officials they hold. Losing both officials means you are out of the game.

The mood is: **candle-lit conspiracy in a marble palace**. Old money, old blood, whispered
threats behind fans and fur collars. This is not high fantasy. No wizards, no dragons, no
magic, no elves, no glowing runes. It is a grounded, historical, human political thriller —
closer to Renaissance Italy (Medici Florence, Venetian doges, Borgia Rome) than to Tolkien.

---

## PART 2 — THE EXISTING VISUAL IDENTITY (MATCH THIS EXACTLY)

The web app is already built and styled. The art must slot into an existing design system,
so the palette and mood below are **fixed constraints, not suggestions**.

### Exact colour palette (use these hex values as the backbone of every image)

| Role in the design | Hex | Notes |
|---|---|---|
| Parchment (light) | `#f3e9d2` | The card stock the art sits on |
| Deep parchment | `#e8d9b5` | Shadowed parchment |
| Ink (darkest) | `#2a1810` | Near-black warm brown — use this instead of pure black |
| Soft ink | `#4a3828` | Mid brown shadow |
| Burgundy | `#5a1418` | Primary noble red |
| Deep burgundy | `#3a0a0e` | Shadow red / blood red |
| Navy | `#1a2540` | Primary noble blue |
| Deep navy | `#0f1628` | Shadow blue |
| Gold | `#c9a24a` | All metal, all trim, all jewellery |
| Bright gold | `#e5c063` | Gold highlights / candle glints |
| Deep gold | `#8a6820` | Tarnished gold, gold in shadow |
| Accent red | `#8b2a2e` | Wax seals, sashes |
| Stone | `#d8c9a8` | Marble, aged plaster |
| Canvas (darkest background) | `#1a1410` | Backdrop void |

**Never use:** pure white `#ffffff`, pure black `#000000`, neon or saturated modern colours
(cyan, magenta, lime, electric purple), pastel or candy tones, or any colour outside the
warm-brown / burgundy / navy / gold family. Everything must feel like aged pigment.

### Rendering style (identical across all images)

- **Medium:** Renaissance oil-on-panel portraiture, in the manner of Bronzino, Titian and
  Holbein — smooth blended flesh, deep chiaroscuro, rich fabric rendering — but slightly
  stylised and simplified so it reads clearly at small on-screen sizes (as small as 100 px
  wide). Think "painted illustration", not "photograph", and not "cartoon".
- **Brushwork:** visible but controlled. Soft edges on skin, crisper edges on metal and
  jewellery. No hard vector outlines, no cel-shading, no comic-book inking, no airbrushed
  3D-render look, no anime, no Pixar.
- **Surface:** a faint aged-canvas texture and very subtle craquelure over the whole image,
  as if the painting is 400 years old. Keep this subtle — it should be felt, not noticed.
- **Finish:** a warm golden varnish cast over the entire image, and a soft dark vignette in
  the corners so the subject is the brightest thing in the frame.

### Lighting (identical across all images — this is the single most important unifier)

- **One** warm candle/lamp light source, positioned **upper-left, roughly 40° above and 30°
  to the left of the subject's face.**
- A weak, cool, dim fill from the lower-right at roughly 10% strength (moonlight through a
  window), tinted navy `#1a2540`.
- Deep, heavy shadows on the subject's right side (viewer's right). Shadows are warm brown
  `#2a1810` — never grey, never blue-black.
- One clean specular glint on any gold jewellery, catching the candle.

### Framing and composition (identical across all portraits)

- **Head-and-shoulders to upper-chest** portrait. Never full body, never waist-up, never a
  scene with more than one person.
- Subject is **centred horizontally**. Slight three-quarter turn of the body toward the
  viewer, head turned closer to frontal, eyes looking directly at the viewer.
- **Eye line sits at 35–40% of the image height from the top.** Keep this consistent in
  every portrait so the five cards line up when placed side by side.
- Top of the head sits roughly 10% down from the top edge. Do not crop the top of the head
  or any headwear.
- Shoulders exit the bottom edge of the frame.
- Background is a dark, out-of-focus palace interior: a hint of a heraldic damask wall
  pattern, a stone column edge, or a heavy curtain — rendered in that character's accent
  colour and heavily darkened toward the corners. The background must never compete with
  the face, and must never contain other characters, readable objects, or scenery detail.

### Absolute prohibitions (apply to every single image)

- **No text, letters, numerals, words, signatures, watermarks or captions anywhere.** The
  app renders the role names itself in its own typeface; baked-in text will look broken.
- **No card frames, borders, ornamental corners, banners, ribbons or decorative edges.** The
  app draws a gold border and a parchment frame around the art. Any border you paint will be
  doubled and will look wrong.
- No UI elements, no icons, no drop shadows behind the image, no rounded corners, no mockup
  presentation, no "card lying on a table" scenes.
- No transparent background — every image is a fully painted, opaque rectangle that bleeds
  to all four edges.
- No modern clothing, no modern objects, no anachronisms.
- No gore, no visible wounds, no blood spatter. Menace is conveyed through expression,
  posture and shadow — never through violence.
- Keep all five characters as distinct human individuals: different ages, builds, skin
  tones and silhouettes. They must never look like the same model in five costumes.

---

## PART 3 — THE FIVE CHARACTERS

Each character below lists their in-game function, because that function must be readable
in the portrait through costume, prop and expression alone — with **no text**.

### 1. THE DUKE — the treasury

**Function:** Takes 3 coins in tax from the treasury. Blocks other players from taking
foreign aid. He *is* the money, and he knows it.

**Accent colour:** Navy `#1a2540` and `#0f1628`, trimmed heavily in gold `#c9a24a`.

**Appearance:** A heavyset man in his late fifties. Broad, fleshy, well-fed face; a short,
neatly squared grey-and-black beard; small shrewd eyes with heavy lids that suggest he has
already counted your money. Thinning hair beneath a low, flat velvet cap.

**Costume:** A deep navy velvet robe with a wide fur-trimmed collar in dark sable brown.
Across his chest, a heavy multi-link gold chain of office — the single brightest object in
the image, catching the candle. Rings on two fingers, one set with a dark navy stone.

**Prop / staging:** One hand rests near the bottom of the frame on a small stack of gold
coins, or on the edge of a brass balance scale; only a suggestion of it enters the frame,
dimly lit. The prop must not dominate.

**Expression:** Complacent, unbothered, faintly amused — a man who cannot be outbid.

---

### 2. THE ASSASSIN — the knife

**Function:** Pays 3 coins to force another player to lose an influence. Kills. Cannot be
stopped by anyone except the Contessa.

**Accent colour:** Deep burgundy `#3a0a0e` and ink `#2a1810`. Almost no gold — this is the
darkest and lowest-contrast portrait of the set, but the face must still read clearly.

**Appearance:** Lean, angular, ageless — could be thirty, could be fifty. Androgynous and
deliberately hard to place. **Do not fully hide the face:** the deep hood casts a shadow
across the upper face, but the eyes, the bridge of the nose and a hard, thin mouth must stay
visible and lit by a thin rim of candlelight. Pale, cool skin. Faint scarring along one
cheekbone.

**Costume:** A heavy hooded cloak in near-black burgundy over dark leather. A dull,
unpolished steel gorget or buckle at the throat — matte, deliberately not gold. A dark cloth
half-mask pulled down beneath the chin, not covering the mouth.

**Prop / staging:** A slim stiletto dagger held vertically close to the chest, its edge
catching one narrow line of candlelight. The blade is clean and unbloodied. Most of the
weapon falls into shadow.

**Expression:** Utterly still. No anger, no theatrical menace. The flat, patient calm of
someone who has already decided.

---

### 3. THE CAPTAIN — the extortionist

**Function:** Steals 2 coins from another player, and blocks stealing. She takes what she
wants by force and dares you to object.

**Accent colour:** Deep teal-shifted navy `#1a2540`, with tarnished gold `#8a6820` and
weathered leather brown.

**Appearance:** A woman in her late thirties, weathered by sun and salt. Strong jaw, sharp
cheekbones, deep-set dark eyes, a small white scar through one eyebrow. Dark hair pulled
back tight and braided. Sun-darkened olive skin. Physically the most powerful-looking figure
of the five.

**Costume:** A worn steel-and-leather half-cuirass over a dark teal doublet — the metal
scuffed and honestly used rather than ceremonial. A wide leather baldric across the chest. A
single tarnished gold hoop earring. A short dark cloak clasped at one shoulder.

**Prop / staging:** One hand rests on the pommel of a curved short sword at her hip, at the
very bottom edge of the frame. Behind her, in deep shadow, the barest suggestion of heavy
rope or rigging against the dark wall — almost invisible, just enough to imply the harbour.

**Expression:** Direct, challenging, chin slightly raised. Not smiling. She is waiting for
you to try something.

---

### 4. THE AMBASSADOR — the shape-shifter

**Function:** Exchanges cards with the court deck — changes what they are. Also blocks
stealing. The professional diplomat: the most fluid and least trustworthy person at court.

**Accent colour:** Rich jewel-toned emerald-teal against gold `#c9a24a` — the most ornamented
and most colourful of the five.

**Appearance:** A man in his mid-forties, of ambiguous and well-travelled origin, with warm
deep brown skin, an immaculately trimmed beard, and long dark hair worn loose to the
shoulders. Refined, quick-eyed, unreadable, with one eyebrow very slightly raised.

**Costume:** The most elaborate garment in the set — layered brocade robes in deep teal-green
with dense gold embroidery at the collar and shoulders, and a foreign, ornate gold pendant of
no recognisable heraldry. A soft draped headwrap or embroidered cap that reads as "from
somewhere else".

**Prop / staging:** He holds a rolled parchment scroll near his chest, closed with a large
crimson `#8b2a2e` wax seal. The seal catches the light and is the second-brightest object
after his pendant. The seal must carry **no readable emblem or lettering** — just an abstract
impressed swirl.

**Expression:** A faint, entirely professional smile that does not reach the eyes. Warm and
inscrutable.

---

### 5. THE CONTESSA — the shield

**Function:** Blocks assassination. She survives. Her whole power is that she cannot be
killed — the one card that stops the knife.

**Accent colour:** Deep burgundy `#5a1418` with black lace and cold gold.

**Appearance:** A woman of about fifty, aristocratic and severe, with a pale powdered
complexion, high forehead and a long elegant neck. Dark hair drawn back beneath a fine black
lace mourning veil that half-covers her hair but leaves the entire face clear and lit. Faint
lines at the eyes and mouth. Composed, imperious, entirely unafraid.

**Costume:** A high-collared burgundy velvet gown with black lace at the throat and cuffs. A
choker of dark garnets at the neck. A single large, heavy gold ring on her right hand with a
hinged, ornate stone setting — the poison ring, understated but present.

**Prop / staging:** One hand raised near her collarbone, the ring turned very slightly toward
the light so the setting glints. Optionally, the rim of a small gold goblet enters the very
bottom corner of the frame in deep shadow.

**Expression:** Cool, level, faintly contemptuous. She has buried three husbands and outlived
every assassin sent for her.

---

## PART 4 — SIZES AND ASPECT RATIOS

The app uses each character in **two** places, at two different shapes. Both must come from
the same painting so they read as the same character.

### A. Card face art — **3:4 portrait (vertical)**

- **Target output: 900 × 1200 px, PNG.**
- This is the primary illustration described above.
- It is displayed inside a tall parchment card roughly 104 × 145 CSS pixels, so it will be
  seen small. **The face must survive being shrunk to 100 px wide.** Keep the head large in
  frame, keep contrast between face and background high, and avoid fine detail that turns to
  mud at small sizes.
- **Safe zone:** keep the head, eyes and all key props inside the central 80% of the frame.
  Assume the outer 6% on every edge may be cropped by the card frame — so bleed the
  background out to the edges, but keep nothing important there.

### B. Square emblem / avatar crop — **1:1 square**

- **Target output: 512 × 512 px, PNG.**
- Used for the small face-down and revealed markers, and for the compact mobile player strip,
  where the app shows a tiny square badge.
- **This must be the same painting, recomposed to a square** — a tighter crop centred on the
  head and shoulders, with the head filling roughly 65% of the square's height. Same face,
  same costume, same lighting, same background, same colours. It is not a new character and
  not a new pose.
- Because it renders as small as 40 px, simplify: push the background darker, drop the
  faintest detail, and let the silhouette and the accent colour carry the identity.

### C. Card back — **3:4 portrait (vertical)**, one image, no character

- **Target output: 900 × 1200 px, PNG.**
- Not a portrait. This is the reverse of every face-down influence card.
- Design: a dark burgundy `#3a0a0e` field with a subtle repeating damask/diaper pattern, and
  one centred gold `#c9a24a` heraldic device — a stylised crown above a plain shield —
  painted in the same aged-oil style, with the same candle glint and corner vignette.
- Perfectly symmetrical left-to-right. Same aged canvas texture and varnish. **No text.**

### If your output ratio is constrained

If you can only produce square images, generate the portrait pieces as **1:1, composed so
that a centred 3:4 vertical crop still contains the full head, the eye line at 35–40%, and
all key props** — i.e. keep the important content inside a tall centre column and let the
left and right thirds be pure background. Say so in your response when you do this, so I know
to crop.

Preferred format is PNG. Do not upscale beyond the stated sizes, and do not add padding,
letterboxing, or margins of flat colour.

---

## PART 5 — CONSISTENCY CHECKLIST (verify before each output)

Before returning each image, confirm all of the following:

1. Single warm candle light from the **upper-left**; weak cool navy fill from lower-right.
2. Eye line at **35–40%** of image height; head not cropped; shoulders exit the bottom.
3. Palette drawn only from the hex table in Part 2. No pure white, no pure black, no neon.
4. Warm golden varnish over everything, soft dark corner vignette, subtle aged canvas texture
   and craquelure.
5. Renaissance oil-portrait style, stylised for small-size legibility. Not photoreal, not
   cartoon, not 3D, not anime.
6. **Zero text, zero borders, zero frames, zero watermarks, zero UI.**
7. Background is a dark, unfocused palace interior in this character's accent colour, with no
   other figures and no readable detail.
8. Opaque, full-bleed rectangle at the exact stated pixel size.
9. This character is visibly a different person from the other four — different age, build,
   skin tone, silhouette and headwear.
10. Historical Renaissance dress only. No fantasy, no magic, no modern objects.

---

## PART 6 — DELIVERABLES AND EXACT FILE PLACEMENT

Generate these **11 images, one per response, in this order**. Label each response with its
filename. Filenames are lowercase and must match exactly — the app loads them by these names.

### Card face art — 900 × 1200 px (3:4)

| # | Character | Save as |
|---|---|---|
| 1 | Duke | `client/public/assets/roles/duke.png` |
| 2 | Assassin | `client/public/assets/roles/assassin.png` |
| 3 | Captain | `client/public/assets/roles/captain.png` |
| 4 | Ambassador | `client/public/assets/roles/ambassador.png` |
| 5 | Contessa | `client/public/assets/roles/contessa.png` |

### Square emblem crops — 512 × 512 px (1:1)

| # | Character | Save as |
|---|---|---|
| 6 | Duke | `client/public/assets/roles/icons/duke.png` |
| 7 | Assassin | `client/public/assets/roles/icons/assassin.png` |
| 8 | Captain | `client/public/assets/roles/icons/captain.png` |
| 9 | Ambassador | `client/public/assets/roles/icons/ambassador.png` |
| 10 | Contessa | `client/public/assets/roles/icons/contessa.png` |

### Card back — 900 × 1200 px (3:4)

| # | Asset | Save as |
|---|---|---|
| 11 | Card back | `client/public/assets/roles/card-back.png` |

**Placement notes (context only — you do not need to act on these):** both directories
`client/public/assets/roles/` and `client/public/assets/roles/icons/` sit inside the Vite
`public/` folder, so the files are served at the runtime URLs `/assets/roles/duke.png` and
`/assets/roles/icons/duke.png`. The filenames are the lowercased role names used in the
game's card-type constants (`Duke`, `Assassin`, `Captain`, `Ambassador`, `Contessa`), so the
app can build each path directly from the card type.

---

## PART 7 — HOW TO RESPOND

Start by generating image **#1 (Duke, 900 × 1200)**. With each image, give me one short
paragraph confirming the lighting direction, the eye-line position, the accent colour used,
and the exact output dimensions. Then wait for me to say "next" before generating the
following image, so I can request corrections and keep the set consistent.

If any instruction in this brief conflicts with another, the **consistency rules in Part 2
and Part 5 win** — a set that matches perfectly is worth more to me than any single striking
image.
