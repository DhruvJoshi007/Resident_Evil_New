# VEILFALL: Cutscene Script

All cutscenes are built in Unreal's **Level Sequencer**, using in-engine characters and the level's lighting. They are skippable after the first view, and every line has a subtitle with the speaker's name.

**ID format:** `C<chapter>-<number>`. Asset name: `LS_C1_01_Arrival` in `Content/Veilfall/Cinematics/Chapter01/`.

**Shot shorthand:** WS = wide shot, MS = medium shot, CU = close-up, ECU = extreme close-up, OTS = over the shoulder, POV = point of view, TRACK = camera moves with the subject.

**Standard numbering in each chapter:** 01 arrival, 02 first new threat, 03 story beat, 04 boss intro, 05 boss defeat, 06 escape route. Chapter 5 adds 07 to 09.

---

## Chapter 1: Quarantine

### C1-01 Arrival (90 s)
1. **WS, aerial:** Harrow Bay at night in the rain. Smoke columns. A floodlit quarantine wall.
2. **MS:** Mara's rescue truck stops at a checkpoint. A soldier in a gas mask waves her back.
   - SOLDIER: "City's closed. Turn around."
   - MARA: "My brother's in there."
   - SOLDIER: "Then he's not your problem anymore."
3. **TRACK:** Mara drives off and parks out of sight. She climbs down into a drainage culvert with her flashlight.
4. **CU:** she checks her phone. The screen shows "Theo: 14 missed calls (yours)". She puts it away.
5. **WS:** she comes out onto Kettle Street. Burning barricades and an empty bus. A distant scream. **Hand over to gameplay** as the camera settles behind her shoulder.

### C1-02 The officer turns (40 s)
1. **MS:** a wounded officer, Hale, is slumped against the briefing room desk.
   - HALE: "Don't... come closer. They bit me. It's in the water, I think..."
2. **CU:** his eyes go grey. Veins darken up his neck.
3. **OTS (Mara):** he stands, slowly. MARA: "Officer? Hale?"
4. **ECU:** his jaw drops open too wide. **Hand over to gameplay** (forced fight tutorial).

### C1-03 Pike's first call (in-game radio, 30 s)
Plays over gameplay in the lobby safe room.
- PIKE: "Hey! You on the ground floor! This is Sergeant Pike, up in the radio tower. You're the first living thing I've seen in two days."
- MARA: "I'm looking for Theo Kessler. He's twenty-four, dark hair..."
- PIKE: "Kid, I'm looking at a city full of folks nobody's looking for. But I'll help you. The Chief's armoury'll get you something bigger than that pea-shooter."

### C1-04 The Warden (30 s)
1. **WS:** the cell block. Every cell door is open except one.
2. **MS:** Mara walks in. Behind her, the main gate slams shut.
3. **CU:** a riot shield scrapes along the bars. The Warden steps into the light, his shield fused into his forearm, growths pulsing on his neck.
4. **Low angle:** he raises his baton and roars. **Boss fight.**

### C1-05 Warden defeat (20 s)
1. **MS:** the Warden staggers, and his growth bursts.
2. **WS:** he crashes through the rotten floor of the central hall.
3. **CU, Mara:** she catches her breath, then looks down into the hole.

### C1-06 Escape: the sewer gate (40 s)
1. **POV:** looking down the hole, an old iron sewer gate, half open, with water running.
2. **Radio**, PIKE: "Mara, I've got police chatter from yesterday. A car registered to a T. Kessler was found by the river at the treatment plant."
3. MARA: "Then I follow the water."
4. **WS:** she climbs down. The Warden's body twitches once in the dark. **Chapter title card: Chapter 2, Undercurrent.**

---

## Chapter 2: Undercurrent

### C2-01 Arrival: meeting Crane (60 s)
1. **TRACK:** Mara wades through storm drain water that glows faintly green.
2. **CU:** a gun barrel pressed to her temple. CRANE (off-screen): "Slowly. Turn around."
3. **MS:** Crane, in tactical gear with a Veyl patch scratched out.
   - CRANE: "You're not one of them. Good. Julian Crane. Private security, or I was."
   - MARA: "Mara. I'm looking for my brother."
   - CRANE: "Everyone down here's looking for someone. Plant's that way. Stick together till then."

### C2-02 Listeners (25 s)
1. **WS:** a dark sewer junction. A tall, eyeless host turns its head toward a dripping pipe.
2. **CU:** its throat clicks. Crane whispers: "Blind. But they hear everything. Walk, don't run."

### C2-03 The Revenant (35 s)
1. **WS:** the pumping hall. Mara picks up Theo's ID badge from a desk.
2. **CU:** the badge. On the floor, a red light starts blinking on a nearby tracker.
3. **WS:** the wall explodes. The Revenant steps through: a 2.4 m figure in a black containment suit, with a visor that glows.
4. **POV (Revenant):** a target lock on Mara, with "ANTIBODY MARKER 31%".
5. **MS:** Mara runs. **Chase gameplay.**

### C2-04 The Mother (30 s)
1. **WS:** the settling tank, with a huge swollen body fused into the tank wall.
2. **CU:** sacs pulse. Larvae spill out and squeal.
3. MARA: "Oh, you've got to be kidding me." **Boss fight.**

### C2-05 Mother defeat (20 s)
1. **WS:** electrical sparks across the water. The Mother convulses and goes still.
2. **MS:** Mara climbs out, soaked.

### C2-06 Escape: river to the island (90 s, set piece)
1. **WS:** the plant docks at dawn. Mara starts a Veyl motorboat with the boat key.
2. **Radio**, CRANE: "Mara, I got into Veyl's network. They moved a subject called Kessler to Gallow Island. Station Zero."
3. **TRACK:** the boat speeds down the river. Infected hosts leap from bridges. **Hand over to on-rails shooting gameplay.**
4. **WS (after the chase):** fog ahead and the dark outline of the island's lighthouse. **Title card: Chapter 3, Hollow Isle.**

---

## Chapter 3: Hollow Isle

### C3-01 Arrival (50 s)
1. **WS:** the boat hits the rocks in thick fog. Mara is thrown onto the shore.
2. **MS:** she gets up. A village of grey houses. Laundry is still hanging.
3. **CU:** fresh bare footprints in the mud lead into the fog.
4. **Radio**, PIKE (coughing): "Gallow Island... my cousin lived there. They said it was a fish disease. Watch yourself."

### C3-02 The Village Elder (30 s)
1. **WS:** from inside a house, Mara watches through a window.
2. **MS:** a tall, gaunt old man in a fisherman's coat drags an anchor chain. He sniffs the air.
3. **CU, Mara:** she sinks down below the window. **Stealth gameplay.**

### C3-03 Camcorder tape: "Vaccination Day" (playable flashback intro, 30 s)
1. **ECU:** a camcorder screen with the date eight years ago.
2. **WS (camcorder POV):** villagers line up outside the church. A banner reads "Veyl Cares". A younger Adrian Veyl smiles and shakes hands.
   - ADRIAN: "One small injection, and this island will never be sick again."
3. **Hand over to gameplay** as the villager holding the camera.

### C3-04 The Fisherman (30 s)
1. **WS:** the long pier in a storm.
2. **MS:** a harpoon flies out of the water and pins a crate next to Mara.
3. **CU:** the Fisherman climbs onto the pier: a gilled, swollen body with a harpoon fused to one arm. **Boss fight.**

### C3-05 Fisherman defeat (20 s)
1. **WS:** the crane hook crushes it through the pier. The water foams.

### C3-06 Escape: down into Station Zero (120 s, story reveal)
1. **MS:** the lighthouse beam swings. A hidden elevator opens in the floor.
2. **TRACK:** the elevator goes down. Mara steps into a dark, abandoned lab with wall screens.
3. **CU:** a monitor shows a recent recording of **Theo strapped to a chair**, Adrian Veyl beside him.
   - ADRIAN (recording): "Your antibody is remarkable, Theo. You're going to change the world."
   - THEO (recording): "You're going to kill everyone."
4. **CU, Mara:** her hand on the screen.
5. **Radio**, PIKE (weak): "Mara... hospital garage gate code is... 5-0-9. Found it in Dunn's... files. Kid, you go get him." A long cough. Then static.
   - MARA: "Pike? ... Owen?"
6. **Radio**, CRANE: "Mara. They moved Theo to St. Marrow. I'll meet you there."
7. **Title card: Chapter 4, St. Marrow.**

---

## Chapter 4: St. Marrow

### C4-01 Arrival (45 s)
1. **WS:** the hospital parking garage. Ambulances crashed into each other.
2. **Intercom**, BRANDT: "Whoever you are, come to the third floor. Quietly. I can help you, if you help me."

### C4-02 Runners (20 s)
1. **WS:** a long ward hallway. A host in a hospital gown stands still.
2. **CU:** its head snaps toward Mara. It sprints. **Gameplay.**

### C4-03 Meeting Brandt (90 s)
1. **MS:** a barricaded lab. Dr. Brandt, older and exhausted.
   - BRANDT: "You're Theo's sister. You have his eyes. And his blood, a little."
   - MARA: "Where is he?"
   - BRANDT: "Veyl Tower. Adrian needs Theo's antibody to make the strain airborne and survivable. Then he sells it. The city is his demonstration."
2. **CU:** Brandt hands Mara a folded formula sheet.
   - BRANDT: "This is the vaccine. It needs the prototype sample in the director's vault. And it needs living antibody."

### C4-04 Betrayal (60 s)
1. **MS:** Mara comes back from the vault with the sample. Crane is in the lab with Brandt.
   - CRANE: "Good work. I'll take that."
2. **CU:** Brandt turns, and Crane shoots her.
3. **WS:** Crane takes the sample case from Mara at gunpoint.
   - CRANE: "Nothing personal. Adrian pays better than the city did."
4. **MS:** he leaves through the operating theatre doors. They lock. Something moves on the operating table behind Mara. It is the Twin Surgeons. **Boss fight.**

### C4-05 Twin Surgeons defeat (20 s)
1. **MS:** the last half collapses under the surgical lights.
2. **CU:** Mara kneels next to Brandt's body and takes her ID card.

### C4-06 Escape: rooftop and cable car (60 s)
1. **TRACK:** Mara shoulders through the stairwell door onto the rooftop in the rain.
2. **WS:** across the city, Veyl Tower glows. A maintenance cable car hangs on its cable.
3. **MS:** she gets in and starts it.
4. **WS:** on the rooftop behind her, the Revenant steps out and watches her go.
5. **Title card: Chapter 5, Veyl Tower.**

---

## Chapter 5: Veyl Tower

### C5-01 Arrival (60 s)
1. **WS:** the cable car smashes through the glass of a mid-level atrium.
2. **MS:** Mara crawls out of the wreck. Every screen in the atrium lights up with Adrian's face.
   - ADRIAN: "Welcome, Ms. Kessler. You brought me the second sample. How thoughtful."

### C5-02 Veyl soldiers (25 s)
1. **WS:** a team of soldiers sweeps an office floor with laser sights.
2. **Radio chatter**, SOLDIER: "Priority target is female, antibody marker positive. Capture alive."

### C5-03 Crane's end (60 s)
1. **WS:** Mara finds Crane cornered in a corridor, his arm bitten. The Revenant is down the hall, stunned.
   - CRANE: "He sent it for both of us. Funny, right?"
2. **CU:** Crane holds out the sample case.
   - CRANE: "Take it. Finish him."
3. **MS:** the Revenant gets up. Crane pulls a grenade pin and walks toward it. Explosion. **Gameplay.**

### C5-04 Revenant, final form (30 s)
1. **WS:** the server hall. The Revenant comes through the smoke, its suit cracked open, showing the regenerating core. **Boss fight.**

### C5-05 Theo (90 s)
1. **WS:** the core lab. Theo is strapped into a machine with tubes running from his arms.
2. **MS:** Mara frees him. He collapses into her arms.
   - THEO: "Mara? You weren't supposed to come."
   - MARA: "You don't get to tell me that."
3. **CU:** Theo sees the formula sheet. THEO: "Brandt's formula. We can make it here. It needs my blood."

### C5-06 Adrian (45 s)
1. **WS:** the lab's mezzanine. Adrian, holding a rifle, with turrets folding down from the ceiling.
   - ADRIAN: "You understand, I hope, that I'm not a monster. I'm the first of what comes next."
   - MARA: "You poisoned a city."
   - ADRIAN: "I *tested* a city." **Final boss, phase 1.**
2. **Mid-fight (phase 2 trigger, 15 s):** he injects the Bloom strain into his neck. His body splits and regrows.
3. **Mid-fight (phase 3 trigger, 20 s):** he merges with the dispersal tower and becomes a giant mass.

### C5-07 Finisher (30 s)
1. **Slow motion, OTS:** Mara fires the vaccine round into the exposed core.
2. **ECU:** the core turns from red to violet.
3. **WS:** the mass collapses. Adrian's human face surfaces one last time.
   - ADRIAN: "It's... already sold..."

### C5-08 Escape and ending (120 s)
1. **Alarm**, AI VOICE: "Containment failure. Lab sterilisation in 3 minutes." **Timed escape gameplay to the helipad.**
2. **WS:** a helicopter lifts off as the lower floors burn.
3. **MS (inside):** Theo, wrapped in a blanket. Mara watches the city.
   - THEO: "Is it over?"
   - MARA: "The vaccine's in the water now. The sprinklers, the pipes. It'll reach everyone."
4. **WS:** dawn over Harrow Bay. Rain stops.
5. **Credits.**

### C5-09 Post-credits (30 s)
1. **WS:** a private jet interior. A gloved hand opens a case: **three violet-black vials** labelled "V-STRAIN / BLOOM".
2. **CU:** a voice off-screen: "Mr. Veyl was a visionary. Shame he never saw the market." **Cut to black. "VEILFALL will return."**
