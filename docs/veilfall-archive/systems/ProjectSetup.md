# Project Setup (Phase 1)

This phase creates the Unreal Engine 5 C++ project. There is no gameplay yet: you can open the project, build it, and fly around a test map. The player character arrives in Phase 2.

## 1. What you need

| Tool | Version | Notes |
|---|---|---|
| Unreal Engine | 5.6 or newer | Install from the Epic Games Launcher. 5.6 is needed for in-engine MetaHuman Creator. |
| Visual Studio 2022 | Latest | Workloads: **Game development with C++** and **Desktop development with C++**. In the installer, also tick the **Unreal Engine installer** and a **Windows 10/11 SDK**. |
| Git + Git LFS | Latest | Run `git lfs install` once after installing. |
| PC | RTX 2070-class GPU or better, 32 GB RAM, SSD | Hardware ray tracing is turned on. Older GPUs fall back to software Lumen. |

If you use a newer engine than 5.6, right-click `Veilfall.uproject` and choose **Switch Unreal Engine version**.

## 2. First build

1. Clone the repo and check out the branch `claude/project-thread-at1t5a`.
2. Right-click `Veilfall.uproject` and choose **Generate Visual Studio project files**.
3. Open `Veilfall.sln`, set the configuration to **Development Editor** and the platform to **Win64**, then **Build** the `Veilfall` project.
4. Double-click `Veilfall.uproject` to open the editor. The first launch compiles shaders and can take 20 to 60 minutes.

If the editor asks to rebuild the `Veilfall` module, click **Yes**. If the rebuild fails, open the solution in Visual Studio and build there to see the error, then paste it in the project thread.

## 3. What is in the project

| Part | File | Purpose |
|---|---|---|
| Project and plugins | `Veilfall.uproject` | Enhanced Input, Gameplay Ability System, Motion Matching (PoseSearch, Chooser, Animation Warping, Motion Warping), State Tree, Chaos destruction (Geometry Collection), Modeling Tools |
| Build rules | `Source/*.Target.cs`, `Source/Veilfall/Veilfall.Build.cs` | Game and editor targets, module dependencies |
| Rendering | `Config/DefaultEngine.ini` | Lumen GI and reflections, hardware ray tracing, Nanite, Virtual Shadow Maps, DX12, TSR anti-aliasing, motion blur off |
| Collision | `Config/DefaultEngine.ini` + `Source/Veilfall/Core/VeilfallCollision.h` | Trace channels **Weapon**, **Interaction**, **Visibility_AI** |
| Surfaces | same files | Concrete, Wood, Metal, Flesh, Water, Tile, Glass, Dirt, Carpet, Gravel, FleshHead (footsteps, impacts, headshots) |
| Gameplay tags | `Source/Veilfall/Core/VeilfallGameplayTags.*` | Input tags, health states (Fine, Caution, Danger), injuries (Leg, Arm, Bleeding, Poisoned, Grabbed), player states |
| Game mode | `Core/VeilfallGameMode.*` | Uses the Veilfall player controller |
| Player controller | `Core/VeilfallPlayerController.*` | Adds the input mapping context and holds the input config |
| Game instance | `Core/VeilfallGameInstance.*` | Tracks the current chapter, opens the next chapter after an escape |
| Chapter data | `Data/VeilfallChapterData.*` | One asset per chapter: number, title, location, map, next chapter |
| Input config | `Input/VeilfallInputConfig.*` | Table linking input tags to Enhanced Input actions |

The game mode and game instance are already set in `DefaultEngine.ini`.

## 4. Editor steps (about 15 minutes)

Unreal assets are binary, so these few need to be made in the editor. Create everything under `Content/Veilfall/`.

### 4.1 Input actions
In `Content/Veilfall/Data/Input/`, right-click **Input > Input Action** for each row:

| Asset | Value type | Keyboard and mouse | Gamepad | Input tag |
|---|---|---|---|---|
| IA_Move | Axis2D | W A S D | Left stick | InputTag.Move |
| IA_Look | Axis2D | Mouse XY | Right stick | InputTag.Look |
| IA_Sprint | Digital | Left Shift | Left stick press | InputTag.Sprint |
| IA_Crouch | Digital | C | B / Circle | InputTag.Crouch |
| IA_Aim | Digital | Right mouse | Left trigger | InputTag.Aim |
| IA_Fire | Digital | Left mouse | Right trigger | InputTag.Fire |
| IA_Reload | Digital | R | X / Square | InputTag.Reload |
| IA_Interact | Digital | E | A / Cross | InputTag.Interact |
| IA_Dodge | Digital | Space | Left shoulder | InputTag.Dodge |
| IA_Knife | Digital | F | Right shoulder | InputTag.Knife |
| IA_QuickTurn | Digital | X | D-pad left | InputTag.QuickTurn |
| IA_ShoulderSwap | Digital | Middle mouse | Right stick press | InputTag.ShoulderSwap |
| IA_Flashlight | Digital | L | D-pad up | InputTag.Flashlight |
| IA_Inventory | Digital | Tab | View / Touchpad | InputTag.Inventory |
| IA_Map | Digital | M | D-pad down | InputTag.Map |
| IA_Pause | Digital | Escape | Menu / Options | InputTag.Pause |

For **IA_Move** with keyboard keys, add modifiers in the mapping context: S gets **Negate**; A gets **Negate** and **Swizzle Input Axis Values**; D gets **Swizzle Input Axis Values**.

### 4.2 Mapping context
Create **IMC_Default** (Input > Input Mapping Context) in the same folder and add every action above with its keys.

### 4.3 Input config
Right-click **Miscellaneous > Data Asset**, pick **VeilfallInputConfig**, and name it **DA_InputConfig**. Add one row per action, setting the action and its input tag.

### 4.4 Player controller and game mode Blueprints
1. In `Content/Veilfall/Core/` (create the folder), make a Blueprint child of **VeilfallPlayerController** named **BP_VeilfallPlayerController**. Set **Default Mapping Context** to IMC_Default and **Input Config** to DA_InputConfig.
2. Make a Blueprint child of **VeilfallGameMode** named **BP_VeilfallGameMode**, and set **Player Controller Class** to BP_VeilfallPlayerController.
3. In **Project Settings > Maps & Modes**, set **Default GameMode** to BP_VeilfallGameMode.

### 4.5 Chapter assets
In `Content/Veilfall/Data/Chapters/`, create five **VeilfallChapterData** data assets, DA_Chapter01 to DA_Chapter05:

| Asset | Number | Title | Location | Next chapter | Minutes |
|---|---|---|---|---|---|
| DA_Chapter01 | 1 | Quarantine | Harrow Bay Police Precinct | DA_Chapter02 | 25 |
| DA_Chapter02 | 2 | Undercurrent | Delta Water Treatment Plant | DA_Chapter03 | 25 |
| DA_Chapter03 | 3 | Hollow Isle | Gallow Island | DA_Chapter04 | 25 |
| DA_Chapter04 | 4 | St. Marrow | St. Marrow General Hospital | DA_Chapter05 | 20 |
| DA_Chapter05 | 5 | Veyl Tower | Veyl Tower | (none) | 25 |

Leave **Map** empty until the chapter maps exist (Phase 7).

### 4.6 Test map
Create **File > New Level > Basic** and save it as `Content/Veilfall/Maps/Dev/L_Dev_Sandbox`. Set it as the **Editor Startup Map** and **Game Default Map** in Maps & Modes.

### 4.7 Free content to download now (optional, used in Phase 2)
- **Game Animation Sample** (Fab, free from Epic): realistic locomotion with Motion Matching. Add it to the Veilfall project.
- **MetaHuman**: enable the **MetaHuman** plugin from **Edit > Plugins** (UE 5.6+) to start building Mara.

## 5. How to test Phase 1

| Check | Expected result |
|---|---|
| Build in Visual Studio | Succeeds with no errors |
| Open the editor | Opens without "missing modules" or plugin errors |
| Press Play in L_Dev_Sandbox | You fly around with the default pawn. The Output Log shows no "No DefaultMappingContext" warning once 4.4 is done. |
| Project Settings > Gameplay Tags | Shows Health.State.*, Injury.*, InputTag.* and State.* tags |
| Project Settings > Collision | Shows Weapon, Interaction and Visibility_AI trace channels |
| Project Settings > Physics > Physical Surface | Shows the 11 surfaces |
| Project Settings > Rendering | Global Illumination and Reflections both set to Lumen |
| Asset Manager (Project Settings) | Lists the VeilfallChapter primary asset type |

## 6. Folder layout

```
Config/                      Engine, game and input settings
Content/Veilfall/
  Characters/Animations/     Mara and NPCs, animation sets
  Enemies/Bosses/            Zombies, creatures, bosses
  Weapons/  Props/  VFX/  Audio/  UI/  Cinematics/
  Environments/              Per-chapter environment art
  Data/Chapters/             DA_Chapter01..05
  Data/Input/                IA_*, IMC_Default, DA_InputConfig
  Maps/Chapter01..05/        Chapter levels
  Maps/Dev/                  Test maps
Source/Veilfall/
  Core/                      Game mode, controller, game instance, tags, collision
  Data/                      Data asset types
  Input/                     Input config
docs/                        Design docs (Phase 0) and system docs
```

Code folders for Character, Combat, AI, Inventory, Puzzles, Save and UI are added in the phases that need them.
