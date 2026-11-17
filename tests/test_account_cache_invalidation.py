import unittest
from pathlib import Path
class TestAccountCache(unittest.TestCase):
 def test_cache_is_account_scoped(self):
  source=(Path(__file__).resolve().parents[1]/'app.js').read_text()
  self.assertIn('if(trackingCacheToken!==state.trakt)clearTrackingCache()',source)
  self.assertIn("state.trakt='';traktAccountRevision++;state.traktUser=null;clearTrackingCache()",source)
  self.assertIn("if(key==='trakt')saveTraktCredentials(d)",source)
  credentials=source.split('function saveTraktCredentials(credentials,{rotation=false}={}){',1)[1].split('async function refreshTraktToken()',1)[0]
  self.assertIn('clearTrackingCache()',credentials)
  self.assertIn('if(!rotation)traktAccountRevision++',credentials)
if __name__=='__main__':unittest.main()
