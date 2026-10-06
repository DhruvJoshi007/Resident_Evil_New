# VEILFALL: Asset List

Everything the first 5 chapters need, with the suggested source and the folder it goes in. **Priority:** P1 = needed for the Chapter 1 playable build, P2 = needed for Chapters 2 to 5, P3 = polish.

Sources are explained in `/mnt/project-files/game-prompt/game-prompt.md`, Part 2. Record every asset you import in [AssetCredits.md](AssetCredits.md).

**Formats:** FBX for anything rigged or animated. FBX, glTF or USD for static meshes (turn on Nanite for high-poly ones). PBR textures: Base Color, Normal, and packed ORM.

All rigged humans and monsters should be retargetable to the **UE5 Mannequin skeleton** so they can share animations.

---

## 1. Characters
Folder: `Content/Veilfall/Characters/`

| Asset | Priority | Suggested source | Notes |
|---|---|---|---|
| Mara Kessler | P1 | MetaHuman | Search-and-rescue jacket, cargo pants, boots, a holster rig. Needs wet and bloody material variants. |
| Theo Kessler | P2 | MetaHuman | Lab coat over a hoodie. A "captive" variant that is pale, with IV marks. |
| Owen Pike | P3 | MetaHuman | Only seen in a photo and in the C1-03 radio portrait. |
| Dr. Ilse Brandt | P2 | MetaHuman | Lab coat, glasses. |
| Julian Crane | P2 | MetaHuman | Tactical gear. A "bitten" variant for C5-03. |
| Adrian Veyl (human) | P2 | MetaHuman | Tailored suit, later a lab coat. A younger version for the C3-03 tape. |
| Generic civilians, police, staff (10+) | P1 | MetaHuman presets | Bases for the infected. |
| Veyl soldier | P2 | Fab tactical soldier pack | Gas mask, armour, with helmet variants. |

## 2. Enemies
Folder: `Content/Veilfall/Enemies/`

| Asset | Priority | Suggested source | Notes |
|---|---|---|---|
| Shambler zombie (6+ variants) | P1 | MetaHuman civilians + rot skin textures and wound decals, or a Fab zombie pack | Needs dismemberable limbs (head, arms, legs as separate meshes or masked bones). |
| Listener | P2 | Fab creature pack or custom | Tall, eyeless, with an exposed throat. |
| Larvae | P2 | Fab insect/parasite pack | Small, swarm-friendly, low poly. |
| Crawler | P2 | Zombie pack with legless variant | Uses crawling animation set. |
| Village Elder | P2 | Custom MetaHuman, gaunt and tall | Fisherman's coat, anchor chain prop. |
| Runner | P2 | Zombie pack with sprint animations | Hospital gown variant. |
| The Revenant | P2 | Fab or custom (2.4 m armoured figure) | Containment suit plus a "broken suit" final form showing the core. |

## 3. Bosses
Folder: `Content/Veilfall/Enemies/Bosses/`. These usually need custom sculpts (ZBrush or Blender, textured in Substance Painter) or a freelancer.

| Boss | Priority | Notes |
|---|---|---|
| The Warden | P1 | A large guard with a riot shield fused to his arm, and back growths as weak points. Shield must detach. |
| The Mother | P2 | A static, tank-fused mass with 4 destructible sacs. |
| The Fisherman | P2 | Amphibious, with a harpoon arm and gills. Swim animations. |
| Twin Surgeons | P2 | Two fused torsos that can split into one. |
| Adrian Veyl, Bloom forms | P2 | Phase 2 humanoid with growths, and a phase 3 giant mass fused to the dispersal tower. |

## 4. Animations
Folder: `Content/Veilfall/Characters/Animations/`

| Set | Priority | Suggested source |
|---|---|---|
| Locomotion with Motion Matching | P1 | UE5 Game Animation Sample (free) |
| Injured locomotion: limp, hunched, hand on wound | P1 | Mixamo, ActorCore, or your own capture with Rokoko Video |
| Weapon handling: aim, fire, reload (handgun, shotgun, rifle, SMG, magnum, launcher) | P1 to P2 | Comes with Fab weapon packs; otherwise ActorCore |
| Healing, item pickup, door opening, vault, climb, squeeze, push | P1 | Game Animation Sample, Mixamo |
| Hiding: enter/exit locker, under bed | P2 | ActorCore or custom |
| Zombie: walk, lunge, grab, bite, eat, get up, crawl, death | P1 | Mixamo (free zombie set) or a Fab zombie pack |
| Grab struggle, knife counter | P1 | Custom or ActorCore |
| Boss animations | P2 | Usually come with custom boss models |
| Cutscene performance (facial and body) | P3 | MetaHuman Animator (iPhone or webcam) + any mocap |

## 5. Weapons
Folder: `Content/Veilfall/Weapons/`

| Weapon | Priority | Chapter | Notes |
|---|---|---|---|
| Combat knife | P1 | Start | Breakable. |
| 9 mm handgun | P1 | Start | Separate slide, magazine and trigger meshes. |
| Pump shotgun | P1 | 1 | Separate pump and shells. |
| Hunting rifle (bolt action, scope) | P2 | 2 | Separate bolt. |
| Grenade launcher (single-shot) | P2 | 3 | Acid, flame and vaccine round variants. |
| SMG | P2 | 4 | |
| Magnum revolver | P2 | 5 | Swing-out cylinder. |
| Flash grenade, frag grenade | P1 | 1 | |
| Attachments: scope, laser, stock, extended magazine | P3 | | |
| Bullet casings, magazines, shells (physics props) | P1 | | |

Suggested source: one realistic firearm pack on Fab that includes animations and sounds.

## 6. Environments
Folder: `Content/Veilfall/Environments/<Chapter>/`

| Environment | Priority | Suggested source |
|---|---|---|
| Rainy city street with barricades, burning cars, a bus | P1 | Fab modular city pack + Megascans debris |
| Police station / courthouse interior (lobby, offices, archives, statue hall, cell block) | P1 | Fab police station or modular old building pack |
| Sewers (Victorian brick tunnels) | P2 | Fab sewer pack |
| Water treatment plant (tanks, pipes, control room, docks) | P2 | Fab industrial pack |
| Fishing village, church, crypt, lighthouse, pier | P2 | Fab coastal village pack + Megascans rocks and cliffs |
| Underground lab (Station Zero) | P2 | Fab sci-fi or abandoned lab pack |
| Hospital (wards, pharmacy, operating theatre, records, rooftop) | P2 | Fab abandoned hospital pack |
| Corporate tower (atrium, offices, server hall, executive lounge, bio-lab) | P2 | Fab modern office pack + sci-fi lab pack |
| Skyboxes and HDRIs (night storm, foggy dawn, dawn clear) | P1 | Poly Haven (CC0) |
| Surface textures (concrete, brick, tile, wet asphalt, rust) | P1 | Megascans, Poly Haven, ambientCG |

## 7. Props
Folder: `Content/Veilfall/Props/`

| Prop | Priority | Notes |
|---|---|---|
| Breakable wooden crate | P1 | Chaos Geometry Collection, plus 2 variants (box, barrel). |
| Item box, save point (an old radio recorder) | P1 | Original design. |
| Herbs (green, red, blue) in pots | P1 | |
| First-aid spray, bandages, gunpowder, ammo boxes | P1 | |
| Keys: medallions (lion, owl, serpent), valve handle, keycards, crypt key, clearance cards (red, blue, gold) | P1 to P2 | |
| Puzzle props: statue, fuse box, pipe tiles, bells, harbour clock, lens rings, X-ray light box, blood analyser, server racks | P1 to P2 | |
| Documents, audio log recorders, camcorder tapes | P1 | |
| Hiding spots: lockers, wardrobes, beds | P2 | |
| Doors: wood, metal, cell, double, locked variants | P1 | |
| Vehicles: rescue truck, motorboat, cable car, helicopter | P2 | |

## 8. Visual effects
Folder: `Content/Veilfall/VFX/`

Muzzle flashes, shell ejection, blood (sprays, pools, decals by surface), impacts per surface (concrete, wood, metal, flesh, water), rain and splashes, fire and smoke, explosions, larvae swarm, glowing contaminated water, dust in the flashlight beam, and the violet vaccine burst. Build these in Niagara, starting from Epic's free content and Fab packs.

## 9. Audio
Folder: `Content/Veilfall/Audio/`

| Category | Priority | Suggested source |
|---|---|---|
| Footsteps per surface, cloth, breathing (calm, tired, injured) | P1 | Sonniss GDC bundle |
| Guns: fire, reload, dry fire, shells, near and far | P1 | Weapon pack or Sonniss |
| Zombie vocals, creature roars, boss sounds | P1 | Fab horror audio or Freesound (check licences) |
| Ambience: rain, sewer drips, sea, hospital hum, server room | P1 | Sonniss, Freesound |
| Music: safe room theme, exploration, danger layers, chase, boss themes | P2 | A composer or licensed horror music packs |
| Voice acting for all characters | P3 | Voice actors (or temporary text-to-speech during development) |

## 10. UI
Folder: `Content/Veilfall/UI/`

Inventory grid, item icons (every item above), map, files reader, health state indicator (ECG-style, green/yellow/red), crosshair, ammo counter, subtitle font, title screen, pause menu, and settings. These are original 2D designs.
