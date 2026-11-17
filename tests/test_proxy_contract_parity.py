"""Check local and deployed proxy contracts remain aligned."""
import pathlib, re, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
LOCAL=(ROOT/'local_server.py').read_text()
TRAKT=(ROOT/'netlify/functions/trakt.mjs').read_text()
TMDB=(ROOT/'netlify/functions/tmdb.mjs').read_text()
ANILIST=(ROOT/'netlify/functions/anilist.mjs').read_text()

class ProxyContractParity(unittest.TestCase):
 def test_trakt_collection_routes(self):
  for route in ('/sync/collection/movies','/sync/collection/shows'):
   self.assertIn(repr(route),LOCAL)
  self.assertIn('collection\\/(movies|shows)',TRAKT)
 def test_trakt_episode_routes(self):
  self.assertIn('progress/watched',LOCAL)
  self.assertIn('progress\\/watched',TRAKT)
  self.assertIn('extended=full',LOCAL)
  self.assertIn('extended=full',TRAKT)
 def test_tmdb_detail_and_season_routes(self):
  self.assertIn('season/\\d+',LOCAL)
  self.assertIn('season\\/\\d+',TMDB)
  self.assertIn('append_to_response',LOCAL)
  self.assertIn('append_to_response',TMDB)
  self.assertIn('watch/providers',LOCAL)
  self.assertIn('watch\\/providers',TMDB)
 def test_anilist_method_and_size(self):
  self.assertIn("service=='anilist' and self.command!='POST'",LOCAL)
  self.assertRegex(ANILIST,r"request\.method\s*!==\s*'POST'")
  self.assertIn("12000 if service=='anilist'",LOCAL)
  self.assertRegex(ANILIST,r'body\.length\s*>\s*12000')
 def test_tmdb_get_only_local(self):
  self.assertIn("service=='tmdb' and self.command!='GET'",LOCAL)
 def test_local_rejects_oversized_payloads(self):
  self.assertIn('return self.send_error(413)',LOCAL)

if __name__=='__main__':unittest.main()
