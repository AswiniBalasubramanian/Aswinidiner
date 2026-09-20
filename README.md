# Aswini Diner

A cinematic 3D diorama restaurant game in the spirit of Penguin Diner: a small Korean hanok
counter restaurant with a chef who cooks, a server you direct, and guests who arrive, order,
eat and pay.

## Run

```bash
npm install
npm run dev
```

Opens on http://localhost:5190.

## Play

1. **Seat** — click an empty stool while a guest waits at the entrance (stools glow softly).
2. **Order** — click the seated guest once their thought bubble shows a dish.
3. **Serve** — the chef cooks at the stove and drops the plate on the pass (right end of the
   counter). Click the plate, then click the guest it belongs to.
4. Guests tip when served quickly and walk out when their patience bar empties.
   A service lasts three minutes.

## Stack

Vite + Three.js. Everything in the scene is procedural — canvas-generated brick, hexagonal tile,
wood and stone textures; an instanced tiled hip roof; cel-shaded characters with inverted-hull
outlines; ACES tone mapping, soft shadows and warm lantern point lights.

- `src/world.js` — restaurant, kitchen, counter, roof, courtyard
- `src/characters.js` — character rig + dishes
- `src/game.js` — customer / chef / server state machines
- `src/ui.js` — world-space bubbles and the HUD

## Progression

- First visit asks you to **name your diner** — the name goes on the HUD, the page title and the
  wall sign inside the restaurant.
- Each day has a **sales target** that starts easy (Level 1: ₩20,000 — about three guests) and
  climbs each level: ₩35k → ₩55k → ₩80k → ₩110k. A full service earns roughly ₩60–90k.
- Meet the target and you **level up**; the restaurant physically grows:
  1. The counter — four stools at the bar
  2. The courtyard — string lights and a garden table for two
  3. The deck — timber deck under a vine pergola on the right, table for two
  4. The pyeongsang — raised wooden platform by the jars with floor cushions
  5. Night market — red lanterns along the front, bamboo planters, a third courtyard table
- The **Levels** board (top-right chip, or from the start screen / market) shows every level, its
  target and what it unlocks. Play any level you have reached; switching starts a fresh service.
- Earnings bank into a persistent wallet for the **market**: courtyard table (+2 seats),
  twin-burner stove (30% faster cooking), warm lanterns (+25% patience), street signboard
  (more guests), Bulgogi on the menu (₩12,000).
- Holding the wrong plate? Click the **dustbin** by the pass — the chef remakes the order.
- Progress is saved in `localStorage` (`aswini-diner-save-v1`).
