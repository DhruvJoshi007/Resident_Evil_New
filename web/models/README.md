# Character models

Put rigged character models here (`.glb` is best, `.fbx` also works) and list them in `models.json`:

```json
{
  "leon": "leon.glb",
  "ortiz": "ortiz.glb",
  "husk": ["husk_a.glb", "husk_b.glb"],
  "husk_big": "husk_big.glb",
  "hookman": "hookman.glb"
}
```

Roles: `leon`, `ortiz`, `pruitt`, `ruth`, `hank`, `husk`, `husk_frail`, `husk_big`, `hookman`, plus the cutscene cast (`labcoat`, `subject`, `begg`, `kelso`, `bert`, `patron`, `runner`). A list picks one at random for each character. `husk_frail` and `husk_big` fall back to `husk`. Any role not listed keeps the built-in stand-in body.

The model only needs a mesh and a skeleton. No animation files are needed, because the game poses the skeleton itself, every frame. Supported skeletons: Mixamo, the Unreal Mannequin and MetaHuman bone names. The model is resized to the character's height automatically.

Keep each file under about 15 MB: a low LOD (20k–40k triangles) with 2K textures or smaller.
