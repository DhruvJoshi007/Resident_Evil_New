# EvilRise

An original third-person survival horror game. The target is Unreal Engine 5.8, built in Blueprint on a Mac. It has a Prologue and 5 chapters. The Prologue is the morning the outbreak reaches Marrow Bay; the chapters take place over the next night in Port Halvern, Saltmere Island and the city.

## Docs

| Doc | What it covers |
|---|---|
| [Story Bible](docs/evilrise/StoryBible.md) | The canon story, word for word as written |
| [Canon](docs/evilrise/Canon.md) | Fixes F1 to F20 (each one can be vetoed), the timeline, and every ID: cast, enemies, items, locations, flags |
| [Story Overview](docs/evilrise/StoryOverview.md) | The story on one page, plus the cast sheet |
| [Beat Sheet](docs/evilrise/BeatSheet.md) | The Prologue and every chapter, beat by beat |
| [Cutscenes](docs/evilrise/Cutscenes.md) | Shot-by-shot scripts for all 27 cutscenes, with Sequencer setup |
| [Puzzles](docs/evilrise/Puzzles.md) | All 21 puzzles: setup, clues, solution, failure state, hints, Blueprint build |
| [Unreal Data Setup](docs/evilrise/UnrealDataSetup.md) | How to import the Data Tables in UE 5.8, step by step |

## Game data

`Content/EvilRise/Data/` holds the Data Tables as CSV and JSON: narrative (notes, logs, radio, dialogue), objectives, puzzles, cutscenes, items, characters and enemies. The per-chapter sources are in `tools/chapters/`. To rebuild and check the tables, run `python3 tools/build_datatables.py`.

## Play the Prologue and Chapter 1 in a browser

See [web/README.md](web/README.md).

## Older material

The earlier VEILFALL design is archived in `docs/veilfall-archive/`. The C++ project skeleton in `Source/`, `Config/` and `Veilfall.uproject` also comes from that earlier design, and EvilRise does not need it, because EvilRise is built in Blueprint.
