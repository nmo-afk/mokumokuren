"""Local Windows TMDB proxy reports missing credentials without pretending API access works."""
import contextlib, http.client, json, os, threading, unittest
from unittest.mock import patch
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from local_server import Handler, Server

class LocalTMDBConfiguration(unittest.TestCase):
 def test_missing_token_is_clear_json_not_external_redirect(self):
  with patch.dict(os.environ,{'TMDB_READ_TOKEN':''}):
   server=Server(('127.0.0.1',0),Handler)
   worker=threading.Thread(target=server.serve_forever,daemon=True)
   worker.start()
   try:
    conn=http.client.HTTPConnection('127.0.0.1',server.server_address[1],timeout=2)
    conn.request('GET','/api/tmdb?path=%2Fmovie%2F1288211')
    resp=conn.getresponse()
    payload=json.loads(resp.read())
    self.assertEqual(resp.status,503)
    self.assertEqual(payload['code'],'TMDB_NOT_CONFIGURED')
    self.assertIn('TMDB_READ_TOKEN',payload['error'])
    self.assertEqual(resp.getheader('cache-control'),'no-store')
    conn.close()
   finally:
    server.shutdown();server.server_close();worker.join(timeout=3)
