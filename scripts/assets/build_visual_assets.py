"""Builds the site's production images from the owner-supplied NBA_ASSETS staging folder.

    python -I scripts/assets/build_visual_assets.py [--assets NBA_ASSETS]

Requires Python 3.10+ and Pillow with WebP support. The staging folder is only read; it is not
committed (see .gitignore). Outputs, all committed:

  frontend/public/images/players/action/<slug>-<w>.webp      editorial action photos
  frontend/public/images/players/portrait/<slug>-<w>.webp    portrait-frame alternates
  frontend/public/images/players/headshots/<id>-<w>.webp     transparent NBA.com headshots
  frontend/public/images/players/thumbs/<id>.webp            192 px face crops for lists
  frontend/public/images/teams/<key>-<s>.webp                team marks (64 and 256 px)
  frontend/src/features/players/playerImageData.ts           generated registry data
  docs/visual-assets/asset-map.json                          source -> production mapping

Every player is keyed by NBA person ID taken from the supplied manifests (headshots) or from the
existing, ID-verified registry (action photos); names are never used to infer an ID.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUBLIC = os.path.join(ROOT, 'frontend', 'public')
# Earlier site photos kept as build sources where they beat, or have no, supplied upgrade.
OLD = os.path.join(ROOT, 'scripts', 'assets', 'originals')

# Editorial action photos: source chosen after a side-by-side and native-resolution face review
# (docs/visual-assets/IMAGE_QUALITY_AUDIT.md). `face` is the face box (x0, y0, x1, y1) in the
# source, used for the list thumbnail; `focus` is the CSS object-position for cover frames.
ACTION = [
    # id, slug, name, source, focus, face-source, face box, alt, replaces
    ('1641705', 'wembanyama', 'Victor Wembanyama', 'A:UPgradedWembyuseasnewhero.png', 'center 3%',
     'A:UpgradedWembyFOrcomparing.png', (0.52, 0.04, 0.72, 0.19),
     'Victor Wembanyama of the San Antonio Spurs holding the ball above a defender', 'wembanyama-hero.webp'),
    ('201939', 'curry', 'Stephen Curry', 'A:UpgradedSteph2.png', 'center 20%',
     'A:UpgradedSteph.png', (0.44, 0.14, 0.59, 0.42),
     'Stephen Curry rising for a jump shot', 'curry-action.avif'),
    ('2544', 'lebron', 'LeBron James', 'A:UpgradedLebrondunk.png', 'center 30%',
     'A:Upgraded_Lebron_comparison.jpg', (0.53, 0.02, 0.66, 0.24),
     'LeBron James finishing at the rim', 'lebron-dunk.avif'),
    ('201142', 'durant', 'Kevin Durant', 'P:durant.avif', 'center 28%',
     'P:durant.avif', (0.58, 0.12, 0.74, 0.39),
     'Kevin Durant during an NBA game', None),
    ('203507', 'giannis', 'Giannis Antetokounmpo', 'A:UpgradedGiannis.png', 'center 22%',
     'A:UpgradedGiannis.png', (0.34, 0.04, 0.48, 0.30),
     'Giannis Antetokounmpo bringing the ball up the floor', 'giannis.avif'),
    ('1628983', 'gilgeous-alexander', 'Shai Gilgeous-Alexander', 'P:shai-gilgeous-alexander.webp', 'center 18%',
     'P:shai-gilgeous-alexander.webp', (0.50, 0.11, 0.63, 0.24),
     'Shai Gilgeous-Alexander driving with the ball', None),
    ('1628378', 'mitchell', 'Donovan Mitchell', 'A:UpgradedDmitch.png', 'center 24%',
     'A:UpgradedDmitch.png', (0.40, 0.08, 0.62, 0.42),
     'Donovan Mitchell bringing the ball up the floor', 'donovan-mitchell.jpg'),
    ('1629029', 'doncic', 'Luka Doncic', 'A:UpgradedLuka.png', 'center 20%',
     'A:UpgradedLuka.png', (0.44, 0.06, 0.60, 0.34),
     'Luka Doncic celebrating on the court', 'luka-doncic.jpg'),
    ('203999', 'jokic', 'Nikola Jokic', 'A:UpgradedJokic.png', 'center 28%',
     'A:UpgradedJokic.png', (0.44, 0.40, 0.58, 0.64),
     'Nikola Jokic shooting a free throw', 'jokic.webp'),
    ('203954', 'embiid', 'Joel Embiid', 'A:UpgradedEmbiid.png', 'center 20%',
     'A:UpgradedEmbiid.png', (0.31, 0.06, 0.48, 0.36),
     'Joel Embiid dribbling the ball', 'embiid.webp'),
    ('1630169', 'haliburton', 'Tyrese Haliburton', 'P:haliburton.webp', 'center 20%',
     'P:haliburton.webp', (0.32, 0.02, 0.42, 0.19),
     'Tyrese Haliburton celebrating in front of the crowd', None),
    ('201935', 'harden', 'James Harden', 'A:UpgradedHarden.png', 'center 18%',
     'A:UpgradedHarden.png', (0.39, 0.17, 0.68, 0.47),
     'James Harden celebrating on the court', 'harden.avif'),
    ('202695', 'leonard', 'Kawhi Leonard', 'A:UpgradedKawhi.png', 'center 20%',
     'A:UpgradedKawhi.png', (0.40, 0.03, 0.55, 0.36),
     'Kawhi Leonard driving with the ball', 'kawhi-leonard.jpg'),
    ('1630595', 'cunningham', 'Cade Cunningham', 'A:Upgradedcade.png', 'center 18%',
     'A:Upgradedcade.png', (0.40, 0.06, 0.62, 0.40),
     'Cade Cunningham celebrating after a play', 'cade-cunningham.jpg'),
    ('202681', 'irving', 'Kyrie Irving', 'A:UpgradedKyrie.png', '28% 30%',
     None, None,
     'Kyrie Irving driving past a defender', None),
]
# Portrait-frame alternates (3:4 frames such as the home comparison band).
PORTRAIT = {
    '1641705': ('A:UpgradedWembyFOrcomparing.png', 'center 6%', 'Victor Wembanyama handling the ball'),
    '201939': ('A:UpgradedSteph.png', '52% 10%', 'Stephen Curry celebrating with his arms spread'),
    '2544': ('A:Upgraded_Lebron_comparison.jpg', '62% 8%', 'LeBron James on the court in a Lakers jersey'),
}
HEADSHOT_PACKS = ['02_CURRENT_NBA_STARS', '03_NBA_LEGENDS_80S_90S', '04_NBA_LEGENDS_2000S_2010S']
# Current marks: the supplied transparent primary mark for each franchise ID.
CURRENT_LOGOS = {
    '1610612737': 'Atlanta Hawks', '1610612738': 'Boston Celtics', '1610612751': 'Brooklyn Nets',
    '1610612766': 'Charlotte Hornets', '1610612741': 'Chicago Bulls', '1610612739': 'Cleveland Cavaliers',
    '1610612742': 'Dallas Mavericks', '1610612743': 'Denver Nuggets', '1610612765': 'Detroit Pistons',
    '1610612744': 'Golden State Warriors', '1610612745': 'Houston Rockets', '1610612754': 'Indiana Pacers',
    '1610612746': 'LA Clippers', '1610612747': 'Los Angeles Lakers', '1610612763': 'Memphis Grizzlies',
    '1610612748': 'Miami Heat', '1610612749': 'Milwaukee Bucks', '1610612750': 'Minnesota Timberwolves',
    '1610612740': 'New Orleans Pelicans', '1610612752': 'New York Knicks', '1610612760': 'Oklahoma City Thunder',
    '1610612753': 'Orlando Magic', '1610612755': 'Philadelphia 76ers', '1610612756': 'Phoenix Suns',
    '1610612757': 'Portland Trail Blazers', '1610612758': 'Sacramento Kings', '1610612759': 'San Antonio Spurs',
    '1610612761': 'Toronto Raptors', '1610612762': 'Utah Jazz', '1610612764': 'Washington Wizards',
}
# Historical marks. The San Diego Clippers (1978-82) and New Orleans Jazz (1974-79) marks predate
# the game archive and appear only in franchise season histories.
HISTORICAL_LOGOS = [
    'clippers_sandiego_1978_1984', 'jazz_neworleans_1974_1979',
    'supersonics_1975_1995', 'supersonics_1995_2008', 'bullets_1973_1997', 'nets_newjersey_1990_2012',
    'grizzlies_vancouver_1995_2001', 'bobcats_2004_2014', 'hornets_charlotte_1988_2002',
    'hornets_neworleans_2002_2013', 'hornets_nookc_2005_2007', 'kings_kansascity_1975_1985',
    'spurs_classic_1976_2002', 'suns_classic_1992_2000', 'rockets_classic_1995_2003',
]


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def resolve(ref, assets):
    kind, name = ref.split(':', 1)
    return os.path.join(assets if kind == 'A' else OLD, name)


SKIP_EXISTING = False


def save_webp(im, path, quality=86, lossless=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not (SKIP_EXISTING and os.path.isfile(path)):
        im.save(path, 'WEBP', quality=quality, method=6, lossless=lossless)
    return os.path.getsize(path)


def widths_for(src_w, targets):
    out = sorted({min(t, src_w) for t in targets})
    return out


def square_face(im, box, pad=1.08):
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2 * im.width, (y0 + y1) / 2 * im.height
    side = max((x1 - x0) * im.width, (y1 - y0) * im.height) * pad
    side = min(side, im.width, im.height)
    left = min(max(cx - side / 2, 0), im.width - side)
    top = min(max(cy - side / 2 - side * 0.04, 0), im.height - side)
    return im.crop((round(left), round(top), round(left + side), round(top + side)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--assets', default=os.path.join(ROOT, 'NBA_ASSETS'))
    ap.add_argument('--skip-existing', action='store_true',
                    help='keep image files that already exist; regenerate data and the asset map')
    args = ap.parse_args()
    global SKIP_EXISTING
    SKIP_EXISTING = args.skip_existing
    assets = os.path.abspath(args.assets)
    if not os.path.isdir(assets):
        sys.exit(f'No staging folder at {assets}')
    out_img = os.path.join(PUBLIC, 'images')
    mapping = []

    def record(source, outputs, role, note=''):
        mapping.append({
            'source': os.path.relpath(source, ROOT).replace('\\', '/'),
            'sourceSha256': sha(source),
            'sourceBytes': os.path.getsize(source),
            'role': role,
            'outputs': outputs,
            'note': note,
        })

    # Headshots from the three player packs, keyed by the manifest's NBA person ID.
    headshots = {}
    for pack in HEADSHOT_PACKS:
        folder = os.path.join(assets, pack)
        with open(os.path.join(folder, 'manifest.csv'), encoding='utf-8-sig') as f:
            rows = list(csv.reader(f))
        head, body = rows[0], rows[1:]
        name_i = 0
        id_i = next(i for i, h in enumerate(head) if 'ID' in h)
        file_i = next(i for i, h in enumerate(head) if 'ilename' in h)
        era_i = next((i for i, h in enumerate(head) if 'team' in h.lower() and ('era' in h.lower() or 'uniform' in h.lower())), None)
        for r in body:
            pid, fname = r[id_i].strip(), r[file_i].strip()
            path = os.path.join(folder, fname)
            if not os.path.isfile(path):
                print('missing (not delivered):', pack, r[name_i], pid)
                continue
            if not fname.startswith(f'{pid}_'):
                sys.exit(f'Filename {fname} does not carry its manifest ID {pid}')
            headshots[pid] = (r[name_i].strip(), path, pack, r[era_i].strip() if era_i is not None else '')

    entries = {}
    action_ids = {a[0] for a in ACTION}
    for pid, (name, path, pack, era) in sorted(headshots.items()):
        im = Image.open(path).convert('RGBA')
        outs = []
        # A player with an editorial photo uses the headshot only for the face thumbnail.
        for w in () if pid in action_ids else (1040, 520):
            p = os.path.join(out_img, 'players', 'headshots', f'{pid}-{w}.webp')
            v = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            outs.append({'path': p, 'bytes': save_webp(v, p, quality=88), 'width': v.width, 'height': v.height})
        # Every headshot uses the same NBA template: the face sits in this box.
        thumb = square_face(im, (0.30, 0.02, 0.70, 0.60), pad=1.12).resize((192, 192), Image.LANCZOS)
        tp = os.path.join(out_img, 'players', 'thumbs', f'{pid}.webp')
        outs.append({'path': tp, 'bytes': save_webp(thumb, tp, quality=88), 'width': 192, 'height': 192})
        record(path, [{**o, 'path': os.path.relpath(o['path'], ROOT).replace('\\', '/')} for o in outs], 'headshot', era)
        entries[pid] = {
            'id': pid, 'name': name, 'kind': 'headshot',
            'group': 'current' if pack.startswith('02_') else 'legend',
            'src': f'/images/players/headshots/{pid}-1040.webp',
            'srcSet': f'/images/players/headshots/{pid}-520.webp 520w, /images/players/headshots/{pid}-1040.webp 1040w',
            'width': im.width, 'height': im.height,
            'objectPosition': 'center top',
            'alt': f'{name}, NBA.com headshot',
            'thumb': f'/images/players/thumbs/{pid}.webp',
            'source': pack, 'note': era,
        }

    for pid, slug, name, src_ref, focus, face_ref, face_box, alt, replaces in ACTION:
        src = resolve(src_ref, assets)
        im = Image.open(src).convert('RGB')
        outs = []
        ws = widths_for(im.width, (1600, 960))
        for w in ws:
            p = os.path.join(out_img, 'players', 'action', f'{slug}-{w}.webp')
            v = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            outs.append({'path': p, 'bytes': save_webp(v, p, quality=86), 'width': v.width, 'height': v.height})
        big = max(ws)
        entry = entries.get(pid, {'id': pid, 'name': name})
        thumb_src = None
        if face_ref:
            face_im = Image.open(resolve(face_ref, assets)).convert('RGB')
            thumb = square_face(face_im, face_box).resize((192, 192), Image.LANCZOS)
            tp = os.path.join(out_img, 'players', 'thumbs', f'{pid}.webp')
            outs.append({'path': tp, 'bytes': save_webp(thumb, tp, quality=88), 'width': 192, 'height': 192})
            thumb_src = f'/images/players/thumbs/{pid}.webp'
        record(src, [{**o, 'path': os.path.relpath(o['path'], ROOT).replace('\\', '/')} for o in outs],
               'action', f'replaces {replaces}' if replaces else 'kept original' if src_ref.startswith('P:') else 'new subject')
        h = round(im.height * big / im.width)
        entry.update({
            'kind': 'action',
            'group': 'editorial',
            'src': f'/images/players/action/{slug}-{big}.webp',
            'srcSet': ', '.join(f'/images/players/action/{slug}-{w}.webp {w}w' for w in ws),
            'width': big, 'height': h,
            'objectPosition': focus,
            'alt': alt,
            'thumb': thumb_src or entry.get('thumb'),
            'source': 'editorial',
            'note': f'replaces {replaces}' if replaces else '',
        })
        if pid in PORTRAIT:
            pref, pfocus, palt = PORTRAIT[pid]
            psrc = resolve(pref, assets)
            pim = Image.open(psrc).convert('RGB')
            pws = widths_for(pim.width, (1100, 640))
            pouts = []
            for w in pws:
                p = os.path.join(out_img, 'players', 'portrait', f'{slug}-{w}.webp')
                v = pim if w == pim.width else pim.resize((w, round(pim.height * w / pim.width)), Image.LANCZOS)
                pouts.append({'path': p, 'bytes': save_webp(v, p, quality=86), 'width': v.width, 'height': v.height})
            record(psrc, [{**o, 'path': os.path.relpath(o['path'], ROOT).replace('\\', '/')} for o in pouts], 'portrait')
            pbig = max(pws)
            entry['portrait'] = {
                'src': f'/images/players/portrait/{slug}-{pbig}.webp',
                'srcSet': ', '.join(f'/images/players/portrait/{slug}-{w}.webp {w}w' for w in pws),
                'width': pbig, 'height': round(pim.height * pbig / pim.width),
                'objectPosition': pfocus, 'alt': palt,
            }
        entries[pid] = entry

    # Team marks.
    for tid, team in CURRENT_LOGOS.items():
        folder = next(
            os.path.join(assets, 'NBA_LOGO', conf, team)
            for conf in ('Eastern Conference', 'Western Conference')
            if os.path.isdir(os.path.join(assets, 'NBA_LOGO', conf, team))
        )
        src = next(os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('_big_circle.png'))
        im = Image.open(src).convert('RGBA')
        im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
        outs = []
        for s in (64, 256):
            canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
            fit = im.copy()
            fit.thumbnail((s, s), Image.LANCZOS)
            canvas.paste(fit, ((s - fit.width) // 2, (s - fit.height) // 2), fit)
            p = os.path.join(out_img, 'teams', f'{tid}-{s}.webp')
            outs.append({'path': os.path.relpath(p, ROOT).replace('\\', '/'), 'bytes': save_webp(canvas, p, quality=90), 'width': s, 'height': s})
        record(src, outs, 'current-logo', team)
    for key in HISTORICAL_LOGOS:
        src = os.path.join(assets, 'NBA_HISTORICAL_FRANCHISE_LOGOS', f'{key}.png')
        im = Image.open(src).convert('RGBA')
        im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
        outs = []
        for s in (64, 256):
            canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
            fit = im.copy()
            fit.thumbnail((s, s), Image.LANCZOS)
            canvas.paste(fit, ((s - fit.width) // 2, (s - fit.height) // 2), fit)
            p = os.path.join(out_img, 'teams', f'{key.replace("_", "-")}-{s}.webp')
            outs.append({'path': os.path.relpath(p, ROOT).replace('\\', '/'), 'bytes': save_webp(canvas, p, quality=90), 'width': s, 'height': s})
        record(src, outs, 'historical-logo', key)

    # Generated registry data.
    ts = os.path.join(ROOT, 'frontend', 'src', 'features', 'players', 'playerImageData.ts')
    lines = [
        '// Generated by scripts/assets/build_visual_assets.py from the owner-supplied NBA_ASSETS folder.',
        '// Do not edit by hand: change the script and rebuild. Keyed strictly by NBA person ID.',
        "import type { PlayerImage } from './playerImages';",
        '',
        'export const PLAYER_IMAGE_DATA: Record<string, PlayerImage> = {',
    ]
    for pid in sorted(entries, key=lambda k: entries[k]['name']):
        e = entries[pid]
        obj = {k: e[k] for k in ('name', 'group', 'kind', 'src', 'srcSet', 'width', 'height', 'objectPosition', 'alt') if k in e}
        if e.get('thumb'):
            obj['thumb'] = e['thumb']
        if e.get('portrait'):
            obj['portrait'] = e['portrait']
        lines.append(f'  // {e["name"]}')
        lines.append(f"  '{pid}': {json.dumps(obj, ensure_ascii=False)},")
    lines += ['};', '']
    with open(ts, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))

    os.makedirs(os.path.join(ROOT, 'docs', 'visual-assets'), exist_ok=True)
    with open(os.path.join(ROOT, 'docs', 'visual-assets', 'asset-map.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(mapping, f, indent=1)
        f.write('\n')
    total_in = sum(m['sourceBytes'] for m in mapping)
    total_out = sum(o['bytes'] for m in mapping for o in m['outputs'])
    print(f'{len(entries)} players ({sum(1 for e in entries.values() if e["kind"] == "action")} action, '
          f'{sum(1 for e in entries.values() if e["kind"] == "headshot")} headshot); '
          f'{len(mapping)} sources, {total_in // 1024} KB in, {total_out // 1024} KB out')


if __name__ == '__main__':
    main()
