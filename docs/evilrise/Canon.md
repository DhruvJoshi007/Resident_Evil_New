# EvilRise: canon notes, fixes and ID registry

This file is the single reference that every other EvilRise document and data table follows. Your story bible is in [StoryBible.md](StoryBible.md), word for word. Where the bible was unclear or contradicted itself, the fix I applied is listed below. Each fix has a number, so you can veto it by number (for example, "undo F3").

## Fixes I applied (veto any of them)

| # | Problem in the bible | Fix I applied |
|---|---|---|
| F1 | No scene shows how the virus spreads. | Added the **Tape 02:14** cutscene in Chapter 1. Leon plays the security camera log in the dock office. On the tape, two night workers open a sealed Vigor container. A frail old watchman breathes the mist and turns first. He bites a strong dockworker, who turns faster and much stronger. The Chapter 3 Patient Zero footage still covers where it began in the lab. |
| F2 | "Leon" is the first name of a famous Resident Evil hero, which breaks your own naming rule. | **Kept Leon Cater as you asked**, but flagged. Renaming means changing one row in `DT_Characters` plus a find-and-replace in the data files. My suggestion would be Cole Cater. |
| F3 | V-7 "only takes hold in low-vitality people", yet dockworkers, guards, Hale and Leon all get infected. | There are two routes. **Exposure** (the mist, contaminated water) takes hold only in low-vitality people. **A bite** injects a full dose that infects anyone. This is how the strong get infected, and why they become the dangerous ones. |
| F4 | The Reborn rule's scope is unclear. | Only **Husks and Drowned** can rise as Reborn. Brutes, Reborn and bosses never rise. A Reborn that dies stays dead. A corpse twitches for about 6 to 8 seconds before it rises. |
| F5 | "Fire" and "melee finisher" are not defined. | **Finisher:** the knife stomp-and-stab on a downed or twitching body (F). **Fire:** flare gun rounds (from Chapter 2) and burning fuel spills. **Head destruction:** any killing blow to the head. |
| F6 | Leon's treatment item is not named. | **V-7 Suppressant**, a Vigor auto-injector. It resets the infection meter to zero but does not cure V-7. It is rare and found in medical areas and Vigor kits. The antidote in Chapter 5 is the real cure. |
| F7 | Weapons beyond the pistol are not listed. | Knife and pistol (start), shotgun (Ch1, in Pruitt's team case), flare gun (Ch2), rifle (Ch3), revolver (Ch4, Hale's safe). |
| F8 | Batteries, scrap and gunpowder have no use. | **Battery:** flashlight charge. **Gunpowder:** crafts pistol ammo. **Gunpowder + Scrap:** shotgun shells. **Scrap:** repairs the knife, or makes a noise lure for stealth. |
| F9 | Mara's whereabouts and secret are unclear. | Mara is the harbor radio operator. She sent the original distress call and is trapped in the **harbor radio station on Saltmere Point**, guiding Leon by radio. In Chapter 3 she comes down into the Annex through the church crypt lift. **Her brother Owen Quinn** was a Vigor lab technician. He is the dead technician carrying the keycard in Chapter 3. Owen warned her a container was coming and she said nothing. That is her secret and her guilt. |
| F10 | Pruitt's fate and payoff are unclear. | **Ch1:** Leon finds Pruitt's crushed radio, his team's gear case and a blood trail, but no body. **Ch4:** a dead officer's body camera shows Hale's officers taking Pruitt at the port. Leon finds Pruitt in the station holding cells, bitten and near the end. Pruitt tells him where Voss is and what Voss plans. Pruitt asks Leon not to let him turn, and Leon keeps his word off-screen. |
| F11 | Hale's guilt is revealed three times. | Each chapter adds a new layer. **Ch2:** the photo shows Hale and Voss know each other. **Ch3:** Hale's signature is on the shipment clearance. **Ch4:** the payments ledger and his confession show he took money and buried the outbreak. |
| F12 | Antidote component A is found in the Annex, but Chapter 5 says A, B and C come from three lab floors. | **A** comes from the Annex cold vault (Ch3). **B** and **C** come from two tower lab floors. The third tower floor, Voss's Crown Lab, has the synthesis machine. |
| F13 | Leon "steers" the raft while Mara "handles the oars". | Mara rows and steers. Leon calls left or right (the player's input) and shoots. |
| F14 | "Grey tide light" on the island comes before the city's night streetlights. | The island is lit by cold moonlight through fog and the sweep of the lighthouse beam. Grey dawn only begins in Chapter 5. |
| F15 | Voss's water plan is not stated. | Vigor runs the city's water treatment contract. At dawn, Voss plans to release concentrated V-7 into the Marrow Bay supply, to "lift" the weak overnight. The ending turns his own system against him by releasing the antidote through the same line. |
| F16 | The save point and item box are undefined. | **Relay radio**: Leon checks in with Mara to save. **Supply locker**: a shared item box in every safe room. Neither copies another game's save item. |
| F17 | The strain getting stronger is not quantified. | Infected health and damage scale by chapter: ×1.0, ×1.15, ×1.3, ×1.5, ×1.7. |
| F18 | Hale's mutated fight needs a reason he is infected. | Hale was bitten at the port during the seizure of Pruitt's team. He hid the bite with suppressant stolen from Vigor shipments, then ran out. |

## Timeline (one night into dawn)

| Time | Event |
|---|---|
| 8 months before | A V-7 trial at the Saltmere Annex goes wrong. Subject 7 (Patient Zero, Ezra Penhallow, a dying fisherman) kills two staff. Vigor seals the Annex and moves the work to Vigor Tower. |
| 3 weeks before | Dr. Ines Calder, Voss's assistant, hides her diary pages on Saltmere and is found drowned in the harbor. |
| 3 days before | Owen Quinn is sent to the sealed Annex to recover samples. He radios his sister Mara: a container is coming through the port, and nobody should open it. |
| Night before, 02:14 | At Port Halvern Yard C, night workers Tom Begg and Dan Kelso pry open Vigor container **VGR-7718**, which is listed as "medical supplies". Cold mist leaks out. |
| 02:31 | The watchman, **Bert Linnane** (71, sick and exhausted), collapses in the mist. |
| 02:58 | Bert rises and bites Dan Kelso, who came back to help him. |
| 03:40 | Dan Kelso turns. He is faster and stronger, and he forces a locked gate open. By dawn the port is lost. |
| Day before, 09:10 | Mara sends the distress call from Halvern Harbor Radio on Saltmere Point. |
| 13:00 | Agent **Dale Pruitt**'s contact team (Pruitt, Lena Ortiz, Sam Whitlock) lands at the port. |
| 17:40 | Pruitt's last call: "Port police are here. Hale's people. They're taking the container." Then nothing. |
| Story night, 22:30 | **Ch1:** Leon lands on the north pier. |
| 00:40 | **Ch2:** Leon crosses to Saltmere Island. |
| 02:10 | **Ch3:** the Annex beneath the island, then the raft through the sea cave. |
| 04:00 | **Ch4:** Marrow Bay, from the shore to the police station. |
| 05:20 | **Ch5:** Vigor Tower. Sunrise is at 06:12. |

## Cast registry

| ID | Name | Role |
|---|---|---|
| CHR_Leon | Leon Cater | Player. Federal agent, former tactical team member, mid-30s. Calm, dry, controlled. |
| CHR_Mara | Mara Quinn | Harbor radio operator. Guides Leon by radio in Ch1 and Ch2, joins him on the raft at the end of Ch3, then runs the relay radio at the police station in Ch4 and Ch5. |
| CHR_Voss | Dr. Elias Voss | Vigor Biotech lead scientist. The final boss. |
| CHR_Hale | Chief Warren Hale | Marrow Bay police chief, bought by Vigor. Boss in Ch4. |
| CHR_Calder | Dr. Ines Calder | Voss's assistant. Dead before the story begins. Speaks through her diary and through Voss's message. |
| CHR_Pruitt | Agent Dale Pruitt | Leader of the lost contact team. Clues in Ch1, payoff in Ch4. |
| CHR_Owen | Owen Quinn | Mara's brother, a Vigor technician. Dead in the Annex (Ch3). |
| CHR_Bert | Bert Linnane | Port watchman, the first to turn (Tape 02:14). |
| CHR_Kelso | Dan Kelso | Dockworker, bitten by Bert. Appears in Ch1 as a strong Husk. |
| CHR_Begg | Tom Begg | Night worker who opened the container. Appears on the tape. |
| CHR_Varga | Dmitri Varga | Night-shift operator of Crane 3. Becomes **the Hookman**. |
| CHR_Ortiz, CHR_Whitlock | Lena Ortiz, Sam Whitlock | Pruitt's team. Found dead in Ch1 and Ch4. |
| CHR_Penhallow | Ezra Penhallow | Subject 7, Patient Zero (Ch3 footage). |
| CHR_Pilot | Hank Doyle | Boat pilot who drops Leon off in Ch1. |
| CHR_Ruiz | Officer Ana Ruiz | Dead officer whose body camera Leon finds in Ch4. |

## Enemy registry

| ID | Name | Notes |
|---|---|---|
| ENM_Husk | Husk | Slow walker. Frail people (elders) are weak; strong people (workers, guards) are tough. Can rise as a Reborn. |
| ENM_Reborn | Reborn | Rises from an unfinished Husk or Drowned. Tentacle lashes at 1.5 to 4 m. Never rises again. |
| ENM_Drowned | Drowned | Lurks in water and grabs from the shallows. Can rise as a Reborn. |
| ENM_Brute | Brute | Armored, slow, hits hard. From Ch3. |
| BOSS_Hookman | The Hookman | Ch1, Dmitri Varga. |
| BOSS_BrineMaw | Brine Maw | Ch2 sea creature. |
| BOSS_Warden | The Warden | Ch3, an Annex security chief turned Brute. |
| BOSS_Undertow | The Undertow | Ch3 sea boss in the raft fight. |
| BOSS_Hale | Chief Hale | Ch4. |
| BOSS_Voss | Dr. Voss | Ch5 final boss, three phases. |

## Item registry

**Consumables:** ITM_HerbGreen, ITM_HerbRed, ITM_MixGG, ITM_MixGR, ITM_Bandage, ITM_FirstAidSpray, ITM_Suppressant, ITM_Battery, ITM_Gunpowder, ITM_Scrap, ITM_NoiseLure.

**Ammo:** AMMO_Pistol, AMMO_Shells, AMMO_Flare, AMMO_Rifle, AMMO_Revolver.

**Weapons:** WPN_Knife, WPN_Pistol, WPN_Shotgun, WPN_FlareGun, WPN_Rifle, WPN_Revolver.

**Key items**, by chapter (a special room is listed where the item is found in one):

| Ch | ID | Name | Where |
|---|---|---|---|
| 1 | KEY_C1_Fuse | Crane Fuse | Break Room |
| 1 | KEY_C1_ShutterKey | Cargo Shutter Key | Dropped by the Hookman |
| 1 | WPN_Shotgun | Shotgun (Pruitt's team case) | Customs Cage (special room, code 0214) |
| 2 | KEY_C2_HymnSheet | Hymn Sheet "Low Tide" | Calder's house cellar |
| 2 | KEY_C2_BellKey | Bell Tower Key | Revealed by the organ |
| 2 | KEY_C2_SluiceWheel | Sluice Gate Wheel | Bell tower (special room) |
| 2 | KEY_C2_LensCrank | Lens Crank | Fish market cold store |
| 2 | WPN_FlareGun | Flare Gun | Harbor master's hut |
| 3 | KEY_C3_KeycardB2 | Level B2 Keycard | On Owen Quinn's body |
| 3 | KEY_C3_AntidoteA | Antidote Component A | Cooling chamber cold vault (special room) |
| 3 | KEY_C3_MasterKey | Annex Master Key | Security office (special room) |
| 3 | WPN_Rifle | Rifle | Annex armory (special room) |
| 4 | KEY_C4_BodyCam | Officer Ruiz's Body Camera | Street, on Ruiz's body |
| 4 | KEY_C4_EvidenceKey | Evidence Room Key | Archive |
| 4 | KEY_C4_PrintCard | Fingerprint Card | Evidence room |
| 4 | KEY_C4_Ledger | Payments Ledger | Evidence room locker |
| 4 | KEY_C4_SewerKey | Sewer Door Key | Hale's safe (special room) |
| 4 | WPN_Revolver | Revolver | Hale's safe |
| 5 | KEY_C5_AntidoteB | Antidote Component B | Floor 31, Genetics Lab (special room) |
| 5 | KEY_C5_AntidoteC | Antidote Component C | Floor 33, Cryo Lab (special room) |
| 5 | KEY_C5_Antidote | V-7 Antidote | Synthesis machine, Crown Lab |
| 5 | KEY_C5_RoofCard | Roof Access Card | Voss's desk |

## Location registry

- **Ch1:** LOC_C1_Pier, LOC_C1_DockOffice (safe room), LOC_C1_Warehouse, LOC_C1_BreakRoom, LOC_C1_CustomsCage, LOC_C1_ControlHouse, LOC_C1_Yard, LOC_C1_BoatDock.
- **Ch2:** LOC_C2_Landing, LOC_C2_FloodedStreet, LOC_C2_FishMarket, LOC_C2_CalderHouse, LOC_C2_CalderCellar, LOC_C2_Church (safe room in the vestry), LOC_C2_BellTower, LOC_C2_HarborMasterHut, LOC_C2_Harbor, LOC_C2_Lighthouse, LOC_C2_HiddenStair.
- **Ch3:** LOC_C3_Tunnel, LOC_C3_Reception, LOC_C3_CryptLift, LOC_C3_Labs, LOC_C3_Whiteboard, LOC_C3_CoolingChamber, LOC_C3_ColdVault, LOC_C3_SecurityWing, LOC_C3_Armory, LOC_C3_Ward (patient ward, the Patient Zero footage), LOC_C3_LowerLevels, LOC_C3_SeaCave.
- **Ch4:** LOC_C4_Shore, LOC_C4_HarborAve, LOC_C4_Plaza, LOC_C4_StationLobby (safe room), LOC_C4_Archive, LOC_C4_EvidenceRoom, LOC_C4_DetectiveOffice, LOC_C4_ChiefOffice, LOC_C4_HoldingCells, LOC_C4_Basement, LOC_C4_SewerDoor.
- **Ch5:** LOC_C5_Sewers, LOC_C5_ServiceLevel, LOC_C5_Lobby (safe room), LOC_C5_Floor31_Genetics, LOC_C5_Floor33_Cryo, LOC_C5_Floor35_CrownLab, LOC_C5_Roof.

## Flags

Flags are named `FLG_C<chapter>_<Thing>`. For example: FLG_C1_TapeWatched, FLG_C1_PowerRestored, FLG_C1_FirstReborn, FLG_C1_HookmanDead, FLG_C3_ColdShockKnown, FLG_C4_PruittFound, FLG_C5_AntidoteMade.

## Chapter 1 as built in the browser build (other docs must match)

- **Arrival (CS_C1_Arrival):** Hank Doyle's boat noses up to the north pier in rain.
  - HANK: "This is as close as I go."
  - LEON: "Pruitt's team came in here?"
  - HANK: "Noon yesterday. Nobody's called since."
  - LEON: "Then somebody should."

  Hank backs away into the fog.
- **First radio call (RAD_C1_MaraFirst),** on the pier:
  - MARA: "Port channel, anyone. This is Halvern Harbor Radio. Please."
  - LEON: "Agent Cater, federal. I'm on the north pier."
  - MARA: "Federal. The last ones stopped answering."
  - LEON: "That's why I'm here."
  - MARA: "I'm Mara. I'm across the river on Saltmere. I can see your flashlight."
  - LEON: "Then you know I'm alone. Talk me through it."
- **Pier:** Pruitt's crushed radio and a blood trail. A Husk is feeding on a body there.
- **Dock Office (safe room):** relay radio save point, supply locker, cargo manifests, and the CCTV monitor that plays **Tape 02:14 (CS_C1_Tape0214)**.
  - After the tape: LEON: "Old man went first. The big one went faster."
  - MARA: "Owen said not to open anything." She catches herself: "Never mind."

  This is the first hint of her secret.
- **Warehouse 3:** tutorial stealth among slow Husks.
- **Break Room:** the Crane Fuse, and the shift rota board (Crane 1 day / Abel, Crane 2 swing / Sully, Crane 3 night / Dmitri). A guard's corpse here rises as the first Reborn if the player has not already caused one (**CS_C1_FirstReborn**).
- **Customs Cage (special room):** keypad, code **0214**. A note scratched by Pruitt reads "CAGE = WHEN IT OPENED". Inside: Pruitt's team case (shotgun, shells), V-7 Suppressant, and Ortiz's field notes.
- **Crane Control House:** insert the fuse, then bring the cranes up in shift order "starting with whoever's on now". It is night, so the order is **C3, C1, C2**. A wrong order trips the breaker, which is loud and draws Husks. Power opens the yard gate and wakes the yard crane.
- **Container Yard:** **CS_C1_HookmanIntro**, where a hook smashes through a shed's roller shutter and the Hookman drags himself out. The open container VGR-7718 stands here. The arena trick is a crane-hung container over a hazard-striped drop zone, released by a lever at the crane leg (two uses).
- **Hookman:** he throws the hook at range. If it misses, it bites into steel and he overreaches, stuck and pulling for about 2.5 seconds. The growth on his back is then exposed. When killed he drops the Cargo Shutter Key.
- **Boat Dock:** **CS_C1_BoatDeparture**:
  - MARA: "Saltmere's the lights across the river. I'm on the point, in the radio station."
  - LEON: "Keep the lights on."
  - MARA: "They're all I've got."
