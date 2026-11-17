"""Offline release gate. Run in bounded batches: --group core|media|library|all."""
from pathlib import Path
import argparse
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
BROWSER_GROUPS = {
    'media': ['browser_smoke.py', 'browser_detail_interactions.py', 'browser_tv_anime.py',
              'browser_anime_authenticated_exploratory.py', 'browser_trakt_authenticated.py',
              'browser_trakt_episodes_authenticated.py', 'browser_tmdb_metadata_step6.py', 'browser_trakt_library_step7.py', 'browser_anime_step8.py',
              'browser_episode_step9.py', 'browser_trakt_episode_step9.py'],
    'library': ['browser_step10_discovery_lists.py', 'browser_home_personalized.py', 'browser_discovery_filters.py',
                'browser_library_interactions.py', 'browser_trakt_lists_authenticated.py',
                'browser_home_priority.py', 'browser_artwork_failure.py', 'browser_visual_milestone.py',
                'browser_connectivity_mock.py', 'browser_pwa_update_mock.py'],
}

def commands(group):
    checks = []
    if group in ('core', 'all'):
        checks.extend([
            ('Unit regression', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-q']),
            ('JavaScript syntax', ['node', '--check', 'app.js']),
            ('Python syntax', [sys.executable, '-m', 'py_compile', 'local_server.py']),
        ])
        checks.extend((f'Netlify syntax: {p.name}', ['node', '--check', str(p)])
                      for p in sorted((ROOT / 'netlify/functions').glob('*.mjs')))
        checks.extend((f'API contract: {p.name}', ['node', str(p)]) for p in sorted((ROOT / 'tests').glob('*.mjs')))
    for category in ('media', 'library'):
        if group in (category, 'all'):
            checks.extend((f'Chromium: {name}', [sys.executable, str(ROOT / 'tests' / name)])
                          for name in BROWSER_GROUPS[category])
    return checks

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--group', choices=['core', 'media', 'library', 'all'], default='core')
    parser.add_argument('--timeout', type=int, default=90)
    args = parser.parse_args()
    failed = []
    checks = commands(args.group)
    for label, command in checks:
        start = time.monotonic()
        try:
            result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=args.timeout)
            ok = result.returncode == 0
            details = (result.stdout + result.stderr).strip()
        except subprocess.TimeoutExpired:
            ok, details = False, f'Timed out after {args.timeout} seconds'
        print(f'{"PASS" if ok else "FAIL"} {label} ({time.monotonic()-start:.1f}s)', flush=True)
        if not ok:
            failed.append(label)
            print(details[-2500:], flush=True)
    print(f'RESULT: {len(checks)-len(failed)}/{len(checks)} checks passed [{args.group}]', flush=True)
    if failed:
        print('FAILED:', ', '.join(failed), flush=True)
    return int(bool(failed))

if __name__ == '__main__':
    sys.exit(main())
