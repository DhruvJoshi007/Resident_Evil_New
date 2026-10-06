# EvilRise: cutscene scripts

Shot by shot, with camera, action, dialogue, sound and depth of field, plus how to build each one in Sequencer. Dialogue lines are also rows in `DT_Narrative` (type Dialogue).


## Chapter 1: Port Halvern

All five are real-time Sequencer cutscenes. House style: slow push-ins for dread, handheld for action, low angles on the boss, shallow depth of field, light film grain. Rain is a Niagara system that runs in the level, not in the sequence, so it never pops on a cut.

---

### CS_C1_Arrival

**Trigger:** level start (`BeginPlay` on `BP_C1_Director`).
**Location:** LOC_C1_Pier — north pier, Port Halvern.
**Length:** 55 s.
**Characters:** CHR_Leon, CHR_Pilot (Hank Doyle).

| # | Shot | Camera | Action / Dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Extreme wide, 24 mm | Static, locked, camera low at water level | Black. Fade up on fog. A single white masthead light swings in and out of it. The port is a row of dead sodium smears behind. | Rain on water. Diesel idle, far off. No music. | f/8, deep. Heavy grain on the fade-up, settling as the light approaches. |
| 2 | Medium wide, 35 mm | Slow handheld drift, boat-mounted | The tender's bow comes out of the fog. LEON stands at the rail in a soaked tactical jacket, one hand on a stanchion, not braced like a passenger — braced like someone counting exits. | Hull slap. Fender groan against pier timber. | f/2.8. Hank's face falls off into bokeh. |
| 3 | Over-shoulder on Hank, 50 mm | Static, slight boat roll | HANK, not looking at him, throttle still in his hand: **"This is as close as I go."** | Throttle blip. Chain rattle. | f/2.0, shallow. |
| 4 | Single on Leon, 50 mm | Very slow push-in | LEON steps up onto the gunwale. **"Pruitt's team came in here?"** | Boots on wet fibreglass. | f/2.0. Rain streaks catch the pier floods behind his head. |
| 5 | Single on Hank, 50 mm | Static | HANK finally looks at him. **"Noon yesterday. Nobody's called since."** | Rain. Nothing else — drop the ambience bed two dB under this line. | f/2.0. |
| 6 | Single on Leon, 85 mm | Static, breath-level float | LEON steps across onto the pier. Beat. **"Then somebody should."** He does not say it like a line. He says it like arithmetic. | One footfall on concrete, loud and alone. | f/1.8, very shallow. |
| 7 | Wide, 24 mm, from the pier looking out | Static, camera on the pier deck behind Leon's boots | The tender backs off. The masthead light shrinks and the fog closes over it in about four seconds. Leon does not watch it go; he is already turning inland. | Engine note rising then swallowed. Rain fills the hole it leaves. | f/5.6. Grain pushes up as the light dies. |
| 8 | Low wide, 18 mm | Slow crane up and back, revealing gantries | Leon's flashlight snaps on and cuts one narrow cone into the fog. The crane skeletons come out of the dark above him, far bigger than he is. | Flashlight click. First low music swell — one sustained cello note, no melody. | f/4. Light shafts in volumetric fog. Title card: **PORT HALVERN — 22:30**. |

**Unreal setup**
1. Make a Level Sequence `LS_C1_Arrival` in `/Game/EvilRise/Cinematics/C1/`. Add a Camera Cut track and one Cine Camera Actor per lettered lens group (three is enough: `CineCam_Boat`, `CineCam_Pier`, `CineCam_Crane`) — you key the cuts between them rather than making eight cameras.
2. Spawn `BP_Leon_Cine` and `BP_Hank` as **Spawnable** tracks inside the sequence (right-click the actor track → Convert to Spawnable) so they only exist during the cutscene and the playable `BP_Leon` pawn stays hidden.
3. Camera rig: parent `CineCam_Boat` to the boat actor with a Transform track that holds a tiny random wobble — bake a 2-second noise loop into the Transform keys rather than using a shaky-cam modifier, so it's deterministic.
4. Trigger: in `BP_C1_Director`, on `BeginPlay`, call **Create Level Sequence Player** with `LS_C1_Arrival`, then `Play`. Bind the player's `OnFinished` event to `Set Input Mode Game Only` + `SetFlag("FLG_C1_Landed")` on your `BP_GameFlags` subsystem.
5. The audio lines are Dialogue Waves placed on Audio tracks in the sequence, not in the Blueprint — that way subtitles come from the Dialogue Wave asset automatically.

---

### CS_C1_Tape0214

**Trigger:** interacting with the CCTV monitor in the dock office (`BP_CCTVMonitor`), only after `FLG_C1_ManifestsRead`.
**Location:** LOC_C1_DockOffice — the clerk's back room. The footage itself is Yard C, Stack 4.
**Length:** 1 m 40 s.
**Characters:** CHR_Leon (framing only), CHR_Begg, CHR_Kelso, CHR_Bert (all inside the footage).

This is the chapter's reveal and it is almost entirely wordless. Nobody on the tape speaks, because the camera has no audio. Resist every urge to add a scream. The horror is that it is a mute industrial record of three men having an ordinary bad night, and the player works out what happened before Leon does.

**Presentation rule:** the footage is rendered to a Render Target and shown on the monitor's screen material, so we never leave the dock office. Leon's reflection sits in the glass the whole time. Burned-in overlay: `CAM 11 — YARD C STACK 4 — NO AUDIO` top-left, a running timecode top-right, 8 fps frame-hold, 4:3 inside the 16:9 frame, vertical roll every nine seconds.

| # | Shot | Camera | Action / Dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Medium on the monitor, 40 mm | Slow push-in from behind Leon's shoulder | Leon's hand turns the jog dial. Static bands crawl up the screen. The timecode spins back and settles. | Dial detents. Tape head whine. Room tone: a fridge, rain on a flat roof. | f/2.8 on the glass, room behind soft. Our own grain OFF — all grain is in the footage layer. |
| 2 | **FOOTAGE.** High wide, fixed security angle | Locked off, zero movement, 8 fps hold | Timecode reads **02:14**. Two men at a ground-tier container. BEGG works a bar under the bolt seal; KELSO stands back with his hands in his pockets, not helping. The seal gives. The door swings about forty degrees. White mist pours out at ankle height and spreads flat across the concrete instead of rising. Both men step back out of it — unhurried, the way you step back from a cold draught. Begg looks inside with a torch. Kelso walks out of frame right. | **Silence from the footage.** Only the deck motor and the room. This is the loudest silence in the chapter. | Footage layer: heavy compression blocking, blown highlights on the mist, 50 % grain. |
| 3 | Insert on the monitor glass, 85 mm | Static | Leon's reflected eyes, dead centre of the mist. He does not blink. | Deck motor. Leon's breathing, slow. | f/1.8. Only the reflection is sharp. |
| 4 | **FOOTAGE.** Same fixed angle | Locked off | Timecode **02:31**. The mist is thinner, still clinging low. BERT walks in from frame left in a watchman's coat, torch down, one hand flat on his chest. He stops at the edge of the mist. He stands there for nine full seconds doing nothing at all. Then he lowers himself against the container side, carefully, like a man whose knees have rules, and sits. His torch rolls out of his hand and stops. He does not get up. The frame holds on him sitting for six more seconds. | Nothing. Let it run too long. Let the player start wanting a cut. | Footage layer. The torch beam is the only clean highlight. |
| 5 | **FOOTAGE.** Same fixed angle, speed-ramp dissolve through static | Locked off | Timecode **02:58**. KELSO comes back in with a flask, fast, and goes straight to Bert. He kneels. He puts a hand on Bert's shoulder. Bert's head comes up. Bert takes Kelso's wrist in both hands, pulls it to his mouth and holds on. Kelso's whole body goes rigid for one frame-hold, then he tears away and goes backwards over the flask and out of frame, gripping his forearm. Bert is on his hands and knees now and he follows, out of frame, slowly. The empty concrete and the flask hold for four seconds. | Nothing. | Footage layer. At 8 fps the bite reads as three still images, which is worse than motion. |
| 6 | Medium on Leon, 50 mm | Handheld, tiny, for the first time in the scene | Leon's jaw sets. He does not look away and he does not lean in. His hand leaves the dial. | Room tone only. A single low sub-bass swell starts here, under hearing. | f/2.0. |
| 7 | **FOOTAGE.** Same fixed angle | Locked off | Timecode **03:40**. KELSO walks back into frame directly beneath the camera, close enough that the lens distorts him. He is not holding his arm. His head comes up at the camera for two frame-holds — not aware of it, just facing it. Then he turns, takes the Stack 4 personnel gate in both hands, and pulls. The gate bows. The lock plate tears out of the chain-link, taking rivets with it. He is through and gone in under three seconds, and he is moving faster than he moved walking in. The empty, ruined gate holds. | Nothing from the tape. The sub-bass resolves into one struck piano note on the lock tearing. | Footage layer. His face is a white smear of blown exposure under the camera housing. |
| 8 | **FOOTAGE.** Same fixed angle | Locked off | Timecode runs on: 03:41, 03:42. Nothing happens. Nothing happens for eight seconds in an empty yard with a torn gate and a flask on the floor. Then static takes it. | Tape end flap. Deck auto-stop. | Footage dies to blue screen. |
| 9 | Wide, 28 mm, dock office | Slow pull-back | The monitor's blue glow is the only light on Leon's face. He reaches past it and takes the tape out of the deck. He puts it in his vest. He is not writing anything down because he is not going to forget any of it. | Rain. The radio hisses and keys up. LEON: **"Old man went first. The big one went faster."** MARA: **"Owen said not to open anything."** Half-beat. MARA, flatter: **"Never mind."** LEON, letting it go: **"Timestamp was 02:14. I'll keep that one."** | f/2.8. Grain back up to house level. |

**Unreal setup**
1. Make two sequences. `LS_C1_Tape0214_Footage` holds only the four fixed-camera yard shots, shot in the real Yard C level with `BP_Begg`, `BP_Kelso` and `BP_Bert` as spawnables. `LS_C1_Tape0214` is the master: it holds the dock-office camera cuts and has the footage sequence nested on a **Subsequence** track.
2. Render the footage sequence to a Texture Render Target 2D (`RT_CCTV`) with a Scene Capture Component 2D parented to the fixed yard camera, and plug `RT_CCTV` into an emissive Material Instance `MI_CCTV_Screen` on the monitor mesh. Do the overlays (timecode, label, roll, grain) inside that material — a Panner node on a scanline texture gives you the vertical roll in one line of nodes.
3. Fake 8 fps by setting the Scene Capture's **Capture Every Frame** off and calling `CaptureScene` from a 0.125 s looping Timer in `BP_CCTVMonitor`. That one change does more for the look than any post-process.
4. Camera rig: the two "real" dock-office cameras are plain Cine Camera Actors with a Transform track; shot 6 gets its handheld from a 1.5 s baked noise loop, amplitude 0.4 cm, so it reads as a held breath rather than a shake.
5. Trigger: `BP_CCTVMonitor`'s interact event checks `GetFlag("FLG_C1_ManifestsRead")`, then plays `LS_C1_Tape0214`. On `OnFinished`, set `FLG_C1_TapeWatched` and `FLG_C1_CageCodeKnown`, add the Footage entry `NAR_C1_Tape0214` to the file menu so the player can re-read the timestamps, and advance the objective to `OBJ_C1_07`. Mark the sequence skippable, but gate the skip behind a 5-second hold so nobody skips it by mashing.

---

### CS_C1_FirstReborn

**Trigger:** entering the break room with `FLG_C1_FirstReborn` unset — or, earlier, walking within 3 m of any Husk corpse the player killed without a head shot, fire or a finisher. Whichever fires first; the break room is the guaranteed fallback.
**Location:** LOC_C1_BreakRoom (fallback) or wherever the unfinished kill lies.
**Length:** 22 s.
**Characters:** CHR_Leon, ENM_Reborn.

| # | Shot | Camera | Action / Dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Low medium, 35 mm | Static, floor level, the body in the foreground | A guard's corpse on the break room couch, slack, two days dead. One hand twitches. Then the fingers splay too wide — wider than fingers go. | Fridge hum. A wet tendon click, close-mic'd. | f/2.0. The body sharp, Leon soft behind. |
| 2 | Single on Leon, 50 mm | Snap-in handheld | Leon's head turns. He is already raising the pistol. He is not startled; he is annoyed with himself. | Fabric, holster, one step back. | f/2.0. |
| 3 | Close on the corpse's chest, 85 mm | Slow push-in, 2 s | The sternum rises and does not fall. Something under the shirt moves across, not up. The shirt tears along a seam. | A long shriek, starting as a breath and ending as a whistle. Music: strings slam in on the tear. | f/1.8. Shallow enough that the far shoulder is mush. |
| 4 | Wide, 24 mm, low angle | Fast handheld, camera rising with it | It comes off the couch in one wrong motion — hips first, head last. Two ropes of grey tissue unspool from the ribcage and hang, twitching, a metre and a half long. The head lolls on a neck that is not holding it any more. | Tentacle wet-slap on linoleum. Breath like a bellows with a hole in it. | f/4. Full handheld. Grain up 30 %. |
| 5 | Over-shoulder on Leon, 35 mm | Handheld, tight | The ropes lash out and crack the wall tile a metre from his head, then recoil. LEON, quiet, almost to himself: **"Should've finished you."** | Tile shatter. Music drops out on the line, then returns. | f/2.8. |
| 6 | Hard cut to gameplay | — | Control returns mid-step, with the Reborn already swinging. No fade. | — | — |

**Unreal setup**
1. `LS_C1_FirstReborn` lives in `/Game/EvilRise/Cinematics/C1/`. It binds exactly two actors: the `BP_Reborn` that is about to fight you (spawn it **before** playing the sequence and bind the existing actor — do not make it spawnable, or the enemy you fight won't be the one you watched rise) and `BP_Leon_Cine`.
2. The rise itself is one animation, `AM_Reborn_Rise`, on the Reborn's Animation track. Keep the AI's Behavior Tree disabled with `BrainComponent->StopLogic()` until `OnFinished`, then `StartLogic()` — that is why shot 6 can cut straight into combat.
3. Camera rig: one Cine Camera for shots 1–3 (static, keyed push-in on the Transform track) and one for 4–5 carrying a baked handheld noise loop. Four camera cuts total.
4. Trigger: a `BP_RebornRiseTrigger` box in the break room, plus the same logic on `BP_Husk`'s death handler — if the kill was not a head shot / fire / finisher, start a 6–8 s random timer, and on expiry play this sequence if `FLG_C1_FirstReborn` is unset, else rise silently.
5. On `OnFinished`: set `FLG_C1_FirstReborn`, queue the `RAD_C1_Reborn` radio exchange on a 3 s delay so it lands during the fight, and unlock the finisher prompt in the tutorial system.

---

### CS_C1_HookmanIntro

**Trigger:** crossing the yard trigger volume into Stack 4 with `FLG_C1_PowerRestored` set.
**Location:** LOC_C1_Yard — container yard, in front of the crane shed.
**Length:** 40 s.
**Characters:** CHR_Leon, BOSS_Hookman (Dmitri Varga).

| # | Shot | Camera | Action / Dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Wide, 28 mm | Slow lateral dolly, left to right | Yard C with the floods on for the first time: four stacks, wet steel, rain falling through orange light. VGR-7718 stands open on a chassis, doors wide, a thread of frost still on the sill. | Rain on steel. The yard crane's standby hum. Wind in the stacks. | f/4. Volumetric light shafts off every flood. |
| 2 | Medium on Leon, 50 mm | Handheld, following | Leon moves along the container line, pistol low-ready, checking gaps between stacks the way he was trained to and has not had to in years. | Footsteps in standing water. | f/2.8. |
| 3 | Insert, 85 mm | Static | The painted hazard-stripe square on the concrete. The crane's hook block hangs above it with a 20-foot container slung on four chains, swinging maybe ten centimetres. | Chain creak. One long, slow metallic groan. | f/2.0. |
| 4 | Wide, 24 mm, behind Leon | Static | The crane shed's roller shutter, closed, forty metres off. Nothing happens for three seconds. Then the shutter **dents outward** from the inside, once, with a bang. | Sheet-metal boom. All ambience ducks. | f/5.6. |
| 5 | Single on Leon, 50 mm | Micro push-in | Leon stops walking. He does not raise the weapon yet. | Rain. His breath. | f/2.0. |
| 6 | Medium on the shutter, 35 mm | Handheld, bracing | A cargo hook punches **through** the shutter from inside, blade-first, and tears a half-metre gash downward. The chain behind it goes taut. The whole shutter is dragged up and off its runners and clatters away across the concrete. | Metal shearing. Chain paying out, link by link, far too long a chain. | f/4. Sparks catch the shallow focus. |
| 7 | Low angle, 18 mm, from the ground up | Slow tilt up, very low | Out of the black doorway comes a boot, then a shoulder, then the rest. VARGA is nearly two and a half metres of swollen harbour worker still wearing half a crane harness. His right arm is not an arm from the elbow on — it is a grown cable of fused muscle and chain ending in the hook, and the chain runs *into* him. On his back, under split skin, a pale knot of tissue works like something breathing. | Chain dragging. A long exhale with a rattle in it. Boss music enters: low brass, no rhythm yet. | f/5.6, deep. Low angle makes him taller than the stacks. Grain up. |
| 8 | Over-shoulder on Leon, 35 mm | Handheld | Varga drags the chain in a slow half-circle through the standing water, gathering it, and starts walking. LEON, reloading without looking down: **"Dmitri Varga. Night shift."** Beat. **"Sorry about this."** | Chain through water. Magazine seat. First rhythm hit in the music. | f/2.8. |
| 9 | Boss title card, hard cut | Static | Black frame, two seconds: **THE HOOKMAN**. Then straight to gameplay with the chain already in the air. | One struck anvil hit. Music to full. | Grain only. |

**Unreal setup**
1. `LS_C1_HookmanIntro` binds `BP_Hookman` (spawned first, bound as a **Possessable**, with its Behavior Tree logic stopped) and `BP_Leon_Cine`. The shutter is a separate actor, `BP_YardShutter`, with a Visibility track that swaps the intact mesh for a pre-fractured Geometry Collection on the frame where the hook comes through.
2. The hook punch is an Animation Montage on the Hookman (`AM_Hook_Breach`) plus a Chaos Destruction field driven from a Sequencer event track — fire the field, don't simulate the whole shutter for the entire shot, or you will pay for it in frame time on an M-series Mac.
3. Camera rig: three Cine Cameras — `CineCam_Yard` (dolly on shots 1–3, keyed Transform), `CineCam_Handheld` (shots 2, 6, 8, baked noise), `CineCam_Low` (shot 7, placed 15 cm off the ground with an 18 mm filmback and a keyed tilt). Nine camera cuts.
4. Trigger: `BP_C1_YardTrigger` (Box Collision) on `ActorBeginOverlap` → check `FLG_C1_PowerRestored` and that `FLG_C1_HookmanIntro` is unset → `Set Cinematic Mode` true on the player → play the sequence.
5. On `OnFinished`: set `FLG_C1_HookmanIntro`, call `StartLogic()` on the Hookman, enable the two `BP_DropZoneLever` actors (uses remaining = 2), and show the boss health bar widget. Queue `RAD_C1_HintHookman_01` after 20 s of fighting.

---

### CS_C1_BoatDeparture

**Trigger:** interacting with the tender at the boat dock with `FLG_C1_ShutterOpen` set.
**Location:** LOC_C1_BoatDock.
**Length:** 50 s.
**Characters:** CHR_Leon, CHR_Mara (radio only).

| # | Shot | Camera | Action / Dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Medium, 50 mm | Handheld, settling to static | Leon steps down into ankle-deep water and into the tender. He is favouring his left side and not making anything of it. He unhooks the bow line one-handed. | Water. Rope on cleat. Hull knock. | f/2.0. |
| 2 | Insert, 85 mm | Static, top-down | His hand sets the tape from the dock office down on the thwart, under his jacket, out of the rain. Then the pistol beside it. Then the shutter key, which he leaves on the dock. He is done with this place. | Plastic on fibreglass. | f/1.8. |
| 3 | Wide, 24 mm, from the water looking back | Slow dolly out | The port recedes: the floods, the gantries, the one shed with its shutter torn off. Something moves at the top of a stack and does not follow. | Outboard catching, second pull. The port sound dropping away behind. | f/5.6. Rain streaking the lens — allow one real lens-dirt pass here. |
| 4 | Single on Leon, 50 mm | Static, slight boat roll | He looks back once, properly, taking a count of it. Then forward. Radio keys up. MARA: **"Saltmere's the lights across the river. I'm on the point, in the radio station."** | Radio squelch. Engine settling into a note. | f/2.0. |
| 5 | Over-shoulder, 35 mm | Static | Over Leon's shoulder: the river mouth in fog, and in it a scatter of small warm lights and the long slow sweep of a lighthouse beam. LEON, after a moment: **"Keep the lights on."** | Water under the bow. Music: one low sustained note with a thread of something almost hopeful in it. | f/2.8. The lights as big soft bokeh circles until the focus racks to them. |
| 6 | Extreme wide, 24 mm | Static, locked | The tender is a small dark shape crossing a wide black river between two shorelines. MARA: **"They're all I've got."** | Engine, distant. Rain. | f/8. Deep. Grain up through the fade. |
| 7 | Fade to black | — | Card: **CHAPTER 2 — SALTMERE ISLAND — 00:40**. | Music resolves. One buoy bell. | — |

**Unreal setup**
1. `LS_C1_BoatDeparture` binds `BP_Leon_Cine` and `BP_Tender`. Animate the boat with a Transform track on `BP_Tender` and parent the two water-side cameras to it, so the roll is free and consistent.
2. The receding port in shot 3 is the real level — do not build a separate backdrop. Add a Sequencer **Fade** track at the end rather than fading in post, and drop the Niagara rain's spawn rate on the same keys so the rain fades with the picture.
3. Camera rig: `CineCam_Boat_A` (shots 1, 2, 4, parented to the tender), `CineCam_Water` (shot 3, on its own dolly rig in the level, not parented), `CineCam_Boat_B` (shots 5, 6, with a Current Focus Distance track for the rack to the Saltmere lights in shot 5).
4. Trigger: `BP_TenderInteract`'s interact event checks `FLG_C1_ShutterOpen`, hides the player pawn, plays the sequence. On `OnFinished`: set `FLG_C1_BoatTaken` and `FLG_C1_Complete`, write the auto-save, then `Open Level` on `L_C2_Saltmere`.
5. Keep this one skippable with a single press — players replaying for a better clear time should not be held here, and nothing in it is load-bearing that the flags don't already carry.


## Chapter 2: Saltmere Island

Three cutscenes. All real-time Sequencer, all skippable on a second viewing. Chapter 2 light rule (Canon F14): cold moonlight through fog, plus the lighthouse beam sweeping every 9 seconds. No warm light anywhere on the island except Mara's one window out on the Point, and no dawn until Chapter 5.

---

### CS_C2_FloodedStreet

- **ID:** CS_C2_FloodedStreet
- **Trigger:** Leon walks off the Quay Row slipway and his boots break the surface of the street water (overlap volume at the water line, first time only).
- **Location:** LOC_C2_FloodedStreet
- **Length:** 52 seconds
- **Sets:** FLG_C2_StreetIntro, FLG_C2_FirstDrowned
- **Purpose:** teach the player, without a line of instruction, that water is where death lives and stone steps are where it is not.

#### Shot list

1. **Wide, 24 mm.** Slow push-in from behind Leon's shoulder, 1.2 m above the water. Chapel Lane runs away from camera and simply stops being a street: parked cars up to their windows, a bus shelter with the tide inside it, a child's bike hooked on a railing. Sound: no music. Rain ended an hour ago, so only drip, hull-knock, and a shutter banging somewhere far off. Deep focus, f/8, light grain. Hold the silence a full 4 seconds before anything moves.
2. **Medium, 40 mm, low angle just off the waterline.** Static. Leon steps down one submerged step and the water takes his shin, then his knee. He stops and looks at it like a man reading a bad contract. No dialogue. Sound: the enormous, intimate slosh of one leg in cold water, mixed loud. Shallow focus on the ripple ring, f/2.0.
3. **Over-shoulder, 35 mm.** Handheld, very slight. Twenty metres out, something pale is floating face down in a fisherman's smock, drifting slowly toward him on the current. Leon's hand goes to the pistol but does not draw. LEON (low, to himself): "All right." Sound: a buoy bell, once, wrong-pitched. f/2.8, focus racks from Leon's hand to the body.
4. **Wide, 28 mm, from across the street at head height.** Locked off. Leon wades two steps toward the body. The lighthouse beam crosses the street left to right and for the length of the sweep the water goes from black to grey-green and we see, for about 18 frames only, three vertical shapes standing on the road under the surface. The beam passes. Black water again. Sound: the beam sweep has a low sub-bass bloom under it. No sting. Grain up slightly in the dark half.
5. **Close, 85 mm.** Push-in on Leon's face as he stops. He does not flinch, he recalculates. Eyes track right, where the shapes were. Sound: his breathing, and under it a wet dragging that was not there a second ago. f/1.8, background completely dissolved.
6. **Wide, 24 mm, low on the water.** Handheld. The floating body is snatched straight down out of frame, hard, with no build-up at all, and the smock goes under last. A **Drowned** comes up where the body was: grey, bloated, salt-crusted, hair in sheets, arms far too long for its frame. It does not run. It turns its head toward the noise he made. Sound: one huge displacement of water, then a long rattling exhale through a flooded chest. Music enters here only, a single low string.
7. **Medium two-shot, 50 mm.** Handheld, pushing back as Leon reverses up the submerged steps to the stone kerb. Two more surface behind the first. On the kerb, the water at his ankles, they stop at the edge of the deep part and sway. LEON: "You don't like the shallows." MARA (radio, thin and small): "They don't need to. You have to cross eventually." f/2.8, focus on Leon, Drowned soft.
8. **High wide, 20 mm, craned up and back.** The street from above: Leon a single small figure on a line of kerbstones, and the black water on both sides of him with slow V-wakes moving in it. The lighthouse beam crosses the frame and the Point comes into shot in the far distance, one lit window on it. Hold 3 seconds. Cut to black on the next beam sweep, gameplay resumes in the last camera position. Sound: sub-bass fades, drip remains. Heavy grain in the sky, f/8.

#### Unreal setup

1. Make a Level Sequence at `/Game/EvilRise/Cinematics/C2/LS_C2_FloodedStreet`. Bind four actors: `BP_Leon` (possessable, so the Sequencer drives the real player pawn and the player is never duplicated), three `BP_Drowned` spawnables, and the floating-body static mesh `SM_Prop_BodyFloat` so you can animate it being pulled under on one transform track.
2. Camera rig: one Cine Camera Actor with a Camera Cuts track and eight camera sections. Keep the camera in one actor and animate the transform per section instead of making eight cameras: fewer things to lose. Put the handheld feel on a `CameraShake` of small amplitude, not on hand-keyed noise, so you can dial it per shot.
3. Trigger Blueprint: `BP_Trigger_StreetIntro` is an Actor with a Box Collision at the water line. On `ActorBeginOverlap`, check the other actor is the player and that `FLG_C2_StreetIntro` is false in your `BP_GameFlags` save object, then call `Create Level Sequence Player` (or a `Level Sequence Actor` already placed in the level) and `Play`.
4. Disable player input for the shot with `Disable Input` on the player controller at the start, and `Enable Input` on the sequence's `OnFinished` event. Set the flag `FLG_C2_StreetIntro` in that same `OnFinished`, and set `FLG_C2_FirstDrowned` so the hint system knows the player has met them.
5. The three Drowned in shot 6 should be the real AI actors, not animation props: spawn them from the sequence with `Spawnable` tracks, then on `OnFinished` their AI is already in the level and the fight or the flee is continuous. Set the Box Collision to `Generate Overlap Events` only, never blocking, or Leon will bump an invisible wall.

---

### CS_C2_BrineMawSurfaces

- **ID:** CS_C2_BrineMawSurfaces
- **Trigger:** Leon steps onto the low dock in the harbor basin (overlap volume on the dock planks). Requires FLG_C2_SluiceWheelFound, so the player always has the answer in a pocket before they meet the problem.
- **Location:** LOC_C2_Harbor
- **Length:** 44 seconds
- **Sets:** FLG_C2_MawSurfaced, starts the boss encounter
- **Purpose:** establish scale, establish that the water is unwinnable, and show the capstan in the same frame as the monster so the plan is the player's idea.

#### Shot list

1. **Wide, 24 mm, from the harbor arch.** Slow dolly in along the dock. The basin is brim-full and glassy, sheds and a crane on the far wall, the lighthouse at the end of the mole. Fishing boats sit high and wrong at their moorings. Sound: rigging ticking against masts, a diesel generator dying somewhere. No music. f/5.6, moderate grain.
2. **Medium, 50 mm, over Leon's shoulder, knee height.** Handheld. He crouches at the dock edge and puts two fingers in the water. The surface is moving outward in slow rings with nothing making them. LEON (quiet): "Something's breathing in here." Shallow, f/2.0, focus on the rings.
3. **Insert, 100 mm macro.** A dead gull on the planks, and beside it a mooring hawser as thick as a wrist, snapped clean through, the strands splayed and bitten flat. No dialogue. Sound: one soft bass thud transmitted up through the planks into the mic. f/2.8.
4. **Wide, 28 mm, locked off, camera low and level with the water.** The whole basin surface drops four inches at once, everywhere, like a held breath. Every boat sinks with it. Hold two seconds of absolute stillness. Sound: all ambience ducks to near silence; just a deep intake. This is the scare, and it is the quietest shot in the chapter.
5. **Wide, 24 mm, same position.** The **Brine Maw** comes up. Eleven metres of eel-bodied thing, grey-green, a torn trawl net grown into its flank and a dozen glass floats trailing, jaw opening in four flaps instead of two. It rises out of the basin to a third of its length, towers over the dock, and the water it brings up with it falls for a long time. Camera does not shake: it just fails to contain the creature, which breaks the top of frame. Sound: music hits for the first time, two notes, and a shriek that is more pressure than pitch. Grain heavy, f/5.6.
6. **Close, 85 mm, low angle.** Behind and under the hinge of the jaw, a translucent sac pulses with its own dim green light, bright for about a second each pulse. Camera holds on it just long enough that the player registers it as a target and not as decoration. Sound: a wet internal pumping, close-miked. f/1.8, everything else gone.
7. **Medium, 40 mm.** Handheld, hard. The Maw comes down across the low dock. Leon is already moving, a dive and a roll onto the stone quay above, and the dock's end planks go into the basin behind him in a sheet of splinters. QTE prompt appears over this shot (dodge). Sound: timber detonating, water swallowing it. Motion blur, f/2.8.
8. **Over-shoulder, 35 mm, from the quay.** Leon on one knee, pistol up, as the thing slides back under and the wake runs the length of the basin. Over his shoulder and sharply in frame on the west wall: the capstan housing and its enamel notice. LEON: "You can't shoot a basin." Then the sweep of the lighthouse crosses the water and the camera holds on the capstan, not on him, for the last beat. Sound: music drops to a single sustained low note under Mara's radio click. Deep focus pulled to the capstan, f/5.6. Hard cut to gameplay; the boss is already active.

#### Unreal setup

1. Level Sequence at `/Game/EvilRise/Cinematics/C2/LS_C2_BrineMawSurfaces`. Bind `BP_Leon` (possessable), `BP_Boss_BrineMaw` (possessable, placed in the level already, hidden at start so its health and AI persist straight into the fight), and the Niagara water systems.
2. The basin surface drop in shot 4 is one float on a Material Parameter Collection (`MPC_C2_Water`, parameter `BasinHeight`) animated on a Material Parameter track. Drive the water plane's world Z and the material's wave amplitude off the same parameter, because later the sluice puzzle animates exactly the same parameter. Build it once here and the puzzle is nearly free.
3. The Maw is one Skeletal Mesh with a baked emergence animation. Put the animation on an Animation track in the sequence, and on `OnFinished` switch the mesh back to its Anim Blueprint so the boss AI takes over mid-pose. Spawn the water sheets as Niagara systems on spawnable tracks keyed to the emergence frames.
4. Trigger Blueprint: `BP_Trigger_MawSurface`, Box Collision on the dock planks. On overlap, branch on `FLG_C2_SluiceWheelFound`; if false, do not play and instead push the objective reminder for OBJ_C2_09 so the player cannot be ambushed without a solution. If true, `Disable Input`, play, and in `OnFinished` set `FLG_C2_MawSurfaced`, `Enable Input`, and call the boss's `BeginEncounter` custom event.
5. For the QTE on shot 7, do not pause the sequence. Add an Event track key at the dive frame that calls a `ShowDodgePrompt` custom event on the player controller with a 0.8 second window; a miss costs health and plays the hit reaction, it never fails the cutscene. Keep the dock-destruction planks as a simple Geometry Collection or a swap to a pre-broken mesh, since full Chaos simulation on a 16 GB machine in a cinematic is not worth the frames.

---

### CS_C2_LighthouseReveal

- **ID:** CS_C2_LighthouseReveal
- **Trigger:** the third mirror dial lands on 250 and PZL_C2_LensReveal resolves (fired from the puzzle Blueprint, not from a volume).
- **Location:** LOC_C2_Lighthouse into LOC_C2_HiddenStair
- **Length:** 58 seconds
- **Sets:** FLG_C2_LensSolved, FLG_C2_StairOpen, FLG_C2_AnnexKnown, ends Chapter 2
- **Purpose:** pay off the lens, and make the reveal a physical fact (a stair that goes too deep) rather than a speech.

#### Shot list

1. **Close, 85 mm.** The third brass dial turning under Leon's hands on the crank, numbers passing: 240, 245, 250. It clicks against a detent. Sound: worm gear, salt grinding, then a clean metallic click. f/2.0, lamp-room reflections swimming in the brass.
2. **Medium, 35 mm, wide-ish on the lamp room.** Static. The great lens drum turns one last time and the three mirror panels line up. The beam, which has been sweeping the whole chapter, stops sweeping and concentrates into a single hard bar of white across the room. Dust and salt in it. Sound: the lamp's hum rises a third. f/4.0, the bar of light blows out slightly, bloom on.
3. **Tracking, 50 mm.** The camera follows the light bar along the curved wall, across the keeper's framed chart, and onto one worn patch of brass under it where a thousand sweeps have polished the plate bare. The bar settles exactly on the worn patch. Sound: a slow mechanical count behind the wall, three beats, as if something is deciding. f/2.8.
4. **Insert, 100 mm.** A latch, hidden inside the chart frame's lower rail, warming in the beam. A bimetal strip bends. The latch drops out of its keeper with a sound far too heavy for its size. Sound: that one iron clunk, reverberating into a space that is obviously much larger than this room. f/2.8, shallow.
5. **Medium, 40 mm.** Handheld, slight. Leon takes the chart frame in both hands and pulls. The whole panel is a door and it comes open on a cold draught that lifts the dust off the lamp room floor and pushes his jacket. LEON: "That's not a cupboard." Sound: the draught, and a very distant drip with a long gap before each one. f/2.8.
6. **Wide, 24 mm, from inside the doorway looking back at him.** Leon in the lit rectangle of the lamp room, the darkness we are shooting from entirely black. He clicks his flashlight on and we see what is around the camera: dressed stone steps curving down, and bolted to that stone, painted steel conduit, cable trays, and a stencil at chest height. Sound: his boot on the first step, which echoes four times. Deep focus, f/5.6, grain up.
7. **Insert, 85 mm.** The stencil in the flashlight beam, paint flaked but legible: VIGOR BIOTECH - SALTMERE ANNEX - LEVEL B1 - AUTHORISED ONLY. Below it, a strip of newer tape over an older sign, and under the tape the word SEALED. Sound: nothing but the flashlight's filament tick. f/2.8.
8. **Medium, 50 mm, descending with him.** Steadicam, moving down the curve behind his shoulder, two steps per second. LEON (radio): "Mara. Calder wasn't being poetic. There's a facility under the island." MARA (radio, degrading with every step): "Leon, you're breaking u-" and the carrier drops to hiss. He stops on one step, listens to the hiss, then keeps going. Sound: radio static resolving into the room tone of a very large sealed space. f/2.0.
9. **Extreme wide, 20 mm, from far below, looking up.** The stair spirals away up above him and Leon is a small moving light on it. The doorway at the top is a bright coin, and then it closes, by itself, on a damped hydraulic hiss, and the only light left in the world is the one in his hand. Hold 4 seconds. Sound: the door seating, pressure equalising, then silence with a heartbeat of distant machinery still running after eight months. Cut to black. Chapter card: **CHAPTER 3 - THE ANNEX - 02:10**. Grain at maximum, f/4.0.

#### Unreal setup

1. Level Sequence at `/Game/EvilRise/Cinematics/C2/LS_C2_LighthouseReveal`. Bind `BP_Leon` (possessable), `BP_Puzzle_LighthouseLens` (for the dial and lens drum animation), `BP_Door_ServiceHatch`, and the lamp's Rect Light plus a Spot Light that represents the concentrated beam.
2. The beam that stops sweeping is two lights, not one. Keep the chapter's sweeping Spot Light on a rotating Blueprint, and in the sequence fade its intensity to zero while fading up a second, much tighter Spot Light that is already aimed at the worn brass patch. Crossfade over 1.5 seconds on shot 2. Faking it this way is far easier than making real mirror reflections line up on camera.
3. The puzzle Blueprint fires the cutscene, so there is no trigger volume. In `BP_Puzzle_LighthouseLens`, when all three dial values match `(40, 115, 250)` in the correct set order, call `Play` on the Level Sequence Actor you placed in the lamp room and `Disable Input`. Expose the sequence as a variable on the puzzle so you can pick it in the level.
4. The stencil in shot 7 must be readable, so light it with a small Spot Light parented to the flashlight and sized to the text, and put the text on a decal rather than in the base material. Decals let you move it until it reads well on camera without touching the stone mesh.
5. On `OnFinished`: set `FLG_C2_LensSolved`, `FLG_C2_StairOpen` and `FLG_C2_AnnexKnown` in `BP_GameFlags`, save the game at the hidden-stair checkpoint, then `Open Level` for the Chapter 3 map (or, if you are streaming, load the Annex level in a sublevel and teleport the player). Keep `Enable Input` out of this one: the player should get control back in Chapter 3, not in a dark stairwell mid-load.


## Chapter 3: The Annex

Three real-time Sequencer cutscenes, plus the three Patient Zero footage reels, which are not cutscenes: they are media the player plays on a prop projector and they live in `narrative.json` as `Footage` rows (`NAR_C3_Footage_Reel1/2/3`). Reel playback is covered at the end of this file.

House style, same as Chapters 1 and 2: shallow depth of field, a light film grain that gets coarser as the chapter goes down levels, no slow motion, no music sting on a jump. Mara's dialogue is never longer than a breath.

---

### CS_C3_MaraMeetsLeon

- **ID:** CS_C3_MaraMeetsLeon
- **Trigger:** Leon enters the crypt lift shaft trigger volume with `FLG_C3_PatientZeroSeen` set.
- **Location:** LOC_C3_CryptLift
- **Length:** 52 s
- **Sets:** FLG_C3_MaraJoined

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Wide, 24 mm, low, from the shaft floor | Static, 2 s hold | A greased counterweight cable slides upward through frame. Dust falls in the torch beam. | — | Cable hum, a far-off cage rattling down the shaft | f/4, deep enough to read the shaft, grain medium |
| 2 | Medium, 40 mm, over Leon's shoulder | Slow push-in, 15 cm/s | Leon raises the pistol at the shaft gate and keeps it raised. | LEON: "Whatever that is, it's coming down." | Pistol leather, his breathing steady | f/2.0, gate soft, sharpens as the push lands |
| 3 | Close, 85 mm, on the gate louvres | Static | The cage descends past the louvres. Light strobes across Leon's face from inside the cage. | — | Cage brake squeal, three bangs as it settles | f/1.8, louvres in focus, face soft behind |
| 4 | Medium two-shot, 35 mm | Handheld, small, breathing with the actors | The cage gate folds open. Mara stands in it in a harbour coat with a boathook held like a pike, torch taped to the shaft. Leon's pistol lowers but does not holster. | MARA: "Don't shoot. Harbour radio. I'm the voice." | A drip, the coat creaking | f/2.2, both faces in the plane |
| 5 | Close, 85 mm, Mara | Static, slight breath of handheld | She looks past him, at the ward corridor, not at him. | LEON: "You were safe up there." / MARA: "I was alone up there. That's not the same." | Her breath, once, unsteady, then controlled | f/1.8, corridor a soft smear |
| 6 | Close, 85 mm, Leon | Static | He takes this in and decides not to argue. He steps aside to let her out. | LEON: "Stay on my left. If I stop, you stop." | Boots on wet concrete | f/1.8 |
| 7 | Medium two-shot, 35 mm | Slow truck left, following them | She steps out, plants the boathook, and looks down the corridor with professional dread. | MARA: "There's a stairwell past the ward. The map in the lift says it floods." | Water moving somewhere below, ward doors knocking in their frames | f/2.2 |
| 8 | Wide, 24 mm, from behind | Static, 3 s hold, cut on movement | Two torch beams instead of one, going away down the corridor. | — | Both sets of footsteps; the cage rattles shut on its own behind them | f/4, grain settles |

**Unreal setup**

1. Make a Level Sequence called `LS_C3_MaraMeetsLeon` in `/Game/EvilRise/Cinematics/C3/`. Add the player pawn, `BP_Mara_Companion`, the lift cage actor `SM_CryptLiftCage` and the shaft gate as possessable bindings by dragging them from the World Outliner into Sequencer.
2. Camera rig: one `CineCameraActor` per shot (eight of them) plus a Camera Cuts track that switches between them. Set Filmback to 16:9 Digital Film, then set Current Focal Length and Current Aperture per the table. For shots 4 and 7, parent the camera to a `BP_HandheldShake` actor that applies a small Camera Shake so the move stays organic.
3. Animate the cage with a Transform track (Z from +900 to 0 over shots 1 to 3), then play the `AM_LiftGateOpen` animation on the gate. Mara walks using one Animation track; do not use AI movement inside a sequence.
4. Trigger Blueprint: in `BP_Trigger_CryptLift`, on Begin Overlap, branch on `FLG_C3_PatientZeroSeen` from the save subsystem, then call Create Level Sequence Player and Play, Set Cinematic Mode true with Hide HUD, and bind On Finished to a custom event that sets `FLG_C3_MaraJoined`, spawns `BP_Mara_Companion` at the cage marker and enables her follow behaviour. Set Do Not Allow Retriggering on the volume.
5. Skippable: on the Enhanced Input action `IA_SkipCutscene`, call Set Playback Position to the sequence end rather than Stop, so the On Finished logic still runs and Mara still spawns.

---

### CS_C3_WardenIntro

- **ID:** CS_C3_WardenIntro
- **Trigger:** The player carries `KEY_C3_AntidoteA` and crosses the coolant plant floor trigger on the way back from the cold vault.
- **Location:** LOC_C3_CoolingChamber
- **Length:** 44 s
- **Sets:** FLG_C3_WardenAwake

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Medium two-shot, 35 mm | Handheld, tight | Leon and Mara come out of the vault passage. Behind them, four blast doors drop in sequence, the far one first. | MARA: "That's not us doing that." | Four hydraulic slams, each nearer, then silence | f/2.2, grain coarse (this is the deepest level) |
| 2 | Wide, 24 mm, low angle from floor level | Static | Coolant gas rolls out of a split line and lies along the floor at knee height. Something walks into it from the far end and the gas parts around its legs. | — | Gas hiss, a long slow footfall with a metal ring in it | f/4, haze eats the background |
| 3 | Low angle, 32 mm, tilting up | Slow tilt up the body, 5 s | Annex security armour, grown into. Plate buckled outward over a chest that does not fit it any more. A fuel pack strapped at the back, lines running over the shoulder, one weeping. | — | Breathing through a cracked visor; a drip of fuel on hot pipe, hissing | f/2.8, plate sharp, head soft until the tilt arrives |
| 4 | Close, 100 mm, on the visor | Static | Behind the cracked visor the eyes move, find them, and do not widen. There is still a shift pattern in how it turns: it checks left, then right, then them. | LEON: "He's still doing his rounds." | Visor creak, radio static from a dead belt unit | f/1.8, extreme fall-off |
| 5 | Medium, 50 mm, Mara | Static | Mara's grip changes on the boathook, from carrying to holding. | MARA: "Tell me there's a trick." | Her breath catching once | f/2.0 |
| 6 | Wide, 24 mm, over the Warden's shoulder toward them | Fast truck in, 1.5 s, slight whip | It squares up and starts walking. Not charging. Walking. | LEON: "Yellow valves. The room's the trick." | Music enters for the first time in the chapter, low brass under the gas hiss | f/4 |
| 7 | Insert, 85 mm | Static, 0.8 s | The weeping fuel line on its back, in focus, a bead of fuel running down the hose. | — | One wet drip | f/1.8, everything else gone |
| 8 | Medium, 35 mm, on Leon | Handheld, hands gameplay control at the cut | Leon steps left and drops into a fighting stance. Control returns mid-step. | — | Gas hiss up, the first blast door locking out behind him | f/2.2 |

**Unreal setup**

1. Make `LS_C3_WardenIntro` in `/Game/EvilRise/Cinematics/C3/`. Bind the player pawn, `BP_Mara_Companion`, `BP_Boss_Warden`, the four `BP_BlastDoor` actors and the `NS_CoolantGas` Niagara system.
2. Camera rig: eight CineCameras on a Camera Cuts track. Shot 3 is the only long move: put that camera on a short Camera Rig Rail and animate the rail's Current Position, which is steadier than keying the transform by hand. Shot 7 is a locked-off insert camera already parented to the Warden's `socket_FuelLine` bone so it stays framed.
3. Spawn the boss before the sequence with AI logic disabled (Set Actor Tick Enabled false on its AI controller), animate it in the sequence with an Animation track, and re-enable the AI in On Finished. This avoids the boss walking away from its own close-up.
4. Trigger Blueprint: `BP_Trigger_WardenArena`, On Begin Overlap, check the player's inventory for `KEY_C3_AntidoteA`, then close the arena by calling Close on each `BP_BlastDoor`, play the sequence, and on finish set `FLG_C3_WardenAwake`, start the arena music state and enable the three `BP_GasValve` actors.
5. Mark the sequence skippable, but keep the arena doors closing in the trigger Blueprint and not in the sequence, so a player who skips is still locked in.

---

### CS_C3_UndertowRising

- **ID:** CS_C3_UndertowRising
- **Trigger:** The raft reaches the first rock pillar waypoint, about 20 s after launch, with `FLG_C3_RaftLaunched` set.
- **Location:** LOC_C3_SeaCave
- **Length:** 48 s
- **Sets:** FLG_C3_UndertowSeen

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Wide, 24 mm, from a high cave ledge | Slow crane down toward the water | The raft crosses a shaft of moonlight between two rock pillars. Two people in it, small. | MARA: "Current's taking us out whether we like it or not." | Oars, swell slapping rock, a hollow boom from deeper in the cave | f/5.6, grain medium |
| 2 | Medium, 35 mm, in the boat, eye level with Leon | Handheld, riding the swell | Leon kneels at the bow with the rifle across his knee, scanning. Mara behind him on the oars, pulling steady. | LEON: "How deep does it get out here?" / MARA: "Nobody fishes it. That's your answer." | Rowlocks creaking in time, water under the hull | f/2.0 |
| 3 | Low, 28 mm, water level, half the lens under the surface | Static | Something enormous passes beneath the raft, right to left. The raft lifts, then drops, on nothing. | — | All ambience ducks out for 1.2 s, then a deep pressure thump | f/4, water line splits the frame |
| 4 | Close, 85 mm, Mara's hands on the oars | Static | Her hands stop. The oars trail. | MARA: "Don't tell me what that was." | Dripping from a lifted oar blade | f/1.8 |
| 5 | Wide, 24 mm, ahead of the raft | Static, 4 s hold, no move at all | The sea ahead stops behaving like water. A back breaks the surface across the whole width of the channel and keeps rising. Tentacles find the rock pillars and take hold of them. | — | A wet landslide sound; rock grinding; a low note under hearing | f/5.6, grain coarse |
| 6 | Low angle, 32 mm, from the raft looking up | Slow tilt up | Up the body to a hooded ridge of flesh that splits open on one flat pale eye the size of a dinner plate. The eye finds the raft and tracks it. | MARA: "It's looking at us." / LEON: "Good. Then it's facing us." | The eye membrane peeling open, a horrible soft click | f/2.8 |
| 7 | Insert, 100 mm, the eye | Static, 1 s | The pupil contracts in the torchlight. Around the eye, the hide is armoured. The eye is not. | — | Torch beam buzz, water running off the hide | f/1.8 |
| 8 | Medium two-shot, 35 mm | Handheld, hands control at the cut | Leon shoulders the rifle. Mara spits on her palms and takes the oars again. | LEON: "I call it, you pull. Left!" | Music hits, percussion first; oars biting hard | f/2.2 |

**Unreal setup**

1. Make `LS_C3_UndertowRising` in `/Game/EvilRise/Cinematics/C3/`. Bind the raft pawn `BP_Raft`, the player pawn, `BP_Mara_Companion`, `BP_Boss_Undertow` and the water surface actor.
2. Keep the raft on its spline for the whole sequence: do not animate the raft transform in Sequencer, animate the spline distance float instead, so gameplay and cutscene use the same movement path and the hand-off at shot 8 does not pop.
3. Camera rig: eight CineCameras parented to the raft for shots 2, 4, 6, 8 (so they inherit the swell) and world-parented for shots 1, 3, 5, 7. Shot 1 uses a Camera Rig Crane actor with Crane Pitch and Crane Arm Length animated.
4. Shot 3's half-underwater look is one camera with a post process material on its own Post Process Settings (a split-screen water line), not a real water volume, which is cheaper and art-directable.
5. Trigger Blueprint: `BP_Trigger_UndertowSpawn` on the spline, On Begin Overlap, check `FLG_C3_RaftLaunched`, play the sequence, and On Finished set `FLG_C3_UndertowSeen`, enable the boss's phase state machine and enable the left/right steering input on `BP_Raft`.

---

### The Patient Zero footage (not cutscenes)

`NAR_C3_Footage_Reel1`, `_Reel2` and `_Reel3` are played on a prop reel projector in the observation room. They are Footage rows, not Level Sequences.

Build each one as a short 4:3 monochrome video texture (or a tiny Level Sequence rendered to a Media Texture) played on a `BP_ReelProjector`. Interacting with the projector opens a full-screen UMG widget with the projector frame around a Media Player, plays the reel audio on a 2D sound so it does not attenuate, and prints the row's `text` as captions for accessibility. On Media Opened, mark the reel read in the document log; the third reel's On Media Ended sets `FLG_C3_PatientZeroSeen`, which is also the gate on `CS_C3_MaraMeetsLeon`. Reels 1 and 2 can be watched in either order; reel 3 is only loadable once both are watched, so the three-beat shape cannot be broken.


## Chapter 4: Marrow Bay

Four cutscenes. `CS_C4_Pruitt` is the short payoff scene for Canon fix F10 and must be watched before the chief's office is enterable. `CS_C4_HaleConfession` and `CS_C4_HaleMutation` are a pair: the confession is quiet and still, the mutation is the loudest thirty seconds in the chapter. `CS_C4_SewerDoor` closes the chapter and points at Vigor Tower.

House style for the chapter: 24 to 50 mm, T2.0 to T2.8, sodium-orange practicals against cold emergency green, heavy grain in the basement, almost none in the chief's office.

---

### CS_C4_Pruitt

- **ID:** CS_C4_Pruitt
- **Trigger:** Leon enters the trigger volume in front of cell 4 in the holding cell block. Requires `FLG_C4_BodyCamWatched`.
- **Location:** LOC_C4_HoldingCells
- **Length:** 1 min 50 s
- **Sets:** FLG_C4_PruittFound, FLG_C4_VossLocationKnown, FLG_C4_WaterPlanKnown

| # | Shot | Camera | Action and dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Wide, 24 mm, from the block gate | Static, locked off, slight dutch of 2 degrees | Four cells down one side. Emergency green strip lighting. Cell 2's hatch is open and a bare foot is visible on the floor inside. Leon walks in frame and stops. | Strip light hum, a drip, distant structural groan | f/4, grain medium |
| 2 | Medium, 35 mm, over Leon's shoulder | Slow push-in, 15 cm/s, toward the cell 4 hatch | A voice from behind the steel. PRUITT: "Took you long enough." | Voice dry and thin, slight reverb off the steel | f/2.8, grain medium |
| 3 | Close, 50 mm, through the hatch slot | Handheld, very small amplitude, as if the operator is kneeling | Pruitt's face in a letterbox of green light. Grey, sweating, calm. LEON: "Dale. Let me get the hatch." PRUITT: "Leave the hatch. Look at my arm and then leave the hatch." | Breath, cloth on concrete | f/2.0, grain medium |
| 4 | Insert, 50 mm macro | Tilt down along Pruitt's sleeve | A field dressing gone black, and above it the skin has that dry grey bloom the player has seen on turning bodies all night. | A wet swallow | f/2.0, grain heavy |
| 5 | Two-shot through the slot, 35 mm | Static | LEON: "I have a suppressant." PRUITT: "Nine hours at a time. That's what it buys. I've been in here nine of those." | — | f/2.8 |
| 6 | Close on Pruitt, 50 mm | Slow push-in to a tight single | PRUITT: "Listen while I'm still me. Voss isn't at the port and he isn't on your island. He's in the tower on Crown Street. Floor thirty-five, the lab with his name on the door." | Strip light flickers once on "thirty-five" | f/2.0 |
| 7 | Close on Leon, 50 mm | Static, slight low angle | LEON: "Thirty-five. How do you know that?" PRUITT: "Hale came down here to look at me. He talks when he's frightened. He kept saying it won't matter by six." | — | f/2.0 |
| 8 | Close on Pruitt, 50 mm | Static, he leans into the slot | PRUITT: "Vigor runs the city's water. At six they flush the whole network off one dosing point and Voss puts his work in the line. Every tap, Leon. All five zones before the buses come back." LEON (off): "Two hours." | A clock somewhere in the block, ticking, added here and not before | f/2.0, grain heavy |
| 9 | Medium, 35 mm, Pruitt's side | Static, he sits back out of the light | PRUITT: "Two hours. Ortiz went at the port, Whitlock went in the next cell, and I'm not going to be the thing that gets out of this one." | — | f/2.8 |
| 10 | Close on Leon, 50 mm | Static. Hold on his face three seconds longer than comfortable | PRUITT (off): "You know what I'm asking. Don't make me say it twice, I'm tired." LEON: "I heard you the first time." Nothing moves in Leon's face. | Room tone only. Music out entirely. | f/2.0 |
| 11 | Medium, 35 mm | Static | PRUITT (off): "Good. Then go up, not out. And Leon - the chief is still in this building." | — | f/2.8 |
| 12 | Wide, 24 mm, from the block gate again, matching shot 1 | Very slow pull-back, 10 cm/s, out through the gate | Leon stands, unholsters, and steps into the cell doorway out of frame behind the open door. The gate frame slides in from the right and closes off the view. Fade to black on the empty corridor. **No shot is fired on screen or in sound.** Hold black for 1.5 s. | A single steel bolt. Then room tone. Then nothing. | f/4, grain heavy on the black |

**Unreal setup**

1. Make a Level Sequence `LS_C4_Pruitt` in `/Game/EvilRise/Cinematics/C4/`. Add possessable tracks for `BP_Leon` and `BP_NPC_Pruitt` (a simple skeletal mesh actor in the cell, no AI), plus one Cine Camera Actor.
2. Use a single Cine Camera and animate its transform and Current Focal Length on the camera track, with a Camera Cut track switching between keyed sections. That is cheaper on a 16 GB machine than twelve separate cameras.
3. For shot 12, do not animate a weapon or play any gunshot cue. Add an Event track key at the fade that calls a custom event `OnPruittSceneEnd` in the level blueprint, which sets the three flags on the game instance and shows the objective update.
4. Trigger: a `BP_CutsceneTrigger` box in front of cell 4. On Begin Overlap, check `FLG_C4_BodyCamWatched` on the save subsystem; if true, Set Input Mode UI Only, call Play on the sequence player, and bind the OnFinished delegate to restore player input.
5. Set the sequence to Skippable in your cutscene manager, but make the skip path still fire `OnPruittSceneEnd`, or the player can skip the flags and soft-lock the chapter.

---

### CS_C4_HaleConfession

- **ID:** CS_C4_HaleConfession
- **Trigger:** Leon opens Hale's safe (`FLG_C4_SafeOpen` is set by the safe dial actor).
- **Location:** LOC_C4_ChiefOffice
- **Length:** 2 min 10 s
- **Sets:** FLG_C4_HaleConfessed, FLG_C4_HaleFled

| # | Shot | Camera | Action and dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Close, 50 mm, on the safe dial | Static | The fourth number lands. The handle drops. Inside: a revolver, a box of rounds, a brass maintenance key on a tag. | Mechanism, a heavy clunk | f/2.0, grain light |
| 2 | Medium, 35 mm, Leon kneeling at the safe | Rack focus from Leon to the deep background, where a high-backed chair faces the window | A voice out of the dark side of the room. HALE: "Seven, two, four, one." | Rain on glass, the chair creaks | f/2.0, grain light |
| 3 | Wide, 24 mm, low, from floor height beside the desk | Slow dolly left, revealing the chair | Leon rises and puts the pistol on the chair back. HALE: "Ferris worked it out too. I had him printed for it. Didn't help either of us." | Holster leather, a wet breath | f/2.8 |
| 4 | Over-shoulder on the chair, 35 mm | Static | The chair turns. Hale in shirtsleeves, dress tunic over the arm of the chair, left sleeve cut away and the forearm bandaged to the elbow. He is grey and enormous across the shoulders in a way he was not in the framed photograph. | Chair castors on wood | f/2.8, grain light |
| 5 | Close on Hale, 50 mm | Static, eye level, no low-angle heroics yet | HALE: "Ask it. You came a long way to ask it." LEON: "Did you know what was in the container?" HALE: "I knew it was theirs and I knew not to open it. That was the whole job." | — | f/2.0 |
| 6 | Close on Leon, 50 mm | Static | LEON: "Four payments." HALE: "Six. Two of them got cold feet, not me." | — | f/2.0 |
| 7 | Medium two-shot, 35 mm, across the desk | Slow push-in on the pair | HALE: "You want me to say I did it for the money. I took the money. I did it because a man from a glass building told me a sick city would be a strong city, and I had a budget of nothing and eleven hundred calls a week." | Rain rises | f/2.8 |
| 8 | Close on Leon, 50 mm | Static | LEON: "Then you buried it." HALE: "I put tape on doors and told people not to say the word. I signed an evacuation order for half a city and kept the other half standing at a checkpoint nobody was manning." | — | f/2.0 |
| 9 | Insert, 50 mm macro | Tilt down to Hale's bandaged forearm, which is twitching in a slow rhythm | HALE (off): "Three days ago your man Pruitt grabbed this arm at the port. He was right about everything and I put him in a cell." | A sound under the bandage, fibrous | f/2.0, grain medium |
| 10 | Close on Hale, 50 mm | Begin a slow drift to a low angle as he stands | HALE: "I had four of their injectors. I used the last one at midnight." He looks at the rain. "Voss is going to do it at six whatever happens in this room." | Music enters, one low cello note | f/2.0 |
| 11 | Wide, 24 mm | Handheld begins, small amplitude | Hale knocks the desk lamp over as he passes it, not out of violence, because his arm no longer finishes where he thinks it does. He walks to the back stairwell door. LEON: "Hale. Sit down." HALE: "Not in front of you." | Lamp glass, a door bar slamming | f/4, grain medium |
| 12 | Close on Leon, 35 mm | Static, hold 2 s after the door | Leon looks at the open safe, then takes the revolver and the brass key. | Rain, and three floors down, something heavy going into water | f/2.8, grain medium |

**Unreal setup**

1. Make `LS_C4_HaleConfession`. Bind `BP_Leon`, a cinematic-only `BP_NPC_Hale_Human` (a separate actor from the boss pawn, so the boss stays unspawned), the chair, the desk lamp and one Cine Camera.
2. Put the lamp knock on the lamp's transform track and fire a physics impulse with an Event key instead of simulating through the whole scene; full physics in a sequence desyncs on replay.
3. The confession must play exactly once. Have the safe actor set `FLG_C4_SafeOpen` and call the cutscene manager directly, then set `FLG_C4_HaleConfessed` on finish; gate the trigger on that flag being false.
4. On finish, destroy the cinematic Hale actor and open the back stairwell door collision. Spawn the two Brutes of the following stealth beat here, not earlier, so they are not audible during the dialogue.
5. The revolver and `KEY_C4_SewerKey` are granted by the safe's own interaction, not by the sequence, so a skipped cutscene never costs the player the items.

---

### CS_C4_HaleMutation

- **ID:** CS_C4_HaleMutation
- **Trigger:** Leon reaches the end of the sub-level walkway (`FLG_C4_BasementReached`).
- **Location:** LOC_C4_Basement
- **Length:** 1 min 05 s
- **Sets:** FLG_C4_HaleMutated, starts the boss fight

| # | Shot | Camera | Action and dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Wide, 24 mm, from the walkway rail | Static, high | The long store, flooded to thigh depth, flat black water with one floodlight reflecting in it. Hale stands in the middle of the room with his back to us, tunic floating around him. | Water lapping, a transformer hum from the panels | f/4, grain heavy |
| 2 | Medium, 35 mm, behind Hale | Slow push-in across the water | HALE (not turning): "I can hear your boots. I can hear your heartbeat. That started an hour ago." | His voice has two pitches in it now | f/2.8, grain heavy |
| 3 | Close on Leon, 50 mm, on the stair | Static, low angle | Leon's hand goes to the revolver. LEON: "Then you know how this goes." | Cylinder closing | f/2.0 |
| 4 | Close on Hale's bandaged arm, 50 mm | Handheld, tightening | The dressing splits. What comes out of it is not an arm. It unspools, slick and segmented, and goes into the water. | Wet tearing, bone, a long intake of breath | f/2.0, grain heavy |
| 5 | Wide, 24 mm, low to the waterline | Whip pan following a ripple | The ripple crosses the room and strikes the far wall. A second limb comes out through the back of the tunic. | Impact on concrete, water slap | f/4 |
| 6 | Close on Hale's face, 35 mm | Slow arc around him, 90 degrees, low angle | His jaw is wrong but his eyes are still exactly the eyes from the framed photograph. HALE: "Tell them I said sorry at the end." | One cello note, rising | f/2.0, grain heavy |
| 7 | Close on Leon, 35 mm | Static | LEON: "No." | — | f/2.8 |
| 8 | Wide, 24 mm | Hard handheld, boss-intro low angle | Hale's head goes back and the chest of the tunic opens along the buttons, showing a pale cavity between the ribs that closes again as the limbs come up to guard it. He turns and the water goes white in front of him. | Full boss sting. Low brass, no melody. | f/4, grain heavy |
| 9 | Insert, 50 mm | Quick tilt | Panel A and panel B on the dry walkway, both levers down, a red interlock lamp between them. | Transformer hum isolated for half a second | f/2.8 |
| 10 | Over-shoulder gameplay-matched, 35 mm | Settles into the player camera position and hands off | Control returns with Hale already crossing the room. | Music into fight loop | match gameplay |

**Unreal setup**

1. Make `LS_C4_HaleMutation`. Bind `BP_Boss_Hale` itself this time, not a stand-in, and keep it in a disabled AI state during the sequence so the fight can start from its final pose.
2. The limb reveal is cheapest as two skeletal mesh limbs already on the boss rig, hidden with a Visibility track and revealed on the tear frames, plus a Niagara burst and a water ripple decal. Do not try to simulate cloth and flesh here.
3. End the Camera Cut track by blending to the player camera over 0.4 s (set Blend Type to Ease In Out on the last cut), then call `SetAIState(Combat)` on the boss from an Event key on the final frame.
4. The trigger is the walkway end volume. Before playing, the trigger locks the stair door behind Leon and enables the two panel actors so the arena trick exists from the first second of the fight.
5. Make this one skippable only on a second attempt. Store an int `C4_HaleAttempts` on the save subsystem and pass Skippable true once it is greater than zero, so a player who dies twice is not watching the tear again.

---

### CS_C4_SewerDoor

- **ID:** CS_C4_SewerDoor
- **Trigger:** Leon uses `KEY_C4_SewerKey` on the maintenance door (`FLG_C4_HaleDead` required).
- **Location:** LOC_C4_SewerDoor
- **Length:** 1 min 15 s
- **Sets:** FLG_C4_SewerOpen, FLG_C4_Chapter4Complete

| # | Shot | Camera | Action and dialogue | Sound | DOF / grain |
|---|---|---|---|---|---|
| 1 | Close, 50 mm, on the brass tag | Static | The key from the safe, in Leon's hand, a paper tag reading INTERCEPTOR - DO NOT COPY. | Water draining off his sleeves | f/2.0, grain medium |
| 2 | Medium, 35 mm, on the door | Slow push-in | The key turns. The door is heavier than it looks and he puts a shoulder into it. Air moves out past him and lifts the dust. | Steel on steel, a long low exhale of air | f/2.8, grain medium |
| 3 | Wide, 24 mm, through the doorway | Static | A brick interceptor running away into the dark, water a foot deep in the invert, a ladder of iron rungs on the far side. | Cathedral-sized drip echo | f/4, grain heavy |
| 4 | Medium, 35 mm | Pan from the doorway to the framed works map on the wall | Leon's light crosses the map. The pipe runs north and ends in a rectangle labelled VIGOR BIOTECH - SERVICE LEVEL. He puts two fingers on it. | Boots in water | f/2.8 |
| 5 | Two-shot, 35 mm | Handheld settles as Mara arrives down the back stair with a lamp | MARA: "You smell like a flooded basement." LEON: "There's a reason for that." | Lamp handle, footsteps on steel | f/2.8, grain medium |
| 6 | Close on Mara, 50 mm | Static | She looks at the water, then at him, and does not ask about the cells. MARA: "Six o'clock, you said." LEON: "Two hours, and this comes up inside their building." | — | f/2.0 |
| 7 | Close on Leon, 50 mm | Static | LEON: "Pruitt gave me a floor. Thirty-five." MARA: "Then that's where you go. I'll be in your ear the whole way up." | One sustained low string | f/2.0 |
| 8 | Wide, 24 mm, from inside the pipe looking back | Slow pull-back into the dark | One light steps down into the water and starts north. Mara's lamp stays in the doorway, and the doorway shrinks behind him. | Water, and above it, the first distant siren the city has made all night | f/4, grain heavy |
| 9 | Exterior wide, 24 mm | Static, long lens feel, locked off | Cut up and out: the city roofline in the rain, and Vigor Tower with its crown floors still lit. A clock on a bank tower reads 04:5x. Title card: CHAPTER 5 - THE VIGOR TOWER. | Rain, sting out | f/8, grain heavy |

**Unreal setup**

1. Make `LS_C4_SewerDoor`. Bind `BP_Leon`, `BP_NPC_Mara`, the door actor, the lamp and one Cine Camera. For shot 9, bind a second Cine Camera placed in the city skybox area of the level, or in a small separate sub-level you load for the shot.
2. Drive the door with the sequence's transform track, not with your usual interactable timeline, so the shoulder shove lands on the frame you want.
3. Mara's entrance is just a Transform track plus a looping walk animation; you do not need her AI controller here. Attach the lamp to her hand socket with an Attach track.
4. Trigger: the door's interaction checks `KEY_C4_SewerKey` in inventory and `FLG_C4_HaleDead`, then plays the sequence. On finish, set `FLG_C4_SewerOpen` and `FLG_C4_Chapter4Complete`, autosave through the relay radio save path, and open the level or sub-level for Chapter 5.
5. Keep this one skippable, but put the chapter transition in the OnFinished callback rather than on an Event key near the end, or skipping drops the player in an empty corridor.


## Chapter 5: The Vigor Tower

Five sequences. Shared look: anamorphic 2.39:1, heavy grain in the sewers and service level, grain falling away as the tower gets cleaner and higher, and gone almost entirely by the roof. Dawn light does not arrive until CS_C5_Sunrise — everything before it is sodium orange, lab white and cryo blue.

---

### CS_C5_LabArrival

- **Id:** CS_C5_LabArrival
- **Trigger:** Leon pushes through the service stair door into the tower lobby (overlap volume at the stair head, after `FLG_C5_DosingRigFound`).
- **Location:** LOC_C5_Lobby
- **Length:** 58 s
- **Sets:** FLG_C5_LobbyReached

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Low wide, 24 mm, from the floor behind the stair door | Static, door opens into frame | The service door bangs open. Leon's boots come through first, sewer water running off him onto polished stone. | — | Door clang with a long marble tail, water dripping, the hum of a building that still has power | Deep focus, grain 0.45 and dropping |
| 2 | Medium, 35 mm, tracking in front of Leon | Slow backward dolly | Leon walks into the lobby proper and slows. The place is spotless. Glass, a water feature still running, a Vigor logo in brushed steel three storeys high. | LEON: "Huh." | Water feature, a lift chime somewhere above, no screaming at all | Shallow, logo soft behind him |
| 3 | Insert, 85 mm | Slow push-in | The containment notice cycling on a lobby screen, and the second panel with a chair through it. | — | Soft electronic cycle tone | Very shallow, screen glow blooming |
| 4 | Over-shoulder, 50 mm | Handheld, small | Leon's light finds the security desk. Marchetti is in his chair, head back, badge still clipped on. Two security Husks stand motionless at the far shutters, facing the glass, waiting for nothing. | — | A low collective breathing, three sources, not in sync | Shallow, the two shapes soft |
| 5 | Wide, 28 mm, from behind the Husks | Static, low | Leon lowers himself behind the reception counter without a sound. Thirty-one floors of lit windows rise outside the glass behind him. | LEON (radio, low): "Mara. I'm inside. It's clean in here." | Rain gone, only the hum | Deep, grain 0.2 |
| 6 | Close, 65 mm | Slow push to eyes | Leon looking up through the atrium at floor numbers climbing out of sight. | MARA (radio): "Clean how?" / LEON: "Like they're expecting a nine o'clock meeting." | Mara's line thin and filtered, then the hum alone | Very shallow |
| 7 | Crane up, 24 mm | Fast rise, then hold | Camera leaves Leon small on the lobby floor and climbs the atrium void to a single lit floor far above: 35. Cut to black on the hum. | — | Hum rises in pitch, one soft piano note, out | Deep, grain 0.15 |

**Unreal setup**
1. Make `/Game/EvilRise/Cinematics/C5/LS_C5_LabArrival` as a Level Sequence, and open it in Sequencer.
2. Bind three actors from the lobby level: `BP_Leon` (possessable, so it is the real player actor), `BP_Husk_Security` x2 placed at the shutters, and `SKM_Marchetti_Corpse`. Add a Camera Cut track and seven Cine Camera Actors, one per shot, instead of moving one camera around — it is far easier to tweak later.
3. For shot 7, put the Cine Camera on a Camera Rig Rail running up the atrium and animate the rail's **Current Position on Rail** value, not the camera transform.
4. Trigger: in `BP_C5_StairHeadTrigger`, on Begin Overlap, check the actor is the player, then `Create Level Sequence Player` (or a Level Sequence Actor already in the level) and call **Play**. Before Play, call `Disable Input` on the player controller; on the sequence's **OnFinished** event call `Enable Input` and `Set Flag (FLG_C5_LobbyReached)` in your game instance.
5. Set the Level Sequence Actor's **Auto Play** to false, or it fires the moment the level loads.

---

### CS_C5_VossReveal

- **Id:** CS_C5_VossReveal
- **Trigger:** Leon steps out of the freight lift onto floor 35 with `FLG_C5_CompB` and `FLG_C5_CompC` set.
- **Location:** LOC_C5_Floor35_CrownLab
- **Length:** 1 min 50 s
- **Sets:** FLG_C5_CrownLabReached, FLG_C5_VossRevealed

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Wide, 21 mm, from inside the lift car | Static, doors part | The doors open on the Crown Lab: a glass drum of a room, four three-storey water tanks lit from below, the city black beyond the windows. | — | Lift doors, then an enormous quiet with water moving in glass | Deep, grain 0.1 |
| 2 | Medium, 40 mm, behind Voss | Very slow push-in | Voss stands at the synthesis rig in shirtsleeves, writing on a card. He does not turn. | VOSS: "You're wet. There's a towel by the sink, I'm not joking, it's a clean room." | A pen on card. Water. | Shallow, Leon soft in the doorway |
| 3 | Over-shoulder on Leon, 50 mm | Handheld, tight | Leon's pistol comes up level. | LEON: "Dr. Voss. Step away from the console." | Holster leather, slide settling | Shallow |
| 4 | Two-shot, 35 mm, profile | Slow arc left | Voss finally turns. Reading glasses, tired eyes, no fear in him at all. He gestures at the locked console like a man showing off a quiet appliance. | VOSS: "It's locked and the timer doesn't care about either of us. Sit down. You've come a long way to arrest a man about water." | — | Mid, both held |
| 5 | Close on Leon, 85 mm | Static | Leon does not lower the gun. | LEON: "The port. The island. Your fourteen people on floor thirty-one. That's not water, that's a body count." | — | Very shallow |
| 6 | Close on Voss, 85 mm | Slow push | Voss accepts the number without flinching, almost gratefully. | VOSS: "A count of the weak. I did not choose who it takes, Agent. It chooses. I only stopped apologising for the choice." | Tank water, one deep knock in the pipes | Very shallow |
| 7 | Medium, 50 mm | Static, low angle on Voss | Leon changes the subject and finds the one crack there is. | LEON: "Calder didn't stop apologising. That's why she's in the harbor." / VOSS: "Don't. You've read her diary, you haven't read her." | Voss's voice tightens one notch | Mid |
| 8 | Wide, 24 mm | Static | Voss walks away from the rig, past Leon, unhurried, and stops at the tank glass with his back to him. The shot holds the whole absurd room: a man with a gun, a man looking at fish-tank light. | VOSS: "Build it, if you can. You can't, but build it. I'd like to see the sequence I buried come up out of the ground after me." | Footsteps on seamless floor | Deep, grain 0.1 |
| 9 | Insert, 100 mm macro | Slow drift | On Voss's desk: the roof access card, and under it the corner of an unsent letter. | — | Paper settling | Razor thin |
| 10 | Close on Leon, 65 mm | Static, hold on the decision | Leon's eyes go from Voss, to the rig, to the three ports. He lowers the pistol an inch. | LEON (quiet): "Watch me." | One piano note, out | Very shallow |

**Unreal setup**
1. Make `/Game/EvilRise/Cinematics/C5/LS_C5_VossReveal`. Keep `BP_Voss_Human` as a **spawnable** in the sequence, and hide the gameplay Voss actor until the sequence finishes — otherwise you will see two of him for a frame.
2. Bind `BP_Leon` as possessable, and bind the desk props (`BP_RoofCardPickup`, `SM_UnsentLetter`) so shot 9 can animate a light on them without touching the level lighting.
3. Shot 4's arc is easiest as a Camera Rig Crane with a short rail; animate only the crane's Pitch and Yaw tracks so the move cannot drift off the floor.
4. Dialogue: one Audio track per line, and keep each line as its own Sound Wave named after its narrative id (`DLG_C5_VossReveal_01` and so on). Add a Skeletal Animation track per character and line up the face animation to the audio section start, not to the shot start.
5. Trigger: `BP_C5_Floor35Trigger`, on Begin Overlap, branch on `FLG_C5_CompB AND FLG_C5_CompC`; if true, Play and set `FLG_C5_VossRevealed`; if false, print the "the lift will not stop here yet" prompt and do nothing.

---

### CS_C5_FinalTransformation

- **Id:** CS_C5_FinalTransformation
- **Trigger:** the synthesis rig's 90-second cycle completes and Leon draws the dose (`FLG_C5_AntidoteMade`).
- **Location:** LOC_C5_Floor35_CrownLab
- **Length:** 1 min 15 s
- **Sets:** FLG_C5_VossPhase1Start

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Insert, 100 mm macro | Static | The rig hood lifts. A single amber dose sits in the output port. Leon's gloved hand draws it into an injector. | — | Pneumatic hiss, glass on steel, a clean click | Razor thin |
| 2 | Close on Leon, 85 mm | Slow push | He looks at it for exactly one second too long. | LEON: "That's for the city, not for you." | — | Very shallow |
| 3 | Wide, 28 mm | Static | Behind him, across the lab, Voss has a drum of concentrate up on the bench and the cannula already in his own arm. | VOSS (off): "You built it. You actually built it." | A pump priming | Deep |
| 4 | Medium, 50 mm, low angle | Slow rise | Voss, calm, hand on the valve. He is not raving. He is relieved. | VOSS: "Then give it to me. Not the city. Me. I want to know if it works." | Liquid moving in a line | Mid |
| 5 | Close on Leon, 65 mm | Static | LEON: "It works." He does not move toward him. | LEON: "It works." | — | Very shallow |
| 6 | Close on Voss, 85 mm | Handheld begins, a small tremor | Voss opens the valve. Four seconds of nothing. Then his pupils blow out and his hand closes on the bench edge hard enough to dent it. | VOSS (strangled): "Ines — " | A wet structural crack, far too deep for a human chest | Very shallow, first shake |
| 7 | Dutch wide, 24 mm | Violent handheld | He comes off the floor. The shirt goes. Tentacle limbs come out of the back and shoulders and take the bench, the stool, the ceiling rail. A glowing core shows through the sternum and then closes over. | — | Three layers: bone, tearing cloth, and a pipe-organ roar an octave below where a voice should be | Deep, grain jumps to 0.6 |
| 8 | Low angle, 18 mm, right at his feet | Static, long lens flare from the tank lights | Voss stands up to his full new height. The lab lights behind him throw his limbs across all four water tanks. | — | The roar resolves into something almost like breathing | Deep, heavy grain |
| 9 | Close on Leon, 50 mm | Handheld, pistol coming up | Leon pockets the injector, buttons the pocket, and takes one step back into cover. | LEON: "All right." | Boot scuff, magazine check | Shallow, cut hard to gameplay |

**Unreal setup**
1. Make `/Game/EvilRise/Cinematics/C5/LS_C5_FinalTransformation`. Finish it on a hard cut with **no fade** so gameplay resumes on the same frame — a fade here kills the shock.
2. Use two actors, not a morph: hide `BP_Voss_Human` at shot 7 and spawn `BP_Voss_Mutant` on the same transform in the same frame, covering the swap with the camera shake and a particle burst. A single skeleton that does both is more work than this chapter needs.
3. Build the handheld shake as one Camera Shake asset (`CS_HandheldViolent`) and add it to the Camera Shake track for shots 7 and 8, rather than hand-keying noise.
4. On **OnFinished**: set `FLG_C5_AntidoteMade` if the puzzle Blueprint has not already, set `FLG_C5_VossPhase1Start`, call `Enable Input`, and have `BP_Voss_Mutant` enter its Phase 1 behaviour tree.
5. Put the boss music start on an Audio track inside the sequence at shot 7, not in the level Blueprint, so the music and the transformation can never drift apart.

---

### CS_C5_Sunrise

- **Id:** CS_C5_Sunrise
- **Trigger:** the roof manifold puzzle resolves correctly and the dosing pump starts (`FLG_C5_AntidoteReleased`).
- **Location:** LOC_C5_Roof
- **Length:** 1 min 30 s
- **Sets:** FLG_C5_Sunrise, FLG_C5_AllClearGiven

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Insert, 85 mm | Static | Leon's hand on the third brass handle. He turns it. A needle on the manifold gauge lifts off zero and holds. | — | Brass on brass, then water taking the line, a long rising note of pressure | Shallow |
| 2 | Medium, 40 mm | Slow pull back | Leon straightens up in the plant room doorway. His jacket is torn open at the shoulder, his hand is shaking, and he lets it. | — | Pump running steady | Shallow |
| 3 | Wide, 24 mm, from the roof edge | Slow dolly right | Marrow Bay from thirty-five floors up. Smoke in two places, the sodium grid still on, and the river mouth going from black to pewter. | MARA (radio): "Leon. The crew's got movement on the north readout. Whatever you put in that pipe, it's moving." | City air, very high wind, radio hiss | Deep, grain 0.1 |
| 4 | Close on Leon, 65 mm | Static | He closes his eyes for a second. | LEON: "Then it's in the city. Tell the shelters to drink the water." | — | Very shallow |
| 5 | Wide, 28 mm, Leon small against the sky | Static, hold | The first real light comes over the far headland and runs along the rooftops toward him. | MARA (radio): "Marrow Bay, all stations, this is Halvern Harbor Radio. The water is clear. Repeat, the water is clear." | Her voice goes out across a dozen other speakers in the distance, half a beat behind itself | Deep, grain gone |
| 6 | Over-shoulder, 50 mm | Very slow push past him | Leon looks down at the plaza, where a handful of people have come out of a shelter doorway to stand in the light. | MARA (radio): "Leon. Is he done?" | Distant voices, a dog | Mid |
| 7 | Close, 85 mm | Static, warm light raking his face | A breath. Not a smile. | LEON: "He's done. Come up and see the light, Mara. You earned the view." | — | Very shallow |
| 8 | Crane wide, 21 mm | Slow rise and tilt up | Camera leaves him at the parapet and climbs until the tower, the river and the island are all in frame, sunrise flooding all three. | LEON: "Six twelve. He had the time right." | One sustained string note, clean | Deep, no grain |

**Unreal setup**
1. Make `/Game/EvilRise/Cinematics/C5/LS_C5_Sunrise`. Animate the sunrise by keying the **Directional Light's** Rotation and Intensity and the **Sky Atmosphere** on tracks inside this sequence; do not try to drive it from a day-night Blueprint, because you want it to look right in these eight shots only.
2. Bind `BP_Leon`, `BP_ManifoldPanel` (for the gauge needle in shot 1) and the `BP_ShelterCrowd` group used in shot 6. Spawn the crowd as a spawnable so they do not stand there during the fight.
3. Mara is radio only, so there is no actor to bind — put her lines on an Audio track with the `Radio_Filter` Sound Class so they match her in-gameplay voice.
4. Shot 5's echo is two copies of the same Sound Wave, the second one offset about 0.4 s and attenuated, placed on a second Audio track.
5. On **OnFinished**, set `FLG_C5_Sunrise` and `FLG_C5_AllClearGiven`, then immediately play `LS_C5_MissingVial` — chain them from the first sequence's OnFinished event so the ending cannot be interrupted by player input.

---

### CS_C5_MissingVial

- **Id:** CS_C5_MissingVial
- **Trigger:** chained directly off CS_C5_Sunrise's OnFinished. Not skippable.
- **Location:** LOC_C5_Floor35_CrownLab (empty, no characters)
- **Length:** 40 s
- **Sets:** FLG_C5_VialMissing, FLG_C5_ChapterComplete

| # | Shot | Camera | Action | Dialogue | Sound | DoF / grain |
|---|---|---|---|---|---|---|
| 1 | Wide, 28 mm | Static, long hold | The Crown Lab after everything. Water two inches deep across the floor, a tank frame down, dawn coming sideways through the glass. No one in the room. | — | Water dripping. The building hum has stopped. | Deep, grain 0.15 |
| 2 | Medium, 50 mm | Slow dolly in on the archive cabinet | A steel cold cabinet against the far wall, door ajar, breathing frost into warm air. | — | A faint cryo tick | Mid |
| 3 | Insert, 100 mm macro | Very slow push | Inside: a rack of 2 ml vials in neat rows, frosted, all labelled V-7 / GTC / S7. | — | Tick. Drip. | Razor thin |
| 4 | Insert, 100 mm macro | Push continues, settles | The push settles on one empty slot in the middle of the rack. The frost in that slot has melted into a clean ring. Something sat there until recently. | — | Silence lands on the shot | Razor thin |
| 5 | Close on the ledger, 85 mm | Static | The sample ledger on the shelf above: CAST 40 — IN RACK 39, gone over twice in a second pen, with a question mark beside it. | — | One low sub hit | Shallow |
| 6 | Wide, 24 mm | Static, slow fade to black | The lab, the open cabinet, the light rising. Hold four seconds. Cut to the chapter card. | — | Out. Then, over black, a single door closing somewhere a long way off. | Deep, grain 0.2 |

**Unreal setup**
1. Make `/Game/EvilRise/Cinematics/C5/LS_C5_MissingVial`. There are no characters in it, so bind only props: `BP_ColdCabinet`, `SM_VialRack` and `SM_SampleLedger`.
2. Build the rack as one Static Mesh with 40 vial instances and simply **hide one instance** in the construction script. Do not try to light one empty hole in a single baked mesh.
3. Shots 3 and 4 are one continuous camera move split by a Camera Cut, so use a single Cine Camera on a short rail and cut between two Camera Cut sections of the same camera — the audience reads it as a push that cannot stop.
4. Set the sequence to not skippable (do not bind any skip input during it) and on **OnFinished** set `FLG_C5_VialMissing` and `FLG_C5_ChapterComplete`, then open your chapter-end credits level or widget.
5. Keep the frost ring in shot 4 as a small decal with its own material instance, so you can dial the opacity until the empty slot reads at a glance on a 1080p screen.
