import pathlib, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class EpisodeConfirmationGate(unittest.TestCase):
 def test_episode_write_requires_readback(self):
  source=(ROOT/'app.js').read_text()
  segment=source.split("list.querySelectorAll('[data-episode]').forEach(button=>button.onclick=async()=>{",1)[1].split('\n  };\n  render();',1)[0]
  self.assertIn("const confirmed=await trakt('/shows/'",segment)
  self.assertIn('if(refreshed.has(number)===was)throw Error',segment)
  self.assertLess(segment.index('const confirmed=await trakt'),segment.index('watched=refreshed'))
  self.assertNotIn('watched.add(number)',segment)
  self.assertNotIn('watched.delete(number)',segment)
 def test_season_generation_guards(self):
  source=(ROOT/'app.js').read_text()
  self.assertIn('if(current!==generation)return;',source)
