"""Merge the per-chapter EvilRise data into Unreal Data Table files.

Reads tools/chapters/c0..c5/{narrative,objectives,puzzles,cutscenes}.json and
writes Content/EvilRise/Data/DT_*.csv and DT_*.json. Unreal's importer wants
the row name in the first column (CSV) or in a "Name" key (JSON), and arrays
in CSV written as (A,B,C). Run from the repo root: python3 tools/build_datatables.py
"""
import csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'chapters')
OUT = os.path.join(ROOT, 'Content', 'EvilRise', 'Data')

def load(kind):
    rows = []
    for c in range(0, 6):
        with open(os.path.join(SRC, f'c{c}', f'{kind}.json'), encoding='utf-8') as f:
            rows += json.load(f)
    return rows

def cell(v):
    if isinstance(v, bool):
        return 'True' if v else 'False'
    if isinstance(v, list):
        return '(' + ','.join(str(x) for x in v) + ')'
    return v

# Unreal reserves "Name" for the row name, so a struct field called name is exported as display_name.
RENAME = {'name': 'display_name'}

def write(name, rows, fields):
    os.makedirs(OUT, exist_ok=True)
    head = [RENAME.get(k, k) for k in fields]
    with open(os.path.join(OUT, name + '.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        w.writerow(['Name'] + head)
        for r in rows:
            w.writerow([r['id']] + [cell(r.get(k, '')) for k in fields])
    with open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump([{'Name': r['id'], **{RENAME.get(k, k): r.get(k, '') for k in fields}} for r in rows], f, ensure_ascii=False, indent=1)
    print(f'{name}: {len(rows)} rows')

narrative = load('narrative')
objectives = load('objectives')
puzzles = load('puzzles')
cutscenes = load('cutscenes')

write('DT_Narrative', narrative, ['chapter', 'type', 'title', 'speaker', 'text', 'location', 'unlocks'])
write('DT_Objectives', objectives, ['chapter', 'order', 'title', 'description', 'location', 'requires_items', 'requires_flags', 'complete_when', 'grants', 'sets_flags', 'next', 'optional', 'hint'])
write('DT_Puzzles', puzzles, ['chapter', 'name', 'location', 'setup', 'clues', 'solution', 'failure', 'hint_1', 'hint_2', 'hint_3', 'hint_trigger', 'reward', 'sets_flag'])
write('DT_Cutscenes', cutscenes, ['chapter', 'title', 'trigger', 'location', 'sequence_asset', 'characters', 'duration_s', 'skippable', 'sets_flags'])

# Registries come straight from docs/evilrise/Canon.md tables.
canon = open(os.path.join(ROOT, 'docs', 'evilrise', 'Canon.md'), encoding='utf-8').read()
def table(heading):
    part = canon.split(heading, 1)[1].split('\n## ', 1)[0]
    out = []
    for line in part.splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if line.startswith('|') and not set(line) <= set('|-: ') and cells[0] not in ('ID', 'Ch'):
            out.append(cells)
    return out

chars = []
for ids, names, role in table('## Cast registry'):
    for i, n in zip(ids.split(', '), names.split(', ')):
        chars.append({'id': i, 'name': n, 'role': role.replace('**', '')})
write('DT_Characters', chars, ['name', 'role'])

enemies = [{'id': i, 'name': n, 'notes': notes} for i, n, notes in table('## Enemy registry')]
write('DT_Enemies', enemies, ['name', 'notes'])

BASIC = [
    ('ITM_HerbGreen', 'Green Herb', 'Consumable', 0, 1), ('ITM_HerbRed', 'Red Herb', 'Consumable', 0, 1),
    ('ITM_MixGG', 'Mixed Herb (G+G)', 'Consumable', 0, 1), ('ITM_MixGR', 'Mixed Herb (G+R)', 'Consumable', 0, 1),
    ('ITM_Bandage', 'Bandage', 'Consumable', 0, 1), ('ITM_FirstAidSpray', 'First Aid Spray', 'Consumable', 0, 1),
    ('ITM_Suppressant', 'V-7 Suppressant', 'Consumable', 1, 1), ('ITM_Battery', 'Battery', 'Crafting', 0, 5),
    ('ITM_Gunpowder', 'Gunpowder', 'Crafting', 0, 10), ('ITM_Scrap', 'Scrap Metal', 'Crafting', 0, 10),
    ('ITM_NoiseLure', 'Noise Lure', 'Consumable', 1, 3),
    ('AMMO_Pistol', 'Pistol Ammo', 'Ammo', 1, 60), ('AMMO_Shells', 'Shotgun Shells', 'Ammo', 1, 20),
    ('AMMO_Flare', 'Flare Rounds', 'Ammo', 2, 10), ('AMMO_Rifle', 'Rifle Rounds', 'Ammo', 3, 20),
    ('AMMO_Revolver', 'Revolver Rounds', 'Ammo', 4, 12),
    ('WPN_Knife', 'Knife', 'Weapon', 1, 1), ('WPN_Pistol', 'Pistol', 'Weapon', 1, 1),
    ('WPN_FlareGun', 'Flare Gun', 'Weapon', 2, 1), ('WPN_Rifle', 'Rifle', 'Weapon', 3, 1), ('WPN_Revolver', 'Revolver', 'Weapon', 4, 1),
]
items = {i: {'id': i, 'name': n, 'category': cat, 'chapter': ch, 'found_at': '', 'stack': st} for i, n, cat, ch, st in BASIC}
for ch, i, n, where in table('**Key items**'):
    cat = 'Weapon' if i.startswith('WPN_') else 'KeyItem'
    items[i] = {'id': i, 'name': n, 'category': cat, 'chapter': int(ch), 'found_at': where, 'stack': 1}
write('DT_Items', list(items.values()), ['name', 'category', 'chapter', 'found_at', 'stack'])

# Sanity checks: every required flag is set somewhere, every required item is granted somewhere.
flags_set = set()
for r in narrative: flags_set.update(u for u in r['unlocks'] if u.startswith('FLG_'))
for r in objectives:
    flags_set.update(r['sets_flags'])
    if r['complete_when'].startswith('FLG_'): flags_set.add(r['complete_when'])
for r in puzzles: flags_set.add(r['sets_flag'])
for r in cutscenes: flags_set.update(r['sets_flags'])
missing = sorted({f for r in objectives for f in r['requires_flags'] if f not in flags_set})
granted = {g for r in objectives for g in r['grants']}
missing_items = sorted({i for r in objectives for i in r['requires_items'] if i not in granted})
ids = [r['id'] for r in narrative + objectives + puzzles + cutscenes]
dupes = sorted({i for i in ids if ids.count(i) > 1})
if missing or missing_items or dupes:
    print('PROBLEMS', missing, missing_items, dupes); sys.exit(1)
print('checks passed: flags, items, unique ids')
