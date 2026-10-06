# EvilRise: browser build

A playable version of Chapter 1, Port Halvern, built with three.js. It runs in any desktop browser with no install, so the story, systems and level can be played and tested before the Unreal Engine build exists.

The 3D models are simple stand-ins built in code. Every texture and sound is generated at runtime, so the folder has no binary assets. All of the text the player reads or hears comes from `data/narrative_c1.json`, and the objective list comes from `data/objectives_c1.json`. These are the same rows that the Unreal Data Tables import (see [UnrealDataSetup.md](../docs/evilrise/UnrealDataSetup.md)).

## Play it

Serve this folder with any static web server and open `index.html`. For example:

```
cd web
python3 -m http.server 8000
```

Then open http://localhost:8000. three.js loads from the jsDelivr CDN. Opening `index.html` straight from disk will not work, because the browser blocks loading the data files from a `file://` page.

## Controls

| Key | Action |
|---|---|
| W A S D | Move |
| Mouse | Look |
| Shift | Sprint |
| C | Crouch (quieter, harder to see) |
| Right mouse | Aim |
| Left mouse | Fire |
| R | Reload |
| E | Interact, or tap E to break free when grabbed |
| F | Knife: a counter while grabbed, a finisher on a twitching body |
| Q | Quick turn |
| 1 / 2 | Pistol / shotgun |
| L | Flashlight |
| Tab | Inventory, files and herb mixing |
| M | Map |
| Space | Skip cutscene |

## What is in it

| System | File |
|---|---|
| Leon: health states and injuries that change movement, aim sway and posture; the infection meter, which lowers max health and is reset by the V-7 Suppressant | `src/player.js`, `src/humanoid.js` |
| Pistol and shotgun: spread, recoil, per-body-part damage, knockdowns, head destruction, shell casings, impacts | `src/weapons.js` |
| Husks (frail, normal, worker builds): sight cone, light and crouch affect detection, hearing, pathfinding, grabs, fake-dead ambush. The Reborn rule: an unfinished body twitches and rises with tentacles | `src/enemies.js` |
| The Hookman boss: hook throws, overreach when the hook bites steel, the weak point on his back, phase 2, crushed by the crane load | `src/enemies.js` |
| Tape 02:14: the security camera log that shows how the virus spread, filmed in the real yard at 8 fps with no audio | `src/tape.js` |
| Port layout: pier, dock office, Warehouse 3, break room, customs cage, control house, container yard and boat dock. Doors, shutters, gates, the gantry crane, rain | `src/level.js` |
| Story flow, documents, radio, the cage keypad (0214), the crane switches (3, 1, 2), the drop zone, cutscenes, relay-radio saves | `src/story.js` |
| HUD, inventory, map, keypad and crane panel | `src/ui.js` |
| Breakable crates with loot weighted toward what the player is short of, herbs, combining, 8-slot inventory | `src/items.js` |
