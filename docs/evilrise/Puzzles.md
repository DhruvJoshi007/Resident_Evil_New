# EvilRise: puzzle designs

Each puzzle: setup, clues, solution, failure state and the three-step hint system, plus a Blueprint build. Summary rows are in `DT_Puzzles`.


## Chapter 1: Port Halvern

Three puzzles, in the order the player meets them. The first is a code the chapter has already shown you. The second is an ordered input with a noise penalty instead of a fail screen. The third is a combat puzzle the boss fight is built around. None of them can be brute-forced quietly.

---

### 1. PZL_C1_CustomsCage — "When It Opened"

**Location:** LOC_C1_CustomsCage, a mesh-walled customs inspection cage off the warehouse apron.
**Reward:** WPN_Shotgun, AMMO_Shells ×8, ITM_Suppressant, NAR_C1_OrtizNotes.
**Sets:** FLG_C1_CageOpen.

#### Setup
A floor-to-ceiling steel mesh cage with one door on a four-digit keypad. Inside, lit by a single caged bulb: a federal hard case on a trestle, open and unpacked-from, and Ortiz's notebook weighted down by a magazine. The player can see the shotgun through the mesh from two rooms away, which is the whole point — the reward is visible before the lock is solvable.

Pruitt set this code himself yesterday evening. He assumed whoever came looking for his team would be federal, would find the dock office first, and would therefore have the number in their head before they ever reached the cage.

#### Clues

| Clue | Where | NAR id |
|---|---|---|
| The timestamp itself: 02:14 is the first stamp on the security footage | Dock office CCTV monitor | NAR_C1_Tape0214 |
| "CAGE = WHEN IT OPENED", gouged into the paint beside the keypad | On the cage frame, at the keypad | NAR_C1_PruittScratch |
| Ortiz explains Pruitt's reasoning in plain words: "he set the code to the timestamp" | Inside the cage *(confirmation only, read after solving)* | NAR_C1_OrtizNotes |
| A customs officer notes the code "is a date only four of us know" — tells the player the field is a time or date, not a badge number | Inspection slip pinned by the keypad | NAR_C1_CustomsSlip |
| Leon says the number out loud once, so players who skipped the tape still have it | After-tape radio exchange | RAD_C1_AfterTape_04 |

The chain is: tape gives the number → scratched note gives the rule for turning it into a code → slip tells you it's four digits of clock. Any two of the three are enough.

#### Solution
Enter **0214** on the keypad. The bolt throws, the cage door swings, and the caged bulb buzzes up to full.

#### Failure state
No lockout and no alarm — a wrong code just gives three flat error beeps and a red LED. But the keypad is *loud*: every wrong entry adds one to a noise counter, and at the third wrong entry two Husks are spawned at the warehouse apron door and set to investigate the cage. They keep coming at every third failure after that, so grinding codes costs ammunition rather than progress. The keypad itself never locks, because a locked-out player is a stuck player.

#### Hint system

| Step | Trigger | Line |
|---|---|---|
| 1 — vague nudge | 45 s in front of the keypad with no correct entry | RAD_C1_HintCage_01: "A customs cage is where they put the things they don't want walking off. Four digits, so it's a date or a time to somebody." |
| 2 — point at the clue | 90 s, or 2 wrong entries | RAD_C1_HintCage_02: "There's writing scratched by the keypad. Whoever set the code left you the sentence, not the number." |
| 3 — near-solution | 150 s, or 4 wrong entries, or player has left and returned to the cage twice | RAD_C1_HintCage_03: "When it opened. You watched it open. Put the time on the keypad — zero two one four." |

If the player somehow reaches the cage without `FLG_C1_TapeWatched`, hint 3 is replaced with "Go back to the office and watch the night log first. The number's on it." — we never hand out a code the player hasn't earned on screen.

#### Blueprint build
- Make an Actor Blueprint `BP_Keypad` with a `Code` string variable (default "0214"), an `Entry` string, an int `WrongCount`, and a `Name FlagToSet` variable so the same Blueprint serves Chapter 4's safe.
- Give it a Widget Component (3D, world space) for the keys. Each key button appends to `Entry`; when `Len(Entry) == 4`, compare to `Code`.
- On match: play `S_Keypad_Accept`, set the flag on `BP_GameFlags`, and drive the door with a Timeline on the mesh's relative rotation. On mismatch: play `S_Keypad_Reject`, clear `Entry`, `WrongCount++`, and if `WrongCount % 3 == 0` call `SpawnHuskWave` on the level's `BP_C1_Director` with the apron spawn tag.
- Keep a `HintTimer` that starts on overlap of a trigger sphere and stops on match, and have it fire the three radio lines off a switch on an int. Reset the timer, not the count, when the player walks away.

---

### 2. PZL_C1_CranePower — "Whoever's On Now"

**Location:** LOC_C1_ControlHouse, the crane control house at the head of Yard C.
**Reward:** yard power — opens the yard gate motor and wakes the yard crane (which the boss arena needs).
**Sets:** FLG_C1_PowerRestored, FLG_C1_YardGateOpen.
**Requires:** KEY_C1_Fuse.

#### Setup
A two-stage puzzle in one room. The gantry supply panel has an empty 400 A fuse carrier, so nothing in the control house does anything at all until the player has been to the break room. Once the cartridge is seated, three brass-plated toggle switches labelled **C1 / C2 / C3** go live under a main breaker the size of a toaster.

The three switches must be thrown in start-up order. The order is not written anywhere as "3, 1, 2" — it is written as a *rule* on the break room rota board, and the player has to apply the rule to the time of night. It is 22:30 to 00:40 for the whole of Chapter 1, so nights is the shift on duty.

#### Clues

| Clue | Where | NAR id |
|---|---|---|
| The rota: Crane 1 = day, Crane 2 = swing, Crane 3 = night, plus the rule "bring up whoever's on shift now, then the next shift round the clock, then the last" | Rota board, break room wall | NAR_C1_ShiftRota |
| "Fuse lives in the cabinet in here, NOT in the control house, because the control house floods" | Taped under the rota board | NAR_C1_ShiftRota |
| The empty carrier and its stencil, plus the brass C1/C2/C3 plate, and the note that the gate motor is on the same bus | Control house panel | NAR_C1_FusePlate |
| The breaker penalty, spelled out before the player can trigger it: it bangs, it brings company, wait thirty seconds, then do it in order | Taped above the breaker | NAR_C1_BreakerNote |
| Varga's cab recorder puts him on nights at 02:16, confirming Crane 3 is the night gantry from a second source | Break room, cab recorder tape | NAR_C1_VargaLog |
| A wall clock in the control house reads 22:4x, so "now" is unambiguous | Control house set dressing | — |

#### Solution
Seat KEY_C1_Fuse in the carrier, then throw **C3, then C1, then C2**.
Nights (C3) is the shift on duty at 22:40. Round the clock from nights brings you to day (C1), then swing (C2).

#### Failure state
A wrong order trips the main breaker. Everything that just lit goes out, there is a bang like a shotgun in a stairwell, and three things happen: the switches lock out for 30 seconds (the breaker handle will not reseat before then, exactly as the note says), the player's noise radius spikes, and a wandering group of Husks is pathed to the control house door — two on the first trip, three on the second, four on the third and every trip after. The puzzle never fails permanently; it just gets progressively more expensive to keep guessing. There are only six permutations, so the design intent is that a guessing player survives the brute force but arrives at the Hookman low on ammunition and herbs, which is a worse punishment than a reset.

#### Hint system

| Step | Trigger | Line |
|---|---|---|
| 1 — vague nudge | 40 s at a dead panel with no fuse, or 60 s at a live panel with no correct input | RAD_C1_HintCrane_01: "Dead panel means a pulled fuse. Nobody keeps a spare in a shed that floods — try where they make tea." |
| 2 — point at the clue | 120 s with the fuse seated, or 1 breaker trip | RAD_C1_HintCrane_02: "Three switches, three cranes, and a supervisor who wrote the start-up order on the rota board. Whoever's on shift comes up first." |
| 3 — near-solution | 200 s, or 2 breaker trips | RAD_C1_HintCrane_03: "It's the middle of the night, Cater. Nights is Crane 3. Then round the clock — day, then swing. Three, one, two." |

Hint 1 is suppressed if the player already holds KEY_C1_Fuse; hint 2 is suppressed until the fuse is seated, so the hints never talk about switches the player cannot see yet.

#### Blueprint build
- Make an Actor Blueprint `BP_ThreeSwitchPanel` with an array of ints `Entered`, a hard-coded `Solution` array `[3, 1, 2]`, a bool `bFusePresent`, and an int `TripCount`.
- Each switch is a Child Actor of type `BP_LeverSwitch` with an int `SwitchIndex`. Its interact event calls `SubmitSwitch(SwitchIndex)` on the parent panel, but only when `bFusePresent` is true — otherwise play a dead-click sound and nothing else.
- In `SubmitSwitch`, add the index to `Entered`, then compare `Entered` element-by-element against the first N elements of `Solution`. Mismatch → `TripBreaker()`. Match with `Len(Entered) == 3` → `OnSolved()`.
- `TripBreaker()`: clear `Entered`, `TripCount++`, play `S_Breaker_Trip`, disable the switches for 30 s with a Timer, call `ReportNoise(Location, 4000)` on the AI perception system, and spawn `Min(TripCount + 1, 4)` Husks at the tagged door spawns.
- `OnSolved()`: set `FLG_C1_PowerRestored` and `FLG_C1_YardGateOpen`, drive the yard flood lights on with a Timeline, play the gate motor Timeline, and enable `BP_YardCrane` so the hanging container exists before the player can reach the yard.
- The fuse goes in via an interact on the carrier that checks the inventory for `KEY_C1_Fuse`, removes it, sets `bFusePresent`, and swaps the carrier mesh for the loaded version.

---

### 3. PZL_C1_DropZone — "Don't Stand on the Stripes"

**Location:** LOC_C1_Yard, the hazard-striped square beneath the yard crane's hook block.
**Reward:** two large chunks of the Hookman's health, and a stagger long enough to use the shotgun on his back.
**Sets:** FLG_C1_DropUsed.
**Requires:** FLG_C1_PowerRestored (no power, no crane, no hanging container).

#### Setup
This is the arena trick, written as a puzzle because the player has to work out three things in the middle of a boss fight: that the hanging container is a weapon, that the lever at the crane leg is what drops it, and that the Hookman has to be standing on the painted square when it comes down. He will not walk onto the square on his own. The player has to make him — by standing on it and moving off late, or by baiting a hook throw from the far side so he closes across it.

The lever has **two uses**. After the second, the hook block is empty and the fight finishes the honest way: bait the hook into steel, shoot the exposed growth on his back during the ~2.5 s he spends overreaching.

#### Clues

| Clue | Where | NAR id |
|---|---|---|
| The safety sign: stripes mean a suspended load, the lever is at the crane leg, "two cans per shift. then you're hanging nothing" | Bolted to the crane leg beside the lever | NAR_C1_DropZoneSign |
| Varga's own last note: "Don't stand on the stripes." | Pinned in the crane shed, readable before the fight | NAR_C1_VargaNote |
| The hook block and its slung container, groaning audibly and swinging ten centimetres, framed in its own insert shot | CS_C1_HookmanIntro, shot 3 | — |
| The lever has a lit indicator with two bulbs; one goes out per use, so remaining uses are readable at a glance | Crane leg set dressing | — |

#### Solution
Get the Hookman fully inside the hazard square, then pull the lever at the crane leg. The container drops, pins him, and leaves him on one knee with the growth on his back fully exposed for about 6 seconds. Repeat once. After that, the lever is dead and the fight is decided on hook baiting alone.

#### Failure state
Pulling the lever while he is off the square wastes one of the two uses — the container slams down on empty concrete, and the indicator loses a bulb. Nothing else bad happens, which is deliberate: the punishment is a resource, not a death. Standing on the square yourself when it drops is an instant kill, and the sign, the note and the lit stripes all say so three times before the player gets the chance.

#### Hint system

| Step | Trigger | Line |
|---|---|---|
| 1 — vague nudge | 20 s of fighting | RAD_C1_HintHookman_01: "Don't trade with him. He's got twelve feet of reach and you've got a handgun." |
| 2 — point at the clue | 60 s of fighting, or after he completes two hook throws | RAD_C1_HintHookman_02: "He throws that hook and when it bites steel instead of you, he can't let go. Watch his back when he's pulling." |
| 3 — near-solution | 110 s of fighting, or Leon drops to Danger health, or the player walks within 2 m of the lever twice without using it | RAD_C1_HintHookman_03: "There's a container hanging over those painted stripes and a lever at the crane leg. Get him on the stripes and pull it." |

#### Blueprint build
- Make an Actor Blueprint `BP_DropZoneLever` with an int `UsesLeft` (default 2), an Object Reference to `BP_YardCrane`, and a Box Collision `ZoneCheck` sized to the painted square and placed on the concrete.
- On interact: if `UsesLeft <= 0`, play a dead-clunk and return. Otherwise `UsesLeft--`, update the two indicator bulbs' emissive, and call `DropLoad()` on `BP_YardCrane`.
- `DropLoad()` runs a short Timeline that moves the container mesh down over 0.35 s, then does a `GetOverlappingActors` on `ZoneCheck`: any actor of class `BP_Hookman` gets `ApplyDamage` plus a `SetPinned(true)` that plays `AM_Hook_Pinned` and sets a bool `bWeakPointExposed` for 6 s; the player pawn gets a kill. Then play the impact camera shake and the Chaos dust field.
- Keep the weak point as a separate Capsule Component on the Hookman's back socket with its own damage multiplier — 4× while `bWeakPointExposed`, 1× otherwise — so the same component serves both the drop stagger and the hook-overreach window.
- The overreach window is a notify in `AM_Hook_ThrowMiss`: set `bWeakPointExposed` true on the notify begin, false on notify end, length 2.5 s.


## Chapter 2: Saltmere Island

Three puzzles. Two are locks (the organ, the lens) and one is an arena mechanic under fire (the sluice gate). All three clues chains are closed: nothing in this chapter can be solved by guessing, and nothing can be made unsolvable by missing a pickup, because every number appears in at least two documents.

Numbers used in this chapter, in one place so nothing drifts:

| Thing | Value |
|---|---|
| Hymn 42 "Low Tide" pedal line | **D, G, E, D, A, D** (six pedals, left to right as written) |
| Lower mirror, chapel spire | **040** |
| Middle mirror, sluice gate housing | **115** |
| Upper mirror, drowned mooring stone | **250** |
| Mirror set order | lower, middle, upper (1, 2, 3) |
| Sluice capstan | **three** full turns against the stop |

---

### PZL_C2_OrganHymn: the chapel organ

#### Setup

The chapel nave is flooded to the second pew. The organ sits on a raised chancel platform, dry, and it is the only working machine on the island. Its two keyboards are swollen shut and will not depress at all; the foot pedal board still moves and each pedal has its note letter cast into the brass toe plate. Above the small pipes is a wooden shutter. The shutter runs on the same linkage as the bell tower door latch, which is how the bell ringers used to get in without disturbing a service, and it is where Dr. Calder hid the bell tower key three weeks ago.

Interacting with the pedal board opens a simple focus view: eight lettered pedals, A through G plus a low C, and a six-slot readout above them showing what you have entered so far.

#### Clues

| Clue | Where | NAR id |
|---|---|---|
| The pedal line itself: D G E D A D, printed over the words "Down go every dark anchor down" | Calder's cellar, oilcloth packet (this is the key item KEY_C2_HymnSheet) | NAR_C2_HymnSheet |
| Which hymn, and that it is six notes not five, and that the last note is a D again | Same packet, her diary page | NAR_C2_CalderDiary4 |
| Pedals only, the manuals are dead, and the shutter is on the bell tower latch linkage | Pinned to the organ bench | NAR_C2_VergerNote |
| Confirmation that 42 is "Low Tide" and nothing else is to be played | Hymn board by the chancel | NAR_C2_HymnBoard |

The sheet is the key item, so the player cannot reach the puzzle meaningfully without it: the pedal board is interactable before the sheet is found, but the readout stays blank and Leon says "Not without the music."

#### Solution

Press the pedals **D, G, E, D, A, D** in that order. On the sixth correct pedal the shutter draws back, the organ sighs out its remaining air, and the bell tower key is on a nail inside the pipe housing where Calder left it. Grants KEY_C2_BellKey, sets FLG_C2_OrganSolved.

#### Failure state

Not a game over, and never a lockout. A wrong pedal plays the flat chord: a huge, ugly, badly tuned blast that carries across the whole flooded street.

- Wrong pedal 1: flat chord, sequence resets to empty.
- Wrong pedal 2 (cumulative, in one visit): flat chord, and two Drowned come in through the flooded west porch and start wading up the nave. The player must deal with them before trying again, and the chancel platform is high ground, so this is a fight the player can win but will pay ammo for.
- Wrong pedal 3 and after: flat chord and a Drowned each time, capped at four alive at once so the nave never becomes unwinnable.

Dying in the nave respawns at the vestry safe room with the sequence reset. The sheet is never lost.

#### Hint system

| Step | Trigger | Line |
|---|---|---|
| 1, vague nudge | 60 seconds in the nave with the sheet in inventory and the puzzle untouched | RAD_C2_HintOrgan_01, Mara: "That organ's the only thing in the parish that still works. If the doctor hid something, she hid it in the thing nobody would dare touch." |
| 2, points at the clue | 2 failed attempts, or 150 seconds with the puzzle open | RAD_C2_HintOrgan_02, Mara: "Ignore the keyboards, they're swollen shut. The verger's note on the bench says pedals only, and the sheet from her cellar is the pedal line." |
| 3, near solution | 4 failed attempts, or 240 seconds with the puzzle open | RAD_C2_HintOrgan_03, Mara: "Six pedals, left to right as written: D, G, E, D, A, and D again. People drop the last one. Don't." |

Hints never repeat inside one visit, and the timer pauses while the player is in combat so they are not told the answer during a fight.

#### Blueprint build

1. Make an Actor Blueprint `BP_OrganPedalBoard`. Give it an array of names `Solution` set to `[D, G, E, D, A, D]`, an empty array `Entered`, and a reference variable `BellTowerKeyActor`.
2. Each pedal is its own child Actor `BP_OrganPedal` with a `Note` name variable and a box collision for the interact trace. On interact it calls `SubmitNote(Note)` on the parent.
3. In `SubmitNote`: if `Solution[Entered.Length]` equals the note, add it to `Entered`, play the pedal's pipe sound, and light that slot in the readout widget. If not, clear `Entered`, play `SC_Organ_FlatChord`, increment `FailCount`, and fire the `OnWrongNote` dispatcher.
4. Still in `SubmitNote`: if `Entered.Length` equals 6, play the shutter Timeline, set `FLG_C2_OrganSolved` on `BP_GameFlags`, and make `BellTowerKeyActor` visible and pickupable.
5. Bind `OnWrongNote` in the level Blueprint to a `SpawnDrowned` function that checks `FailCount >= 2` and counts live Drowned with `Get All Actors Of Class` before spawning, so the cap of four is respected.
6. Gate the whole focus view on `HasItem(KEY_C2_HymnSheet)`. If false, play Leon's "Not without the music" line and do not open the widget.

---

### PZL_C2_LensReveal: the lighthouse lens

#### Setup

The lamp room at the top of Saltmere Light. A three-panel catadioptric lens drum stands in the middle, each panel carrying a mirror on its own worm drive and its own brass bearing dial reading 000 to 355 in 5 degree steps. The drive spindles are seized with salt and have no handle: the keeper's crank has been down at the fish market since March, levering an ice chute. The service door is behind the keeper's framed chart on the curved wall, and it has no keyhole at all, because the latch inside its frame is a bimetal strip that releases when the concentrated beam warms it. Nobody built it that way on purpose; the deeper scratched line on the maker's plate says as much.

#### Clues

| Clue | Where | NAR id |
|---|---|---|
| The crank is at the market, not the lighthouse (points the player at the key item early) | Nailed inside cold store bay 3 | NAR_C2_MarketShiftNote |
| The order is always lower, middle, upper, and two of three bearings: spire 040, sluice 115. Third bearing scratched out. | Keeper's bearing book, chained to the lamp room desk | NAR_C2_KeeperLog |
| All three bearings including the missing one: spire 040, sluice 115, drowned mooring stone 250 | Chart table, harbor master's hut | NAR_C2_HarborChart |
| Dials read in 5 degree steps, no handle is supplied, and the service door is behind the chart with its latch on the light | Brass plate under the lens | NAR_C2_BrassPlate |

The deliberate design point: the lamp room alone cannot solve it. The third bearing is only in the harbor master's hut, which the player must visit anyway for the flare gun before the boss. So the route enforces the clue without a locked door.

#### Solution

With KEY_C2_LensCrank fitted, set **lower mirror 040, then middle mirror 115, then upper mirror 250**, in that order. The three beams gather into one bar on the worn brass patch under the chart, the bimetal latch drops, and the chart panel opens as a door. Sets FLG_C2_LensSolved and FLG_C2_StairOpen, and fires CS_C2_LighthouseReveal.

#### Failure state

No enemies up here and no death: the failure is mechanical and it costs time.

- A wrong bearing simply does nothing except move the beam onto bare wall. The player can re-dial freely.
- Setting a mirror out of order (touching the middle or upper spindle before the one below it is correct) shears the drive pin: the crank slips with a bang, that mirror's dial jams for 20 seconds, and all three dials reset to 000. Three shears in a row and the crank's lug bends, which adds a 4 second wind-up to every turn for the rest of the chapter. Annoying, never fatal, and it makes the keeper's warning feel earned.
- If the player somehow reaches the lamp room without the crank, the spindles will not move at all and Leon says "Needs the handle. Of course it does."

#### Hint system

| Step | Trigger | Line |
|---|---|---|
| 1, vague nudge | 60 seconds in the lamp room | RAD_C2_HintLens_01, Mara: "There's no keyhole on that service door, is there. So the lock isn't a lock, it's the light." |
| 2, points at the clue | 2 shears, or 150 seconds in the lamp room | RAD_C2_HintLens_02, Mara: "The keeper's book sets each mirror on a landmark, lower then middle then upper. His third bearing's scratched out, but the harbor master's chart has all three." |
| 3, near solution | 4 shears, or 240 seconds, and only if FLG_C2_BearingsKnown is true | RAD_C2_HintLens_03, Mara: "Lower to the spire, 040. Middle to the sluice, 115. Upper to the drowned mooring stone, 250. In that order or you'll shear the pin." |

If the player has not read the chart table, hint 3 is withheld and hint 2 repeats once, pointing at the hut by name. Mara is on a radio: she cannot know a number Leon has not read out.

#### Blueprint build

1. Make `BP_Puzzle_LighthouseLens` with three integer variables `Dial1`, `Dial2`, `Dial3` (all 0), an int array `Target` set to `[40, 115, 250]`, and an int `SolvedUpTo` that tracks how many mirrors are correctly set in order.
2. Each dial is a `BP_LensDial` child with an `Index` int. Interacting cranks it forward one step: `Dial = (Dial + 5) % 360`, then update the static mesh rotation and call `CheckDials` on the parent.
3. In `CheckDials`: if `Index > SolvedUpTo`, call `ShearPin(Index)` instead of checking. Otherwise, if the dial matches `Target[Index]`, increment `SolvedUpTo` and play the detent click.
4. `ShearPin` plays the bang, sets a bool `Jammed[Index]` true with a 20 second Delay to clear it, and sets `Dial1`, `Dial2`, `Dial3` and `SolvedUpTo` back to 0.
5. When `SolvedUpTo` reaches 3, play the lens drum Timeline, crossfade the sweeping Spot Light to the tight Spot Light aimed at the chart, then `Play` the Level Sequence for CS_C2_LighthouseReveal.
6. Gate every dial interact on `HasItem(KEY_C2_LensCrank)`, and gate hint 3 on `FLG_C2_BearingsKnown` so Mara never says a number the player has not found.

---

### PZL_C2_SluiceGate: taking the water away from the Brine Maw

This is the boss arena mechanic rather than a quiet lock, but it is designed as a puzzle: the answer exists in documents before the fight, and the fight is unwinnable without it.

#### Setup

The harbor basin is brim-full because the Harbor Board's pumps were switched off three days ago, which Calder worked out was deliberate: a full basin floods the Annex's lower doors and keeps the sealed building sealed. The Brine Maw lives in the basin. In deep water it is effectively invulnerable: it circles, strikes from below, and bullets vanish into it with no damage number at all, which teaches the lesson in about eight seconds.

The sluice capstan is on the west wall with an enamel notice bolted to it. Its wheel is not on it, because the wheel lives chained in the bell tower with the ringing gear, and because someone cut that chain three weeks ago on the night Calder drowned. The player therefore arrives with KEY_C2_SluiceWheel already in hand: the gate is the plan, not a scavenger hunt mid-boss.

#### Clues

| Clue | Where | NAR id |
|---|---|---|
| Three full turns against the stop, basin falls about 1.5 m, the wheel lives in the bell tower | Bolted to the capstan housing | NAR_C2_SluiceNotice |
| The pumps were turned off on purpose to keep the basin up, and somebody took the wheel off the capstan | Calder's dictaphone, cellar | NAR_C2_AudioLog_Calder |
| Flares were tried on it and "it does not like burning" | Card on the forced flare locker, harbor master's hut | NAR_C2_FlareLocker |
| The wheel was in the mud beside Calder's body and the chain was cut, not broken | Harbor master's log | NAR_C2_HarborLogDrowned |

#### Solution

Three stages, and the whole point is that the player cannot stand still.

1. **Ship the wheel** on the capstan (one interact, 2 seconds). The Maw's first pass is scripted to hit the dock behind Leon during this, so the player learns the rhythm without dying.
2. **Three turns, one per pass.** Each turn is a 4 second hold. The Maw circles the basin on a roughly 12 second loop and telegraphs its strike with the wake turning toward the west wall and a sub-bass rise. Holding the crank through a strike means taking the hit and being thrown off the capstan, which costs about a third of health and resets that turn's progress, not the whole count. Break off, move behind the capstan housing (hard cover, it cannot reach through it), let the pass go by, come back. Basin water level drops by a third per turn: this is the same `MPC_C2_Water` BasinHeight parameter as the intro cutscene, animated down in three steps over four seconds each.
3. **Beach and burn.** With the basin at mud, the Maw thrashes stranded in the shallows. It cannot turn its body, so the jaw hinge and the glowing sac behind it stay in view on its left flank. Two flare rounds into the sac, or six pistol rounds plus one flare, finish it. Shooting anything else still does nothing. Sets FLG_C2_MawDead and FLG_C2_CausewayOpen, which drains the causeway and opens the route to the lighthouse.

#### Failure state

- Fighting in deep water: zero damage, plus the Maw's grab from the dock edge, which is an instant kill if the player stands on the low planks for more than one pass. The low dock is explicitly a death zone and the stone quay is not.
- Being hit on the capstan: lose the current turn's progress and about a third of health, and the wheel does not fall off.
- Running out of flares: the pistol can finish the beached stage alone, but slowly, and the Maw works itself free and back into the remaining channel after 45 seconds, which re-floods it to one third and forces the player to re-crank one turn. A long fight is punished, never a dead save.
- Death respawns at the vestry safe room with the sluice turn count preserved, so a retry is a fight and not a chore.

#### Hint system

| Step | Trigger | Line |
|---|---|---|
| 1, vague nudge | 20 seconds of shooting the Maw in deep water for no damage | RAD_C2_HintSluice_01, Mara: "Shooting it in deep water is just noise. The basin is the only thing on your side down there, so change it." |
| 2, points at the clue | 45 seconds, or one death | RAD_C2_HintSluice_02, Mara: "The capstan is on the west wall with the notice bolted to it. Ship the wheel from the bell tower and it's three full turns against the stop." |
| 3, near solution | two turns done and 30 seconds of no progress, or two deaths | RAD_C2_HintSluice_03, Mara: "One turn per pass, that's all you get. When it beaches, the sac behind the jaw comes open. Put a flare in it." |

#### Blueprint build

1. In `BP_Boss_BrineMaw`, add a byte enum `Phase` with `DeepWater`, `Draining`, `Beached`. In `AnyDamage`, if `Phase` is not `Beached`, set damage to 0 and play the ricochet or splash effect, so invulnerability is one branch and not scattered through the AI.
2. Make `BP_SluiceCapstan` with an int `Turns` (0 to 3) and a bool `WheelFitted`. Interact needs `HasItem(KEY_C2_SluiceWheel)`; the first interact sets `WheelFitted`. After that, each interact starts a 4 second hold using an input-held Timeline that calls `TurnComplete` only if it reaches the end.
3. `TurnComplete` increments `Turns`, sets `MPC_C2_Water` parameter `BasinHeight` to `1.0 - (Turns / 3.0)` via a Timeline lerp, and plays the chain and gate audio. At `Turns == 3` it calls `SetPhase(Beached)` on the boss and sets `FLG_C2_SluiceClosed`.
4. For the interrupt, have the boss's strike montage fire an Anim Notify that calls `InterruptTurn` on the capstan if the player is inside its overlap sphere: stop the Timeline, launch the player with `Launch Character`, and apply damage. Do not decrement `Turns`.
5. In `Beached`, enable a separate `WeakPoint` collision component on the jaw mesh with a damage multiplier, and have it only accept damage tagged `Fire` for the big multiplier (flare rounds and burning spills, per Canon F5). Start a 45 second Timer that calls `SetPhase(Draining)` and raises `BasinHeight` to 0.33 if the player has not killed it, then requires one more turn.
6. Hints come from one `BP_HintDirector` actor that polls the boss's `Phase`, the capstan's `Turns`, a damage-dealt-with-no-effect counter and a death counter, then plays the matching `RAD_C2_HintSluice_` line once each. Reuse the same director for the organ and the lens so there is one place that owns escalation timing.


## Chapter 3: The Annex

Five designed encounters: three locks and two fights that are solved rather than won. All three locks are gates onto special rooms, so no key story item in this chapter is ever in an ordinary crate.

**The chapter's load-bearing number, stated once here so Chapter 5 can reuse it without guessing:**

> **The V-7 cold-shock ladder.** Four stages, in order, no stage skipped:
> **1. +4 °C, hold 90 s — 2. −12 °C, hold 30 s — 3. +4 °C, hold 60 s — 4. purge.**
> V-7's bonds fail in stage 2 and cannot re-form during stage 3. Skipping a stage lets them re-form stronger, so partial runs are worse than none.

It is written in `NAR_C3_TrialLog07` (Calder's sheet 07, in the B1 labs) and posted in short form on the whiteboard (`NAR_C3_Whiteboard`). Reading the log sets `FLG_C3_ColdShockKnown`. Chapter 3 uses it as the valve sequence that opens the cold vault. **Chapter 5's synthesis machine in the Crown Lab runs the same four stages with the same temperatures and the same hold times, and will not accept a batch unless `FLG_C3_ColdShockKnown` is set** — the player enters 4, −12, 4, purge on the machine's thermal dial exactly as they worked the valves here. Same numbers, same order, two chapters apart.

---

### PZL_C3_KeycardB2 — the dead card reader

**Setup.** The B2 bulkhead at the end of the B1 lab corridor is the only way down. Owen Quinn's Level B2 keycard (`KEY_C3_KeycardB2`, taken from his body in the flooded stairwell) swipes, the panel flashes orange, and nothing happens. The card is not the problem: the conduit plug in a grey wall box to the left of the frame has shaken loose, which the annex maintenance man complained about for months. The fix is to open the box, push the plug home until it clicks twice, then swipe. The reader then beeps loudly for ten seconds while it resets, and the beep draws two Husks from the far end of the corridor, so the player has to choose where to stand before they commit.

**Clues.**
- `NAR_C3_MaintNoteConduit` — Maintenance Snag List, pinned over the bench in the B1 labs, twenty metres back from the bulkhead. Names the grey wall box, the loose plug, the two clicks, and warns about the ten-second beep.
- The wall box itself: scuffed paint around the lid and a cable tail hanging out of the bottom, lit by a flickering orange standby lamp. Readable without any text.
- `NAR_C3_OrientationCard` (reception) establishes earlier that B2 is card-controlled, so the player already expects a card to be the answer and feels the fault rather than doubting the card.

**Solution.** Interact with the grey wall box → press the plug home (two taps of the interact key, with a click each) → swipe `KEY_C3_KeycardB2` at the reader → survive or avoid the ten-second reset → bulkhead cycles open. Sets `FLG_C3_B2Open`.

**Failure state.** No hard fail. Swiping while the plug is loose only wastes time and makes the panel chirp (a small noise ping on its own). If the player starts the reset and then runs, the bulkhead still opens, but the two Husks are now loose in the lab corridor behind them, which is a worse corridor to come back through. If the player is grabbed mid-reset the reset cancels and must be redone.

**Hints.** `RAD_C3_HintKeycard_01/02/03`, spoken by Mara in person.
1. After 60 s of failed swipes or idling at the reader: *"The card's good, I watched it light the panel orange. So it isn't the card."*
2. After 2 more failed swipes, or 120 s: *"There's a snag list back in the labs that moans about this exact reader. Grey wall box, left of the frame."* Also pings the note's position on the map.
3. After 3 failed swipes or 200 s: *"Open the box, push the loose plug in until it clicks twice, then swipe. And watch the corridor, the reset beeps for ages."*

**Blueprint build.**
1. Make `BP_CardReader` with a Boolean `bConduitSeated`, a Name variable `RequiredCard`, and a Spot Light child for the status lamp.
2. Make `BP_ConduitBox` with an int `ClickCount`. Each interact adds 1 and plays a click cue; at 2, set its owning reader's `bConduitSeated` to true via a direct Actor reference set in the level.
3. On `BP_CardReader` interact: if the player's inventory component has `RequiredCard` and `bConduitSeated` is true, start a 10 s Timer by Event and play the beep loop; otherwise flash the lamp orange and fire a Noise Event with a small radius.
4. On the timer finishing, call Open on the `BP_BulkheadDoor` reference and set the save-game flag `FLG_C3_B2Open`.
5. Put two sleeping `BP_Husk` actors at the corridor's far end and have the beep loop fire a Noise Event every 2 s, so the existing hearing-and-search AI brings them in without any bespoke code.

---

### PZL_C3_WhiteboardCode — the security office keypad

**Setup.** The security office in the B2 security wing is a special room behind a four-digit keypad. It holds the annex master key (`KEY_C3_MasterKey`), the chief's day book, and the shipment clearance with Hale's countersignature. The code is **0703**. The security chief refused to walk out to the corridor every time somebody forgot it, so he wrote a smug hint on a sticky note and stuck it on the whiteboard frame, which is the one place in the annex he knew staff stood around in.

**Clues.**
- `NAR_C3_Whiteboard` — the whiteboard itself, in the whiteboard bay, header line not wiped: `TRIAL 07 / RUN 03 — THERMAL`.
- `NAR_C3_ChiefSticky` — the sticky note on the board frame: *"Trial number, then run number. Two digits each, in that order. Four buttons."* 07 then 03 → **0703**.
- `NAR_C3_TrialLog07` reinforces the trial number: the sheet in the labs is numbered 07 and its ninth repeat is run 03 in its own header block. A player who reads the log first can solve the keypad the moment they read the sticky note.
- Keypad screen shows four blanks, so the digit count is never in question.

**Solution.** Enter `0703`. Door unlocks, sets `FLG_C3_OfficeCodeKnown` on reading the clues and `FLG_C3_HaleSignature` when the clearance sheet is picked up.

**Failure state.** Three wrong codes in a row trips the keypad's tamper buzzer: a 15 s lockout with a flat red screen, and the buzzer is a Noise Event that pulls the security wing's patrolling Brute toward the door. The code never changes and attempts are never capped, so the player cannot lock themselves out of the chapter — but a careless player fights a Brute in a corridor instead of avoiding it.

**Hints.** `RAD_C3_HintWhiteboard_01/02/03`.
1. 45 s at the keypad, or 1 wrong entry: *"Four digits and a note from a man who thought he was being funny. It's on the board."*
2. 2 wrong entries, or 120 s: *"Read the top line of the whiteboard, not the table. Trial number, then run number."*
3. 4 wrong entries, or 240 s: *"Trial seven, run three. Two digits each. Zero seven, zero three."*

**Blueprint build.**
1. Make `BP_Keypad4` with a String `EnteredCode`, a String `CorrectCode` (set to `0703` per instance, exposed on spawn), an int `WrongAttempts` and a Boolean `bLockedOut`.
2. Build the keypad face in a Widget Component so the buttons are 3D widget buttons; each button appends its digit to `EnteredCode` and plays a key cue.
3. When `EnteredCode` length hits 4, compare with `CorrectCode`: on match, call Unlock on a `BP_SpecialRoomDoor` reference and write the flag; on mismatch, clear the string, increment `WrongAttempts`, and fire a small Noise Event.
4. At `WrongAttempts` 3, set `bLockedOut` true, play the buzzer loop, fire a large Noise Event, then clear both with a 15 s Delay.
5. Drive the hint rows from a `BP_HintManager` that counts seconds in the keypad's trigger volume and `WrongAttempts`, and plays `RAD_C3_HintWhiteboard_0n` once each.

---

### PZL_C3_CoolantValves — flooding the cooling chamber

**Setup.** The cold vault door is an interlock, not a lock: it will not release until the cooling chamber next to it has been taken through a complete cold-shock ladder. The valve gallery above the chamber has three hand valves and one gauge, and a window down into the chamber so the player can see the water rise and the frost crawl up the glass. Two Drowned are lying in the chamber sump; stage 2 of the ladder kills them, which is the mechanical reward for doing it in order, and the reason the chamber is safe to walk through afterwards.

- **Valve 1 — BRINE INTAKE:** floods the chamber and pulls it to **+4 °C**.
- **Valve 2 — CRYO:** takes a *flooded* chamber to **−12 °C**. Does nothing on a dry chamber (handle will not turn, with a dull clunk).
- **Valve 3 — PURGE:** dumps the chamber to the sump and ends the run.
- **GAUGE:** chamber temperature, plus a green **HOLD** lamp that lights when the stage temperature is reached and goes dark when the hold time is served.

**Clues.**
- `NAR_C3_TrialLog07` (B1 labs) — the ladder itself: +4 hold 90 s, −12 hold 30 s, +4 hold 60 s, purge. This is the clue that matters, and it is also the Chapter 5 clue.
- `NAR_C3_Whiteboard` (whiteboard bay) — the same four stages as a table, plus the boxed line *"CHAMBER INTERLOCK WILL NOT RELEASE THE VAULT UNTIL ALL FOUR STAGES RUN IN ORDER. PURGE LAST."*
- `NAR_C3_ValveProcedure` (laminated card chained to the gallery rail) — maps the abstract ladder onto the three physical valves and explains the gauge and the HOLD lamp.

**Solution.** Open **Valve 1** and wait for the gauge to reach +4 °C, then wait for the HOLD lamp to go dark (hold served). Open **Valve 2**, down to −12 °C, wait for the lamp. Close **Valve 2** and reopen **Valve 1** to climb back to +4 °C, wait for the lamp. Open **Valve 3** to purge. The interlock thumps, the cold vault door cracks open, and `FLG_C3_ChamberFlooded` and `FLG_C3_ColdVaultOpen` are set. Hold times play at a quarter speed in game (roughly 22 s / 8 s / 15 s) so the lamp stays readable without the scene dragging; the documents keep the real figures because the documents are lab records.

**Failure state.** Purging early, opening cryo on a dry chamber twice, or turning a valve before its HOLD lamp goes dark trips the relief vent: live steam sprays across the gallery for 4 s (contact damage, Caution-level, with a screen whiteout), the gauge drops to ambient, and the whole run resets to stage 1. Unlimited retries, no item loss. A failed run also spawns one extra Drowned from the sump through the gallery stair, so repeated failure makes the room harder rather than just slower.

**Hints.** `RAD_C3_HintValves_01/02/03`.
1. On entering the gallery, or 60 s idle: *"The vault's holding its own door shut. It wants the chamber run properly first."*
2. First relief vent trip, or 150 s: *"That log you copied down. Four stages, plus four, minus twelve, plus four, purge. The gauge is the board, the valves are the pen."*
3. Second relief vent trip, or 300 s: *"Intake until the lamp dies, cryo until it dies, shut cryo and intake again until it dies, then purge. Purge last or the vent blows."*

**Blueprint build.**
1. Make `BP_CoolantValve` (an enum `EValveType` of Intake, Cryo, Purge, plus an On Turned event dispatcher) and place three of them, then make `BP_ChamberController` which binds to all three dispatchers.
2. In `BP_ChamberController`, hold an int `Stage` (0 to 4), a float `ChamberTemp`, a float `HoldRemaining`, and an array of structs describing the ladder: {TargetTemp 4, Hold 22}, {−12, 8}, {4, 15}, {Purge}. Keeping the ladder as data means Chapter 5's synthesis machine can read the same struct array.
3. On Tick, lerp `ChamberTemp` toward the open valve's target; when it is within 0.5 °C of the current stage target, light the HOLD lamp (a Material Parameter on the gauge mesh) and count `HoldRemaining` down; at zero, advance `Stage`.
4. If a valve is turned while `HoldRemaining` is above zero, or Purge is turned before `Stage` is 3, or Cryo is turned while a `bFlooded` Boolean is false, call a `TripReliefVent` event: play the steam Niagara and camera shake, Apply Damage in a box in front of the gallery, reset `Stage` to 0 and `ChamberTemp` to ambient, and spawn one `BP_Drowned` at the gallery stair marker.
5. When `Stage` reaches 4, raise the chamber water level with a timeline on the water plane, kill any `BP_Drowned` still inside with Apply Damage, set both flags, and call Unlock on the `BP_SpecialRoomDoor` for the cold vault.

---

### PZL_C3_WardenArena — gas, doors and a fuel line

**Setup.** The coolant plant floor is a square of four bays divided by **three yellow gas valves** on the bay walls and **four `BP_BlastDoor` blast doors** that the player can drop from wall levers, one per bay. Split coolant-gas lines mean gas pools at knee height and lies still unless a bay is sealed. The Warden walks, never sprints, and swings a torn bulkhead door as a weapon. His plate armour shrugs off pistol and rifle fire from the front; the one soft thing on him is a weeping fuel line under the back plate, and the only thing in the annex that can open that plate is a gas flash in a sealed bay.

**The loop, three times.**
1. Open a bay's gas valve. The bay fills over about 6 s (visible knee-high haze, HUD breath warning if Leon stands in it).
2. Get the Warden into that bay: he follows noise, so a shot at a pipe, a thrown `ITM_NoiseLure`, or simply standing there and stepping out works.
3. Pull the bay's blast door lever. The door drops, the gas is trapped with him, and the fuel dripping off his own back pack ignites it on the hot pipe run. A thump, not an explosion.
4. The blast buckles his back plate off. The fuel line is exposed for **4 s** (a bright wet highlight, plus a HUD weak-point reticle). Put rounds into the line. Three exposures kill him: each one costs him a third of his health and, after the second, he starts barricading one valve by standing on it, so the player has to use a different bay each time.

**Clues.**
- `NAR_C3_SecChiefLog` (security office) — *"Fuel pack's chafing where the plate sits."* Tells the player where his weakness is before the fight starts.
- `NAR_C3_ValveProcedure` and the yellow-and-black valve livery, plus hazard striping painted on each bay floor, so the arena reads as three kill boxes at a glance.
- Shot 7 of `CS_C3_WardenIntro` is a one-second insert on the weeping fuel line. The cutscene is the clue.

**Failure state.** Leon standing in a sealed bay when it flashes takes heavy damage and is knocked down (survivable from Fine, lethal from Danger). Dropping a blast door on an empty bay wastes that bay's gas: the valve needs 20 s to build pressure again. Running out of all three bays at once means a bare-knuckle phase of dodging until the first valve recharges, which is survivable but ugly. Death reloads to the arena entry, the doors re-open and the gas resets.

**Hints.** `RAD_C3_HintWarden_01/02/03`, Mara calling from cover.
1. 25 s of shooting the plate with no weak-point hit: *"Pistol's doing nothing to that plate. Use the room."*
2. 60 s, or after the first wasted bay: *"Yellow gas valves on the bay walls. Open one, get him standing in it, then drop the blast door on the bay."*
3. 100 s, or the first time the plate is stripped and the window is missed: *"The blast strips his back plate. There's a fuel line under it. Shoot the line while it's bare, you've got about four seconds."*

**Blueprint build.**
1. Make `BP_GasValve` with a float `Pressure` and a Boolean `bOpen`, and `BP_GasBay` holding a box volume, a Niagara gas system whose spawn rate is driven by a float parameter, a Boolean `bSealed` and an `Ignite` event.
2. `BP_BlastDoor` plays a timeline to drop, sets its bay's `bSealed` true, and on seal checks whether `BP_Boss_Warden` overlaps the bay volume; if it does, call `Ignite` after a 0.6 s delay.
3. `Ignite` plays the flash and Apply Radial Damage in the bay, then calls `StripBackPlate` on the Warden.
4. In `BP_Boss_Warden`, `StripBackPlate` hides the plate mesh, shows the `SM_FuelLine` weak-point mesh with its own collision channel, and starts a 4 s timer that hides it again. Damage on that channel multiplies by 10 and adds one to an int `PlatesBurst`.
5. At `PlatesBurst` 3, play the death montage, set `FLG_C3_WardenDead`, raise the blast doors, and open the collapsed wall into the sea cave.

---

### PZL_C3_UndertowRaft — the raft fight

**Setup.** A set-piece, not a free-roam fight. Mara rows and steers; Leon kneels at the bow with the rifle or the flare gun. The raft runs a spline through a field of rock pillars toward the cave mouth. The player's two jobs are **calling the turn** (left or right, which is the steering input, routed to Mara so that the call and the stroke are one action) and **shooting the eye** whenever the hooded ridge opens. Everything else is the Undertow's turn.

**Three phases.**
1. **The channel.** Pillars come at the raft in alternating pairs. The Undertow swims alongside and slaps with a tentacle; the eye surfaces to port or starboard for 3 s before each swing, and a hit there cancels the swing. Missing a pillar call costs the raft a third of its hull. Hull reaching zero ends the fight (fail state).
2. **The grip.** It coils one tentacle over the gunwale and holds the raft still, the eye closed behind the hide. The weak point is now the coiled arm, not the eye: five rifle rounds or one flare breaks the grip. Mara bails while gripped, so no steering is possible, and the hull takes slow damage until the arm is cut.
3. **The mouth.** It rises in the cave mouth across the whole channel, eye wide and fixed, and the current carries the raft at it whether the player fires or not. Sustained fire into the open eye over a 12 s window. Enough damage and it sinks under the raft and the current carries them out; not enough and it capsizes them, which is the fail state. A flare round in phase 3 counts for 4 rifle rounds.

**Clues.** Not a knowledge puzzle. `CS_C3_UndertowRising` shot 6 and shot 7 teach the eye as the target; `DLG_C3_SeaCave_03` ("Left and right, loud, and you don't argue") teaches the call-the-turn verb before the fight starts; `NAR_C3_SumpWarning`'s bitten float-switch chain and Mara's "nobody fishes it" line in `CS_C3_UndertowRising` shot 2 set up that something big lives out there.

**Failure state.** Hull at zero in phase 1 or 2, or not enough damage in phase 3, capsizes the raft: a short drowning cut and a reload to the phase start. Checkpoints at the start of each phase, because the fight is long and the chapter is nearly over. Ammunition is topped up at each checkpoint so a player cannot be left dry in a fight they cannot leave.

**Hints.** `RAD_C3_HintUndertow_01/02/03`, Mara over the oars.
1. 2 missed pillar calls: *"I can't steer and watch. Call it or we're on the rocks."*
2. 3 eye surfacings with no hit: *"It opens that eye before it swings. That's your window, not after."*
3. 8 s into phase 2 with the arm untouched: *"If it's got hold of the raft, shoot the arm, not the eye. Free us first."*

**Blueprint build.**
1. Make `BP_Raft` with a Spline Component reference, a float `SplineDistance` advanced on Tick, a float `LateralOffset` driven by the left and right input, and a float `Hull`.
2. Route the steering input through Mara: the input sets a target offset, and `BP_Mara_Companion` plays a left or right rowing montage while the raft lerps to it, so the stroke sells the call.
3. Make `BP_Boss_Undertow` with an enum `EPhase` and a Timeline per phase. In phase 1, a looping timer picks a side, shows the eye weak point for 3 s, then either swings (Apply Damage to the raft) or recoils if the eye was hit.
4. Pillars are `BP_RockPillar` actors placed along the spline with a trigger that compares the raft's `LateralOffset` sign to the pillar's side; a mismatch calls Damage Hull.
5. Store phase checkpoints with a Save Game object written on each phase change, and on death reload the raft's `SplineDistance`, `Hull` and the boss's phase from it. Set `FLG_C3_UndertowDead` when phase 3's health hits zero and play the sink montage.


## Chapter 4: Marrow Bay

The station is one three-step lock with a fourth, shorter puzzle in the boss arena. The three steps are deliberately a chain of **key, then authorisation, then knowledge**: a physical key found by reading a log, an electronic release found by matching a print, and a code that exists nowhere except inside the ledger's own numbers. Nothing in the chapter prints the safe code as a code.

Hints are Mara on the relay radio. She is in the lobby with the floor plan and the duty board in front of her, so she is allowed to know the building but not the answers; her third hint is always the one where she stops being polite about it.

---

### 1. PZL_C4_EvidenceKey — Ruiz's drawer

**Location:** LOC_C4_Archive

**Setup.** The evidence room door is a plain mortice lock and the key is not on the duty board where it belongs. The archive is a long room of rolling stacks with a personal records cabinet at the end: forty shallow drawers with brass letter plates, A at the top left to Z at the bottom right. Pulling a drawer takes a second and a half and makes noise, and there are two Husks in the stacks plus one twitching corpse that will rise as a Reborn if the player left it unfinished, so brute-forcing every drawer is punished without ever being forbidden.

**Clues.**

| Clue | Where | NAR id |
|---|---|---|
| Ruiz signed the evidence room key out at 01:12 and never returned it | Watch desk duty log, station lobby | NAR_C4_DutyLog |
| On camera, Ruiz walks into the archive, drops the key in "my drawer, my mess", and the cabinet's brass letter plates are clearly visible | Body camera clip B, played in the lobby | NAR_C4_RuizCamB |
| One drawer per officer, filed by surname letter; the drawers do not lock | Index card screwed to the side of the cabinet | NAR_C4_ArchiveIndex |
| She kept the key on her because she had written the port up against orders | Unsent letter in her jacket, optional | NAR_C4_RuizLetter |

**Solution.** Open drawer **R**. Inside: a court diary, a packet of cigarettes, and KEY_C4_EvidenceKey.

**Failure state.** No hard failure. Each wrong drawer costs noise: the first two wrong pulls raise the Husks' hearing check, the third brings both of them to the cabinet, and the twitching corpse rises on the fourth. The key is never consumed or moved, so the player cannot lose the chapter here.

**Hint system.**

1. After 60 s in the archive with no drawer opened: *"Nobody hid that key, Leon. Somebody filed it. Think like the woman who filed it."* (RAD_C4_HintEvidenceKey_01)
2. After 2 wrong drawers, or 2 min: *"The duty log has her name on the evidence key at one twelve, and the cabinet card says one drawer per officer, by surname."* (RAD_C4_HintEvidenceKey_02)
3. After 4 wrong drawers, or 3 min 30 s: *"Ruiz. R. Pull the R drawer and stop being thorough about it."* (RAD_C4_HintEvidenceKey_03)

**Blueprint build.**

- Make `BP_RecordsCabinet` with a Child Actor array of 40 `BP_RecordsDrawer` actors, each holding a Name variable `DrawerLetter`.
- In `BP_RecordsDrawer`, on Interact, play a one-second timeline that slides the mesh on X, then fire `ReportNoise(Loudness 0.4)` into your AI perception stimulus.
- Give the cabinet a Name variable `CorrectLetter` set to `R` in the level, and an int `WrongPulls`. On a drawer open, compare letters: on a match, Add Item `KEY_C4_EvidenceKey` and set `FLG_C4_EvidenceKeyFound`; otherwise increment `WrongPulls`.
- Drive the hints from `WrongPulls` and a Timer: on a Set Timer by Event of 60 s, call `RequestHint(PZL_C4_EvidenceKey, Level)` on your radio manager, raising Level each time.
- Keep the key as an inventory grant from the drawer, not from the hint, so the third hint only tells the player the answer, it does not hand it over.

---

### 2. PZL_C4_PrintMatch — the court seal on locker 17

**Location:** LOC_C4_DetectiveOffice (the pad) and LOC_C4_EvidenceRoom (the locker)

**Setup.** Locker 17 in the evidence room holds the ledger under a court seal. The seal is an electronic bolt and the intake sheet says plainly that it only releases from the CID desk terminal upstairs, with an authorised print. On the desk is a PrintLock 2 pad, a wake screen that advertises the last print it accepted, and a quick guide taped to the monitor. In the evidence room the player picks up KEY_C4_PrintCard: one plastic sleeve holding three booking print cards. The puzzle is choosing which card to lay on the glass.

**Clues.**

| Clue | Where | NAR id |
|---|---|---|
| The bolt releases only from the CID desk, with an authorised print | Intake sheet on locker 17 | NAR_C4_EvidenceIntake |
| How the pad works, and that it matches on pattern **and** ridge count, with a three-try lockout | Guide taped to the monitor | NAR_C4_PrintLockManual |
| The pad's last accepted print: right index, WHORL, ridge count 14, accepted 14 Sep | Terminal standby screen | NAR_C4_DeskLog |
| The three cards and their classifications: Marsh LOOP 9, Ferris WHORL 14, unknown male ARCH 11. Ferris was booked on 14 Sep on a complaint that was withdrawn the same day | The card sleeve itself | NAR_C4_FerrisBookingCard |
| Ferris is the detective who sealed the locker, and Hale had him printed last month | Ferris's memo to the prosecutor | NAR_C4_FerrisMemo |

**Solution.** Lay **card 2, FERRIS, M.** on the glass. Whorl and 14 both match the registered print, and the dates line up: the seal was registered at 16:52 on 14 Sep, the same day Hale had Ferris booked. The terminal drops the bolt on locker 17; the player walks back down and opens it by hand for KEY_C4_Ledger.

**Failure state.** A wrong card is read and rejected. Three wrong reads lock the pad for 90 seconds and sound the desk alarm, which spawns two Husks into the CID corridor and makes the walk back to the evidence room hostile. The lockout expires on its own, so the puzzle cannot dead-end; the cost is ammo and noise. Walking down to the locker before the release just shows the red bolt lamp and a line from Leon.

**Hint system.**

1. After 45 s at the pad: *"A sealed locker that only opens from a desk upstairs. Somebody wanted exactly one person able to open it."* (RAD_C4_HintPrint_01)
2. After 1 wrong read, or 1 min 30 s: *"The pad is telling you what it will accept. Right index, whorl, fourteen ridges. You're carrying three cards, read the tops of them."* (RAD_C4_HintPrint_02)
3. After 2 wrong reads, or 3 min: *"The detective's own card. Ferris. Hale had him printed to scare him and left the one print that opens his own locker sitting in evidence."* (RAD_C4_HintPrint_03)

**Blueprint build.**

- Make a Struct `S_PrintCard` with: Name `Owner`, Enum `Pattern` (Loop / Whorl / Arch), Int `RidgeCount`. Make an Enum asset `E_PrintPattern` first.
- `KEY_C4_PrintCard` is one inventory item that carries an array of three `S_PrintCard` entries, so the player never juggles three items.
- Make `BP_PrintLockPad` with its own `S_PrintCard RegisteredPrint` (Whorl, 14) set in the level. On Interact, open a small widget listing the three cards; the widget's button index returns the chosen struct.
- Compare `Pattern` and `RidgeCount`. On a match, set `FLG_C4_LockerReleased`, play the accept beep, and call `ReleaseBolt()` on the `BP_EvidenceLocker17` actor through a direct Actor reference set in the level details panel.
- On a mismatch, increment `WrongReads`; at 3, disable input on the pad with a 90 s Set Timer by Event and call `SpawnAlarmHusks()` on the level blueprint.

---

### 3. PZL_C4_SafeCode — what cleared, oldest first

**Location:** LOC_C4_ChiefOffice

**Setup.** Behind a hinged panel of oak veneer beside the chief's desk is a four-digit dial safe. Inside are WPN_Revolver, a box of rounds, and a brass maintenance key tagged INTERCEPTOR, which is the only way out of the station. The code is never written anywhere. It is a reading rule applied to the ledger the player is already carrying.

**Clues.**

| Clue | Where | NAR id |
|---|---|---|
| The ledger: six dated transfers with references, amounts and a CLEARED or RETURNED status | KEY_C4_Ledger, from locker 17 | NAR_C4_Ledger |
| The rule: not the dates, not the references; the money that stayed, the lead figure off each one, oldest first, four digits | Inside the back cover of Hale's desk diary | NAR_C4_HaleRule |
| Corroboration that exactly four of the six cleared, so the player knows the code is four digits before they count | Ferris's memo to the prosecutor | NAR_C4_FerrisMemo |

**Derivation.** From the ledger, the four CLEARED rows in date order are 02 Apr $**7**,500, 19 May $**2**,000, 23 Aug $**4**,000, 14 Sep $**1**,500. Lead figure of each, oldest first: **7 2 4 1**. The two RETURNED rows (11 Mar $8,000 and 07 Jul $9,250) are the decoys, and a player who ignores the status column gets 8 7 2 9 4 1, which is six digits and will not fit the dial. That wrong length is the designed teaching moment.

**Solution.** **7241.** Entering it sets FLG_C4_SafeOpen, which immediately triggers CS_C4_HaleConfession: Hale is in the chair by the window and speaks the code back at Leon before he can stand up.

**Failure state.** No lockout and no damage; a wrong code just clicks and resets the dial. The ledger stays in the inventory and is re-readable from the pause menu, so this puzzle can never be failed permanently. It can only be stalled, which is what the hints are for. If the player opens the safe without ever picking up the ledger, by guessing or by a second playthrough, the confession still fires, so the story cannot be skipped past.

**Hint system.**

1. After 60 s at the dial, or on the second wrong entry: *"He wrote a whole page about not writing it down. That page is the instructions."* (RAD_C4_HintSafe_01)
2. After 2 min, or 4 wrong entries: *"Not the dates, not the reference numbers. The money that stayed. Four of the six cleared, and he wants the first figure off each, oldest first."* (RAD_C4_HintSafe_02)
3. After 4 min, or 7 wrong entries: *"Seven thousand five, two thousand, four thousand, one thousand five. Seven, two, four, one. Try it."* (RAD_C4_HintSafe_03)

**Blueprint build.**

- Make `BP_DialSafe` with an Int array `Code` of length 4, set to 7, 2, 4, 1 in the level instance so no other designer has to open the blueprint.
- On Interact, show `WBP_FourDialEntry`: four scroll wheels, 0 to 9. Read the four ints out on confirm and compare the arrays element by element with a For Loop and a Break.
- On success: play the handle timeline, Add Item for `WPN_Revolver`, `AMMO_Revolver` and `KEY_C4_SewerKey`, set `FLG_C4_SafeOpen`, then call your cutscene manager's `Play(CS_C4_HaleConfession)`.
- On failure: play a reset sound, increment `WrongEntries`, and feed that int plus a 60 s timer into `RequestHint(PZL_C4_SafeCode, Level)`.
- Put the ledger text in the same `DT_Narrative` row the pickup reads, and let the pause menu's document list re-open it, so the player can always check the numbers without walking back.

---

### 4. PZL_C4_BasementPower — the live floor (boss arena trick)

**Location:** LOC_C4_Basement

**Setup.** The long store is flooded to thigh depth and the old floor conduit is cast into the slab and leaking. Two breaker panels, A and B, sit on the dry steel walkway above the water with a red interlock lamp between them. Thrown together, they energise the floor ring and anything standing in the water takes it. This is the only reliable way to open Chief Hale's chest cavity, which is otherwise guarded by his limbs.

**Clues.**

| Clue | Where | NAR id |
|---|---|---|
| Sump pump dead, floor conduit in the slab and leaking, wet floor goes live when the ring is energised, panels A and B must be thrown together or the interlock trips, and nobody stands on that floor when it is on | Maintenance board at the foot of the back stair | NAR_C4_BasementWork |
| Mara reads the red fault card and says out loud that he needs to be somewhere dry | RAD_C4_BasementWarn_02 and _03 | NAR_C4_BasementWork |
| Shot 9 of the mutation cutscene isolates both panels and the interlock lamp before control returns | CS_C4_HaleMutation | — |

**Solution.** Throw panel A, then panel B within 4 seconds, while Hale is standing in the water and Leon is on the walkway or the stair. The ring energises for 3 seconds: Hale's limbs lock back against his body in a rigid arch and the chest cavity stays open for about 5 seconds afterwards. Revolver rounds or a shotgun shell into the cavity is roughly a quarter of his health. Three cycles kills him, with the third usually landing while he is still staggered.

**Failure state.** Three ways to get it wrong, none of them unrecoverable. If the second panel is thrown more than 4 seconds after the first, the interlock trips, both levers spring back up and the panels need 12 seconds to reset. If Leon is standing in the water when the ring fires, he takes heavy damage and is stunned, which Hale will punish. If Hale is up on the concrete plinth at the far end rather than in the water, the ring does nothing and the player has burned a cycle: he is drawn back into the water by moving to the open floor, which is the risk the fight is built on.

**Hint system.**

1. After 45 s of the fight with no panel thrown: *"Leon, those panels on the walkway. Read the fault card again."*
2. After 90 s, or one tripped interlock: *"Both of them, together, or the interlock throws it back. And not while you're in the water."*
3. After 3 min, or two tripped interlocks: *"Get him out into the middle, get yourself on the walkway, then A and B straight after each other. His chest opens when the limbs pull in."*

**Blueprint build.**

- Make `BP_BreakerPanel` with a Bool `IsUp` and an Actor reference `Partner`. On Interact, set `IsUp` false, start a 4 s timer, and ask the partner whether it is also down.
- If both are down, call `EnergiseFloor()` on the level blueprint; if the timer finishes with only one down, play the trip sound, reset both panels, and disable Interact for 12 s.
- `EnergiseFloor()` does an Overlap check against the water volume: for every pawn inside it, apply damage. Test Leon's capsule against the same volume, so the rule is one piece of code for the player and the boss and cannot disagree with itself.
- On the boss, `EnergiseFloor()` plays the arched stun montage and sets `ChestOpen` true for 5 s. Gate the cavity's damage multiplier on `ChestOpen`, not on the montage, so a shot landing one frame late still counts.
- Light the ring with a cheap emissive decal on the water surface plus a Niagara sparks burst at the wall boxes. Do not try to light a flooded room with real lights for three seconds; it will cost more frames than the whole fight.


## Chapter 5: The Vigor Tower

Five puzzles, in the order the player meets them. Two of them are locks on the chapter's key items (components B and C), one gates the whole tower, one is the chapter's payoff, and the last one is the ending. The chain is deliberately a shape: every puzzle's clue is written by somebody who worked here and had no idea a federal agent would ever read it.

Mara delivers all hints over the radio. She is not in the building, so she can only reason from what Leon has read out to her — her hints never name something Leon has not seen.

---

### 1. PZL_C5_LiftOverride — the freight lift override

**Setup.** The tower is in level 3 containment. Passenger lifts are dead, the stairwells are shuttered, and the freight lift accepts a four-digit duty engineering override on a keypad in the car. Leon can ride nowhere until it goes in.

**Clues.**
- `NAR_C5_LockdownNotice` — lobby screen, by the turnstiles. Tells the player the freight lift is the only route and that it wants duty engineering.
- `NAR_C5_FacilitiesEmail` — reception terminal in the safe room. Haddow says the code is **not** 1987 (the year on the lobby plaque) and that she reset it to the lift car's inspection number.
- `NAR_C5_LiftSticker` — the foil sticker inside the freight car itself, at shoulder height: **INSP. NO. 3042**.

**Solution.** Enter **3042**.

**Failure state.** A wrong code buzzes and announces itself over the lobby PA ("Override refused. Duty engineering only."). The two security Husks at the shutters hear it, come back through into the lobby, and have to be avoided or killed. The keypad locks out for 10 seconds per wrong entry, so panic-mashing costs real time against the 06:12 clock. 1987 specifically gets a different, drier refusal line, which is the joke Haddow was complaining about.

**Hints.**
1. *(60 s at the keypad, or 1 wrong entry)* — "Four digits on a keypad, and a building full of people who write things down. Somebody told somebody that code."
2. *(2 min, or 2 wrong entries)* — points at the facilities email on the reception terminal and the phrase "inspection number".
3. *(3 min 30 s, or 4 wrong entries)* — gives 3042 outright and says it is not the year on the plaque.

**Blueprint build.** Make an Actor Blueprint `BP_C5_LiftKeypad` with a String variable `EnteredCode`, a String constant `CorrectCode` set to "3042", and an Integer `WrongTries`. Ten number widgets call one `AddDigit(int)` function that appends to `EnteredCode` and, when its Length is 4, compares it to `CorrectCode`. On match: set `FLG_C5_LiftOnline`, play the lift chime, enable the floor buttons. On mismatch: increment `WrongTries`, fire a `PA_Refused` sound, send an `AlertHusks` event to the two security Husks' AI, disable input on the pad for 10 seconds with a Timer, and clear `EnteredCode`. Add a special case: if `EnteredCode == "1987"`, play the alternate refusal line before the standard fail branch.

---

### 2. PZL_C5_Sequencer — the Genetics vault sequencer

**Setup.** Component B is in a cold drawer inside the Genetics vault (a special room, floor 31). The vault door has a three-position sequencer: three thumbwheels, each cycling the four bases **A C G T**, read left to right. Sixty-four possible combinations, so brute force is theoretically possible and practically punished.

**Clues.**
- `NAR_C5_TechLastEntry` — Jun Park's notebook, dropped in the cage corridor. "The triplet is on the labels, it has always been on the labels."
- `NAR_C5_VialLabel` — any vial on the bench rack, readable on inspect: **MARKER: G T C / LINEAGE: S7**.
- `NAR_C5_CalderRequisition` — Calder's old email in the bench terminal: "G-T-C blanks... set the dials left to right in that order."

**Solution.** **G, T, C**, left to right.

**Failure state.** A wrong triplet throws the vault's cold alarm: a strobe, a cold-vent hiss, and a 25-second window in which two Husks come in off the open-plan benches. The door also dead-bolts for 15 seconds. Repeated failures keep spawning from a capped pool, so the room gets harder but never infinite.

**Hints.**
1. *(90 s, or 1 wrong triplet)* — "Three dials, three letters. That's a code they used every day, so it'll be printed on something they handled every day."
2. *(3 min, or 2 wrong triplets)* — sends the player to Park's last page and then to the marker line on a bench vial.
3. *(4 min 30 s, or 4 wrong triplets)* — gives G, T, C and the left-to-right reading order from the requisition.

**Blueprint build.** `BP_C5_Sequencer` holds an array of three Integers `Dials` (0–3 mapping to A, C, G, T) and a const array `Solution = [2, 3, 1]`. Three interactable thumbwheel components each call `CycleDial(int Index)`, which does `Dials[Index] = (Dials[Index] + 1) % 4`, updates a Text Render on the wheel, and then calls `CheckSolution`. `CheckSolution` compares the arrays element by element in a For Loop with a Boolean `bMatch` that starts true. On match: play the bolt sound, set `FLG_C5_CompB`, open the drawer timeline, and enable the `BP_PickupAntidoteB` actor. On mismatch after the third wheel has been touched since the last check, fire the `ColdAlarm` event and start a 15-second lockout Timer.

---

### 3. PZL_C5_CryoRack — the cryo rack interlock

**Setup.** Component C is clamped in a cryo rack on floor 33. The rack's interlock reads bays 31, 32 and 33 as one set and will only lift when all three report the same sample-safe temperature. Leon finds them at **−80**, **−20** (someone was thawing a tray) and **OFF** (a tripped compressor). Each bay has a dial with stops at OFF, −20, −80 and −196, and the tripped bay needs a physical reset button on its flank before the dial does anything.

**Clues.**
- `NAR_C5_CryoLog` — clipboard at the bay heads. States the all-three-at-−80 rule and warns that −196 cracks the frost line and alarms.
- `NAR_C5_BaySticky` — two sticky notes on bay 32: one says it is at −20 thawing a tray, the second says bay 33's compressor tripped and needs the reset on its side.

**Solution.** Reset bay 33's compressor, then set all three dials to **−80**.

**Failure state.** Any bay left at **−196** cracks the frost line: a loud alarm at the loading bay, the rack stays shut, and the alarm is what calls the two Brutes in scene 12 early, before Leon has the component or the better firing position. Leaving a bay at OFF or −20 simply does nothing, with the interlock lamp staying amber — the player is never hard-blocked, only slowed.

**Hints.**
1. *(90 s in the bay room)* — "Three bays, three different temperatures, and a rack that won't open. It's not asking you to be clever, it's asking you to be tidy."
2. *(3 min, or after 1 wrong set)* — points at the cryo log and the idea that the interlock reads the three as one set.
3. *(4 min, or after 2 wrong sets, or immediately after the −196 alarm)* — reset bay 33, then all three to −80, and do not go lower.

**Blueprint build.** `BP_C5_CryoBay` is one Blueprint placed three times, with an Integer `SetPoint` (enum-style: 0 OFF, 1 −20, 2 −80, 3 −196), a Boolean `bCompressorTripped`, and a reference to the rack. Interacting with the dial advances `SetPoint` only if `bCompressorTripped` is false; interacting with the reset button sets it true to false. `BP_C5_CryoRack` keeps an array of the three bay references and a function `CheckInterlock` called from each bay's dial event: it loops the bays and lifts only when every `SetPoint == 2`. If any bay reads 3, call `FrostCrack`, which plays the alarm and sends an `EarlySpawn` event to the loading bay's Brute spawner. On success, set `FLG_C5_CompC` and play the rack's raise timeline.

---

### 4. PZL_C5_Synthesis — the synthesis machine

**Setup.** The Crown Lab rig on floor 35. Three ports, A, B and C, and a keypad. It will not arm with an empty port, and it rejects any inactivation sequence it does not recognise. Leon already carries component A from the Annex cold vault (`KEY_C3_AntidoteA`, fix F12). The cycle runs 90 seconds with the hood down, and it cannot be interrupted — which is the fight.

**Clues.**
- `NAR_C5_SynthesisManual` — the laminated card chained to the rig: ports first, sequence second, RUN, 90 seconds, draw the dose. Voss's handwriting under point 2 says the sequence was never written anywhere in this building, only in the Annex trial log.
- `NAR_C5_VossFinalFormula` — his final sheet on the desk: the mix will not assemble at body temperature and has to be cold-shocked "exactly the way the Annex trial log sets it out".
- The sequence itself is **the cold-shock sequence found in the Annex trial log (see Chapter 3)**. The player knows it if and only if `FLG_C3_ColdShockKnown` is set; the Chapter 3 writer owns its exact contents, and nothing in Chapter 5 restates it.

**Solution.** Load A, B and C into their matching ports, key in the cold-shock sequence from the Annex trial log, press RUN, and hold the lab for 90 seconds while Husks come up the stair and through the glass in three waves. Draw the dose from the output port.

**Failure state.** Three distinct failures. (a) A missing component: the rig refuses to arm and names the empty port on its little screen, so the player always knows which one. (b) A wrong sequence: the rig rejects it, vents, and costs 20 seconds of lockout. (c) Leon dies during the 90-second cycle, which is the real failure — the checkpoint restores to the moment RUN was pressed, ports loaded and sequence accepted, so a retry is a retry of the fight, never of the puzzle.

**Hints.**
1. *(at the rig with any port empty, 45 s)* — "Three ports, three carriers. It won't even arm until all three are in."
2. *(all ports loaded, 60 s at the keypad)* — points at Voss's sheet and the line that the sequence only ever existed in one place.
3. *(2 min, or 2 rejected sequences)* — names it plainly: the cold-shock sequence from the Annex trial log, keyed in exactly as it was written.

If `FLG_C3_ColdShockKnown` is somehow not set when the player reaches the rig, the keypad shows "SEQUENCE UNKNOWN" and Mara's hint 3 instead tells Leon he never read the trial log — a safety net, not an intended path, since Chapter 3 cannot be finished without reading it.

**Blueprint build.** `BP_C5_SynthesisRig` has three Boolean port flags (`bPortA`, `bPortB`, `bPortC`), a Boolean `bSequenceAccepted`, and a reference to the wave spawner. Each port is a Child Actor with an interact that checks the player inventory for the matching key item, consumes it, and sets its flag. Gate the keypad behind `bPortA AND bPortB AND bPortC`. On a keypad submit, branch on the game instance's `FLG_C3_ColdShockKnown` and on the entered sequence matching the Chapter 3 data asset — keep the correct sequence in a shared `DA_ColdShockSequence` Data Asset rather than typed into this Blueprint, so Chapter 3 remains the only place it is defined. On accept, start a 90-second Timeline, fire `StartWaves`, and on its finish set `FLG_C5_AntidoteMade`, grant `KEY_C5_Antidote`, and play `LS_C5_FinalTransformation`.

---

### 5. PZL_C5_WaterMain — Voss's dosing manifold

**Setup.** The roof plant room, after the boss. Three brass handles — **PURGE**, **RESERVOIR BYPASS**, **CITY MAIN** — and a pump switch. The loop still holds roughly 400 litres of Voss's concentrate. The antidote goes into the agent hopper; the question is only what order the handles get turned in, and the clock is running on Voss's own 06:12 timer.

**Clues.**
- `NAR_C5_WaterWorkOrder` — read back in scene 2, four floors and forty minutes earlier. Stoll wrote the rule big: purge the loop, then shut the bypass, then open the city main, "or you push the old batch into forty thousand homes."
- `NAR_C5_ManifoldChecklist` — Voss's own clipboard on the manifold, copying the mechanic's order back in his own hand.

**Solution.** **PURGE open** (hold until the sump gauge clears), then **RESERVOIR BYPASS shut**, then **CITY MAIN open**, then the pump.

**Failure state.** Not a game over. Opening CITY MAIN before purging starts the concentrate moving: the gauge needle jumps, and Mara — watching the north readout with the waterworks crew — catches it inside four seconds and shouts at Leon to shut it. Shutting it inside that window costs nothing but the player's nerve. Ignoring her through the whole four seconds forces a checkpoint reload at the plant room door with Mara's hint 3 already playing. Skipping the purge but getting the order otherwise right flushes the concentrate into the reservoir branch, which Mara also catches, and the pump refuses to run until the loop is clear.

**Hints.**
1. *(30 s in the plant room)* — "Three handles and a pump switch. Get the order wrong and you send his batch instead of yours."
2. *(70 s, or 1 wrong handle)* — points at the mechanic's work order downstairs and at Voss's clipboard right there, and says clear the loop first.
3. *(2 min, or 2 wrong handles, or after any concentrate movement)* — the whole order, out loud, in sequence.

**Blueprint build.** `BP_C5_Manifold` keeps an Integer `Step` starting at 0 and three handle Child Actors that each call `TurnHandle(EHandle Which)`. A Switch on `Step` says which handle is expected next: 0 expects PURGE, 1 expects BYPASS, 2 expects MAIN, 3 expects the pump. A correct handle increments `Step` and plays its own gauge animation; a wrong one calls `WrongOrder(EHandle Which)`, which starts a 4-second `BP_MaraWarning` Timer and sets a Boolean `bConcentrateMoving`. If the player re-closes the offending handle before that Timer fires, clear the Boolean and carry on; if it fires, call the checkpoint reload. When `Step` reaches 4, set `FLG_C5_AntidoteReleased` and play `LS_C5_Sunrise`.
