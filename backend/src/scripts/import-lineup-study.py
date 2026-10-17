"""Opt-in offline import of author-created statistics; never execute archive code/pickles."""

import argparse
import collections
import csv
import datetime
import hashlib
import io
import json
import pathlib
import re
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--archive', type=pathlib.Path, required=True)
parser.add_argument('--metadata', type=pathlib.Path, required=True)
parser.add_argument('--write', action='store_true', help='Write fixed workspace data after validation; default audits only.')
args = parser.parse_args()
archive = args.archive.resolve()
if archive.stat().st_size != 125578161:
    raise ValueError('Unexpected scholarly archive size')
digest = hashlib.md5()
with archive.open('rb') as stream:
    for chunk in iter(lambda: stream.read(1048576), b''):
        digest.update(chunk)
if digest.hexdigest() != 'dee0454ff932339714192c4031006972':
    raise ValueError('Published archive checksum mismatch')
metadata = json.loads(args.metadata.read_text(encoding='utf-8-sig'))['data']['latestVersion']
if metadata.get('license', {}).get('uri') != 'https://spdx.org/licenses/etalab-2.0.html':
    raise ValueError('Unexpected source data licence')
with zipfile.ZipFile(archive) as zipped:
    def read_csv(name, cap):
        info = zipped.getinfo(name)
        if info.file_size > cap:
            raise ValueError('Processed member exceeds cap')
        body = zipped.read(info)
        return list(csv.DictReader(io.StringIO(body.decode('utf-8-sig')))), hashlib.sha256(body).hexdigest()

    rows, stats_hash = read_csv('data/preproc_data/stats/2017-18.csv', 9000000)
    starts, game_hash = read_csv('data/preproc_data/starting_lineups/2017-18.csv', 300000)
start_index = {row['game_id']: row for row in starts}
if len(start_index) != len(starts):
    raise ValueError('Duplicate game identity keys')
games, groups = {}, {}
people = collections.defaultdict(set)
periods = collections.defaultdict(lambda: {'seconds': 0, 'pm': 0})
report_indices = set()
for row in rows:
    index = row['']
    if not index.isdigit() or index in report_indices:
        raise ValueError('Duplicate/invalid source report index')
    report_indices.add(index)
    key = row['game_id']
    source_game = start_index.get(key)
    if not source_game or key != f"{source_game['date']}_{source_game['home']}_vs_{source_game['away']}":
        raise ValueError('Unmatched explicit source game key')
    match = re.fullmatch(r'https://www\.nba\.com/game/[a-z]{3}-vs-[a-z]{3}-(00217\d{5})/box-score', source_game['url'])
    if not match:
        raise ValueError('Unverified regular-season NBA game ID')
    team, side = row['team_id'], row['team']
    quarter, seconds, plus_minus = int(row['quarter']), int(row['time']), int(row['pm'])
    if side not in ['home', 'away'] or source_game[side] != team or not 1 <= quarter <= 10 or not 0 < seconds <= (720 if quarter <= 4 else 300):
        raise ValueError('Invalid source duration/scope')
    members = []
    for member in row['lineup'].split('_'):
        name, native = member.rsplit(' - ', 1)
        if not re.fullmatch(r'[a-z]{2,8}[0-9]{2}', native) or not name or len(name) > 80:
            raise ValueError('Invalid source-native player identity')
        native = 'br:' + native
        members.append(native)
        people[native].add(name)
    if len(members) != 5 or len(set(members)) != 5:
        raise ValueError('Reported lineup must contain five distinct identities')
    native_id = row['id']
    if not re.fullmatch(team + r'_2017_\d{1,5}', native_id):
        raise ValueError('Invalid source lineup identity')
    ident = 'study:' + native_id
    members.sort()
    group = groups.setdefault(ident, {'id': ident, 'sourceId': native_id, 'team': team, 'members': members, 'seconds': 0, 'plusMinus': 0, 'quarterRows': 0, 'games': set()})
    if group['team'] != team or group['members'] != members:
        raise ValueError('Conflicting source lineup identity')
    # Repeated same-lineup rows inside a quarter are retained; these may be distinct reports.
    group['seconds'] += seconds
    group['plusMinus'] += plus_minus
    group['quarterRows'] += 1
    group['games'].add('nba:' + match[1])
    period = periods[(key, quarter, side)]
    period['seconds'] += seconds
    period['pm'] += plus_minus
    games.setdefault(key, {'id': 'nba:' + match[1], 'sourceKey': key, 'date': source_game['date'], 'home': source_game['home'], 'away': source_game['away'], 'url': source_game['url'], 'periods': set()})['periods'].add(quarter)
quarantined = []
for key, game in games.items():
    quarters = sorted(game['periods'])
    for quarter in quarters:
        home, away = periods[(key, quarter, 'home')], periods[(key, quarter, 'away')]
        if home['seconds'] != (720 if quarter <= 4 else 300) or away['seconds'] != home['seconds'] or home['pm'] + away['pm'] != 0:
            raise ValueError('Source clock/opposing plus-minus reconciliation failed')
    if quarters != list(range(1, max(quarters) + 1)) or len(quarters) < 4:
        quarantined.append({'id': game['id'], 'sourceKey': key, 'reportedPeriods': quarters, 'reason': 'missing-contiguous-source-periods'})
        continue
    game['periods'] = len(quarters)
    game['durationSeconds'] = 2880 + 300 * (len(quarters) - 4)
source_group_count = len(groups)
quarantined_keys = {game['sourceKey'] for game in quarantined}
for row in rows:
    if row['game_id'] in quarantined_keys:
        group = groups['study:' + row['id']]
        group['seconds'] -= int(row['time'])
        group['plusMinus'] -= int(row['pm'])
        group['quarterRows'] -= 1
        group['games'].discard(games[row['game_id']]['id'])
games = {key: game for key, game in games.items() if key not in quarantined_keys}
quarantined_only_ids = [key for key, group in groups.items() if not group['quarterRows']]
groups = {key: group for key, group in groups.items() if group['quarterRows']}
for group in groups.values():
    group['games'] = sorted(group['games'])
if len({game['id'] for game in games.values()}) != len(games):
    raise ValueError('Duplicate NBA game IDs')
if len(games) + len(quarantined) != 1230 or source_group_count != 13869 or len(people) != 540 or sum(group['seconds'] for group in groups.values()) != 2 * sum(game['durationSeconds'] for game in games.values()) or sum(group['plusMinus'] for group in groups.values()) != 0:
    raise ValueError('Aggregate integrity/coverage mismatch')
source = {'doi': '10.57745/9NVFIQ', 'creator': 'Arnaud Odet', 'title': 'A data driven approach for optimal lineup building in Basket-Ball', 'licence': 'Etalab Open License 2.0', 'licenceUrl': 'https://spdx.org/licenses/etalab-2.0.html', 'datasetVersion': f"{metadata.get('versionNumber', 1)}.{metadata.get('versionMinorNumber', 0)}", 'sourceUpdatedAt': metadata.get('lastUpdateTime'), 'sourceReleasedAt': metadata.get('releaseTime'), 'retrievedAt': datetime.datetime.fromtimestamp(archive.stat().st_mtime, datetime.timezone.utc).isoformat().replace('+00:00', 'Z'), 'archiveMd5': digest.hexdigest(), 'statisticsFile': 'data/preproc_data/stats/2017-18.csv', 'statisticsSha256': stats_hash, 'gameIdentityFile': 'data/preproc_data/starting_lineups/2017-18.csv', 'gameIdentitySha256': game_hash, 'reportedQuarterRows': len(rows), 'sourceRegularGames': 1230, 'sourceLineups': source_group_count, 'verifiedQuarterSideGroups': sum(game['periods'] * 2 for game in games.values())}
data = {'version': 1, 'kind': 'researcher-reconstructed-quarter-lineups', 'season': '2017-18', 'scope': 'regular-season', 'source': source, 'people': [{'id': key, 'aliases': sorted(aliases)} for key, aliases in sorted(people.items())], 'games': sorted(games.values(), key=lambda game: (game['date'], game['id'])), 'lineups': sorted(groups.values(), key=lambda group: group['id']), 'quarantinedGames': quarantined, 'quarantinedOnlyLineupIds': quarantined_only_ids}
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n'
if args.write:
    workspace = pathlib.Path(__file__).resolve().parents[3]
    target = workspace / 'backend/src/features/lineup-study/lineup-study-snapshot.json'
    if not target.resolve().is_relative_to(workspace):
        raise ValueError('Unsafe snapshot target')
    if target.exists():
        subprocess.run(['git', 'ls-files', '--error-unmatch', '--', str(target.relative_to(workspace))], cwd=workspace, check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--', str(target.relative_to(workspace))], cwd=workspace, check=True)
    target.parent.mkdir(exist_ok=True)
    pending = target.with_name('.lineup-study.pending.json')
    with pending.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(payload)
    pending.replace(target)
print(json.dumps({'status': 'PASS', 'written': args.write, 'bytes': len(payload.encode('utf-8')), 'sha256': hashlib.sha256(payload.encode('utf-8')).hexdigest(), 'lineups': len(groups), 'people': len(people), 'games': len(games), 'quarterRows': len(rows), 'source': source}, ensure_ascii=True))
