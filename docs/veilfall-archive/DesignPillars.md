# VEILFALL: Design Pillars

VEILFALL is an original third-person survival horror game for Unreal Engine 5. It uses the Resident Evil series as a reference for pacing and feel only. All names, characters, story, maps and assets are original.

## 1. What we learned from the Resident Evil series

| Game | Lesson we take | How VEILFALL uses it |
|---|---|---|
| RE1 / RE1 Remake | A building is a puzzle box. Keys come in families, saves are limited, item boxes are shared, and shortcuts loop back to safe rooms. | Each chapter is one connected space with key families (Medallion, Valve, Bell, Clearance) and shortcuts that unlock back to the safe room. |
| RE2 Remake | Over-the-shoulder camera, an unkillable stalker that forces you to plan routes, and a map that marks rooms red or blue. | Same camera style, the Revenant stalker from Chapter 2 on, and an auto-map with red/blue rooms. |
| RE3 Remake | Dodging, and a pursuer that comes back across the whole game. | Timed dodge/shove, and the Revenant returns in Chapters 2, 4 and 5. |
| RE4 / RE4 Remake | Precise gunplay, hit reactions by body part, knife parry, upgrades, a merchant, and varied locations chained by escapes. | Per-bone damage and staggers, a breakable knife with parry, upgrades at the Trader, and each chapter ends in an escape to a new place. |
| RE5 / RE6 | Big action set pieces wear out the horror if overused. | One set piece per chapter at most (boat chase, cable car, tower escape). |
| RE7 | Dread comes from vulnerability, scarce resources, and found footage. | Few resources, and "camcorder tapes" as playable flashbacks (one in Chapter 3). |
| RE Village | Themed areas, each with its own boss and lore, joined by a hub that opens up over time. | Every chapter has its own theme, boss, enemy twist and puzzle style. |
| RE9 Requiem | Photoreal lighting and a vulnerable lead. Tension matters more than action. | Lumen lighting, a flashlight-led look, and a protagonist who is not a soldier. |

## 2. Core pillars

1. **Investigate first, fight second.** The player pieces the truth together from files, audio logs, environmental storytelling and cutscenes. Every chapter answers one question and raises the next.
2. **Scarcity and choice.** Ammo, healing and inventory space are always tight. Avoiding a fight is often the smart move.
3. **Stealth, escape and combat all matter.** Each chapter has at least one stealth section, one chase and one forced fight. Stealth turns into combat when the player is spotted.
4. **Places that open up.** Locked doors, shortcuts and puzzles gate progress. The key item is always in a special room that you reach by solving the chapter.
5. **Physical realism.** Movement shows health and injuries, guns have weight and recoil, and enemies react to where they are hit.
6. **Cinematic storytelling.** In-engine cutscenes at every major beat, with subtitles and skip after the first view.

## 3. Design rules

- **Key items never come from crates.** Crates hold herbs, ammo, gunpowder, bandages and money. Story keys sit in special rooms.
- **Every lock is foreshadowed.** The player sees a locked door or a puzzle before finding its solution.
- **Every chapter has three things:** a safe room near the start, a shortcut back to it, and a save point before the boss.
- **Readable threats.** Each enemy type has a sound cue and a silhouette the player learns.
- **No dead ends without a reason.** If a path is blocked, a file or the environment says why.
- **Respect the player's time.** Puzzles have hints in files. A puzzle failure costs time or resources, never progress.
- **Fair difficulty.** Loot from crates leans toward what the player is short of (dynamic loot), within limits set by difficulty mode.

## 4. Pacing curve for each chapter (20 to 30 minutes)

```
Tension
  ^                                              BOSS
  |                               chase     /\    /\
  |              first     stealth   /\    /  \  /  \   escape
  |   arrival    threat     /\      /  \  /    \/    \  /\
  |  /\    explore  /\     /  \    /    \/            \/  \
  | /  \  /\    /\ /  \   /    \  /                        \  safe
  |/    \/  \  /  V    \ /      \/                          \__room
  +-----------------------------------------------------------------> Time
     cutscene  files   puzzle  safe room  special room   cutscene
```

The rule is quiet, rising, spike, then release. Safe rooms come right after a spike.

## 5. Player experience goals

- **Minutes 0 to 10:** confusion and dread. Who is still alive, and what happened here?
- **Chapter 1:** learn the basics (stealth, shooting, herbs, puzzles) in a place that feels familiar but wrong.
- **Chapters 2 and 3:** the world gets bigger and stranger, and the stalker makes safe places feel unsafe.
- **Chapter 4:** the story turns. A betrayal and the truth about the outbreak come out.
- **Chapter 5:** the player has the tools and knowledge to fight back, and the final boss tests everything they have learned.

## 6. Out of scope for the first 2-hour build

- Multiplayer or co-op
- First-person mode
- Open world
- Procedurally generated levels
