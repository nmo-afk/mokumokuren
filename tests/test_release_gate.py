"""Run: python -m unittest discover -s tests -v. Static and mocked server tests only."""
import importlib.util, io, json, pathlib, re, threading, unittest, urllib.request, urllib.error, http.client
from unittest.mock import patch
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('moku_server',ROOT/'local_server.py')
server=importlib.util.module_from_spec(spec);spec.loader.exec_module(server)
class FakeResponse:
 status=200
 headers={'Content-Type':'application/json'}
 def __enter__(self):return self
 def __exit__(self,*a):return False
 def read(self,n):return b'{"ok":true}'
class ReleaseGate(unittest.TestCase):
 def test_all_static_arctic_icons_exist(self):
  js=(ROOT/'app.js').read_text()
  icons=set(re.findall(r"afIcon\(['\"]([^'\"]+)['\"]",js))
  missing=[x for x in icons if not (ROOT/'assets/arctic-icons'/f'{x}.png').is_file()]
  self.assertEqual(missing,[])
 def test_no_duplicate_navigation(self):
  js=(ROOT/'app.js').read_text()
  self.assertEqual(js.count('id="mobile-drawer"'),1)
  self.assertEqual(js.count('id="menu-trigger"'),1)
 def test_pwa_metadata(self):
  self.assertIn('name="mobile-web-app-capable"',(ROOT/'index.html').read_text())
 def test_python_route_restrictions_and_trakt_query(self):
  httpd=server.Server(('127.0.0.1',0),server.Handler)
  thread=threading.Thread(target=httpd.serve_forever,daemon=True);thread.start()
  base=f'http://127.0.0.1:{httpd.server_port}'
  try:
   with patch.object(server.urllib.request,'urlopen',return_value=FakeResponse()) as mock:
    conn=http.client.HTTPConnection('127.0.0.1',httpd.server_port);conn.request('GET','/api/trakt?path=%2Fshows%2F123%2Fseasons%3Fextended%3Dfull');response=conn.getresponse();self.assertEqual(response.status,200);response.read();conn.close()
    self.assertEqual(mock.call_args.args[0].full_url,'https://api.trakt.tv/shows/123/seasons?extended=full')
   with self.assertRaises(urllib.error.HTTPError) as ctx:
    urllib.request.urlopen(base+'/api/trakt?path=%2Fprivate%2Fdata')
   self.assertEqual(ctx.exception.code,400)
   self.assertEqual(urllib.request.urlopen(base+'/assets/arctic-icons/xmark.png').status,200)
  finally:httpd.shutdown();httpd.server_close()
if __name__=='__main__':unittest.main()
