# Importing the EvilRise data into Unreal Engine 5.8 (Mac, Blueprint only)

This guide gets every note, radio line, objective, puzzle and cutscene into your project as **Data Tables**. You do not need any C++.

## What a Data Table is

A Data Table is a spreadsheet stored inside Unreal.
- Every row has a unique **Row Name**, such as `NAR_C1_Tape0214`.
- Every column is one field of a **struct**. A struct is a record type, like a `struct` in C.
- You build the struct first. Then you import a CSV or JSON file, and Unreal fills in one row per line.
- In Blueprint you look up a row by name with **Get Data Table Row**. It works like a hash-map lookup: you give it the key and get the record back.

## The files

All of the files are in `Content/EvilRise/Data/`. Each table comes as a `.csv` and a `.json` with the same content.

| Table | Rows | What it holds |
|---|---|---|
| `DT_Narrative` | 455 | Notes, diaries, emails, audio logs, footage, photos, radio lines and cutscene dialogue for the Prologue and all 5 chapters |
| `DT_Objectives` | 93 | Every objective, its required items and flags, and what it grants |
| `DT_Puzzles` | 21 | Puzzle setup, clues, solution, failure state, and the three hints |
| `DT_Cutscenes` | 27 | Trigger, location, Level Sequence path, cast and flags for each cutscene |
| `DT_Items` | 41 | Consumables, ammo, weapons and key items |
| `DT_Characters` | 17 | The cast registry |
| `DT_Enemies` | 10 | Enemy and boss registry |

**Use the JSON files when you can.** Notes contain commas, quotes and line breaks. JSON handles those safely. CSV is there so you can open the data in a spreadsheet.

The per-chapter source files are in `tools/chapters/c0` (the Prologue) to `c5`. Prologue rows use chapter number 0. If you edit one, run `python3 tools/build_datatables.py` from the repo root to rebuild every table. The script also checks the data:
- Every flag an objective needs is set somewhere.
- Every item an objective needs is granted somewhere.
- No ID is used twice.

## Step 1: make the enums

An enum is a fixed list of choices, like `enum` in C. In the Content Browser, go to `Content/EvilRise/Data/`. For each enum below, right-click and choose **Blueprint → Enumeration**, then add one entry per value, spelled exactly as shown.

| Asset name | Values, in this order |
|---|---|
| `E_NarrativeType` | Note, Diary, Email, AudioLog, Footage, Photo, Radio, Dialogue |
| `E_ItemCategory` | Consumable, Crafting, Ammo, Weapon, KeyItem |

The importer matches enum values by their display name, so the spelling and capitals must match exactly.

## Step 2: make the structs

For each struct below, right-click in the same folder, choose **Blueprint → Structure**, and add one variable per row of its table. The variable names must match the column headers **exactly**. That is how the importer knows which column goes where. You do not add a variable for `Name`: Unreal makes the Row Name for you from the first column (CSV) or from the `"Name"` key (JSON).

How the field types translate:
- "Array of Name" means you set the type to **Name** and then click the small grid icon next to it to make it an array.
- A **Name** is a short ID that is fast to compare.
- A **Text** is player-facing and can be translated later.
- A **String** is plain text for tools and notes.

**`S_NarrativeRow`** (for `DT_Narrative`)

| Variable | Type |
|---|---|
| chapter | Integer |
| type | E_NarrativeType |
| title | Text |
| speaker | String |
| text | Text |
| location | Name |
| unlocks | Array of Name |

**`S_ObjectiveRow`** (for `DT_Objectives`)

| Variable | Type |
|---|---|
| chapter | Integer |
| order | Integer |
| title | Text |
| description | Text |
| location | Name |
| requires_items | Array of Name |
| requires_flags | Array of Name |
| complete_when | Name |
| grants | Array of Name |
| sets_flags | Array of Name |
| next | Array of Name |
| optional | Boolean |
| hint | Text |

**`S_PuzzleRow`** (for `DT_Puzzles`)

| Variable | Type |
|---|---|
| chapter | Integer |
| display_name | Text |
| location | Name |
| setup | Text |
| clues | Array of Name |
| solution | Text |
| failure | Text |
| hint_1 | Text |
| hint_2 | Text |
| hint_3 | Text |
| hint_trigger | String |
| reward | Array of Name |
| sets_flag | Name |

**`S_CutsceneRow`** (for `DT_Cutscenes`)

| Variable | Type |
|---|---|
| chapter | Integer |
| title | Text |
| trigger | String |
| location | Name |
| sequence_asset | Soft Object Reference to Level Sequence |
| characters | Array of Name |
| duration_s | Integer |
| skippable | Boolean |
| sets_flags | Array of Name |

**`S_ItemRow`**: display_name (Text), category (E_ItemCategory), chapter (Integer), found_at (String), stack (Integer).

**`S_CharacterRow`**: display_name (Text), role (Text).

**`S_EnemyRow`**: display_name (Text), notes (Text).

Some columns are called `display_name` instead of `name` because Unreal already uses "Name" for the row name. Two fields both called "Name" would confuse the importer.

## Step 3: import

1. In Finder, copy the `.json` files into your project's `Content/EvilRise/Data/` folder.
2. Unreal notices the new files and asks whether to import them. If it does not ask, click **Import** in the Content Browser and pick the file.
3. In the **Data Table Options** dialog:
   - Set **Import As** to **DataTable**.
   - Set **Choose DataTable Row Type** to the matching struct, for example `S_NarrativeRow` for `DT_Narrative.json`.
   - Click **Apply**.
4. Double-click the new Data Table. Check that the row count matches the table at the top of this page, and spot-check one row. For example, `NAR_C1_Tape0214` should have type `Footage` and three unlocks.

If the importer logs a warning such as "property not found", a struct variable name does not match a column header. Fix the variable name, then right-click the Data Table and choose **Reimport**.

## Step 4: use the data in Blueprint

**Show a note when the player picks it up.** Give your pickup Blueprint (`BP_NotePickup`) a variable `NoteId` of type **Data Table Row Handle**, and point it at `DT_Narrative`. On interact:
1. Call **Get Data Table Row** with the handle's table and row name. The output pin gives you an `S_NarrativeRow`.
2. Break the struct and pass `title` and `text` to your note widget.
3. For each entry in `unlocks` that starts with `FLG_`, call `SetFlag` on your game-flags system.

**Play a radio exchange.** Radio rows share a prefix and are numbered: `RAD_C1_MaraFirst_01`, `_02`, and so on.
1. Call **Get Data Table Row Names** once at startup and keep the rows that start with the prefix you want. Sort them.
2. Play them in order with a delay of about 1.8 seconds plus 0.055 seconds per character, so longer lines stay on screen longer.
3. Show `speaker` and `text` in the subtitle widget.

This is exactly how the browser build does it in `web/src/story.js`, in the functions `rows()` and `radio()`.

**Track objectives.** Store the current objective's Row Name in your Game Instance.
- When a flag is set, look up the current objective's row. If `complete_when` equals that flag, move to the first entry in `next`.
- Show `title` on the HUD.
- Show `hint` if the player has been on the same objective for about 150 seconds.

**Keep game flags in one place.** Make a Game Instance Subsystem, or a Blueprint Game Instance, with a **Set of Name** called `Flags` and two functions:
- `SetFlag(Name)`, which adds the name to the set.
- `HasFlag(Name) → Boolean`.

Everything (objectives, doors, cutscene triggers) checks flags through these two functions, which keeps the save file to a single list of names.

## Mac notes (M4, 16 GB)

- Data Tables are tiny, so importing them costs nothing. Watch your memory in the Sequencer cutscenes instead. Keep Chaos destruction fields event-driven, as the cutscene scripts say.
- If Unreal does not notice files you copied in, check **Editor Preferences → Loading & Saving → Auto Reimport**. **Monitor Content Directories** should be on.
