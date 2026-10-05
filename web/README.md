# VEILFALL: browser build

A playable version of Chapter 1, Quarantine, built with three.js. It runs in any desktop browser with no install, so the story, systems and level can be played and tested before the Unreal Engine 5 build exists.

The 3D models are simple stand-ins built in code, and every texture and sound is generated at runtime, so the folder has no binary assets.

## Play it

Serve this folder with any static web server and open `index.html`. For example:

```
cd web
python3 -m http.server 8000
```

Then open http://localhost:8000. three.js loads from the jsDelivr CDN.

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
| E | Interact, and tap E to break free when grabbed |
| F | Knife, or knife counter while grabbed |
| Q | Quick turn |
| 1 / 2 | Handgun / shotgun |
| L | Flashlight |
| Tab | Inventory, files and herb mixing |
| M | Map |
| Space | Skip cutscene |

## What is in it

| System | File |
|---|---|
| Health states (Fine, Caution, Danger) and injuries (leg, arm, bleeding) that change movement, aim sway and posture | `src/player.js`, `src/humanoid.js` |
| Handgun and shotgun: spread, recoil, per-body-part damage, knockdowns, decapitation, shell casings, impacts | `src/weapons.js` |
| Infected: sight cone, light and crouch affect detection, hearing, pathfinding, grabs, fake-dead ambush | `src/enemies.js` |
| The Warden boss: shield that blocks frontal fire, charge into walls to stun him, weak points, phase 2 | `src/enemies.js` |
| Breakable crates with loot weighted toward what the player is short of, herbs, combining, 8-slot inventory | `src/items.js` |
| Precinct layout, doors, locks, pathfinding grid, lighting, rain | `src/level.js` |
| Story, files, three medallion puzzles, fuse box, save recorders, cutscenes, sewer escape | `src/story.js` |
| HUD, inventory, map, keypad and breaker panels | `src/ui.js` |
