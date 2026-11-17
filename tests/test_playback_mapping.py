import pathlib, subprocess, unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class PlaybackMappingTests(unittest.TestCase):
    def test_show_identity_and_episode_metadata(self):
        source = (ROOT / 'app.js').read_text(encoding='utf-8')
        start = source.index('function normalizeTraktLibraryItem(')
        end = source.index('\nasync function renderHomeDashboard()', start)
        snippet = source[start:end]
        script = f'''const assert=require('node:assert/strict');
{snippet}
const map=(x,i)=>normalizeTraktLibraryItem(x,kind,i);
let kind='tv';
const show=map({{type:'episode',progress:55.6,show:{{title:'Example Show',ids:{{tmdb:101,trakt:202}}}},episode:{{title:'Pilot',season:1,number:1,ids:{{tmdb:999,trakt:888}}}}}},0);
assert.equal(show.tmdb_id,101);
assert.equal(show.trakt_id,202);
assert.equal(show.nextEpisode.number,1);
assert.equal(show.progress,'56%');
kind='movie';
const movie=map({{type:'movie',movie:{{title:'Example Movie',ids:{{tmdb:303,trakt:404}}}}}},0);
assert.equal(movie.tmdb_id,303);
assert.equal(movie.nextEpisode,undefined);
'''
        result = subprocess.run(['node', '-e', script], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)

if __name__ == '__main__': unittest.main()
