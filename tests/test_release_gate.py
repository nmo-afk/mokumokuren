"""Run: python -m unittest discover -s tests -v. Static and mocked server tests only."""
import importlib.util, io, json, pathlib, re, threading, unittest, urllib.request, urllib.error, urllib.parse, http.client
from email.message import Message
from contextlib import closing
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
    progress='/sync/progress/watched'
    for method,query,status in (
     ('GET','?page=2&limit=100',200),
     ('GET','?page=0&limit=100',400),
     ('GET','?page=1&limit=101',400),
     ('GET','?page=1&page=2',400),
     ('GET','?extended=full',400),
     ('GET','?hide_completed=true',400),
     ('POST','?page=2&limit=100',405),
     ('DELETE','',405),
    ):
     with self.subTest(method=method,query=query):
      mock.reset_mock()
      with closing(http.client.HTTPConnection('127.0.0.1',httpd.server_port,timeout=2)) as conn:
       conn.request(method,'/api/trakt?path='+urllib.parse.quote(progress+query,safe=''))
       response=conn.getresponse()
       self.assertEqual(response.status,status)
       response.read()
      if status==200:self.assertEqual(mock.call_args.args[0].full_url,'https://api.trakt.tv'+progress+query)
      else:mock.assert_not_called()
   with self.assertRaises(urllib.error.HTTPError) as ctx:
    urllib.request.urlopen(base+'/api/trakt?path=%2Fprivate%2Fdata')
   self.assertEqual(ctx.exception.code,400)
   self.assertEqual(urllib.request.urlopen(base+'/assets/arctic-icons/xmark.png').status,200)
  finally:httpd.shutdown();httpd.server_close()
 def test_python_trakt_proxy_metadata(self):
  httpd=server.Server(('127.0.0.1',0),server.Handler)
  thread=threading.Thread(target=httpd.serve_forever,daemon=True);thread.start()
  path='/api/trakt?path=%2Fsync%2Fwatched%2Fshows'
  def get():
   with closing(http.client.HTTPConnection('127.0.0.1',httpd.server_port,timeout=2)) as conn:
    conn.request('GET',path)
    response=conn.getresponse()
    return response,json.loads(response.read())
  try:
   upstream=FakeResponse()
   upstream.headers={**FakeResponse.headers,'X-Pagination-Page':'2','X-Pagination-Limit':'10',
                     'X-Pagination-Page-Count':'3','X-Pagination-Item-Count':'23','X-Internal':'hidden'}
   with patch.object(server.urllib.request,'urlopen',return_value=upstream) as mocked:
    response,_=get()
    self.assertEqual(response.status,200)
    self.assertEqual(mocked.call_args.args[0].get_header('User-agent'),'Mokumokuren/1.0.0-rc.1')
    for name in server.TRAKT_PAGINATION_HEADERS:
     self.assertEqual(response.getheader(name),upstream.headers[name])
    self.assertIsNone(response.getheader('X-Internal'))
    upstream.headers['X-Pagination-Limit']='1e2'
    upstream.headers['X-Pagination-Page-Count']='9007199254740992'
    response,_=get()
    self.assertIsNone(response.getheader('X-Pagination-Limit'))
    self.assertIsNone(response.getheader('X-Pagination-Page-Count'))
   for ray in ('9c58576879d02bd9-LHR','untrusted debug data'):
    headers=Message()
    headers['Content-Type']='text/html'
    headers['CF-Ray']=ray
    headers['X-Pagination-Page']='1'
    denied=urllib.error.HTTPError('https://api.trakt.tv/sync/watched/shows',403,'Blocked',headers,
                                 io.BytesIO(b'<html>Sorry, you have been blocked</html>'))
    with patch.object(server.urllib.request,'urlopen',side_effect=denied):
     response,body=get()
    self.assertEqual(response.status,502)
    self.assertEqual(body['upstream_status'],403)
    self.assertEqual(body.get('cf_ray'),ray if ray.endswith('-LHR') else None)
    self.assertEqual(response.getheader('X-Mokumokuren-Trakt-Blocked'),'1')
    self.assertIsNone(response.getheader('X-Pagination-Page'))
   headers=Message()
   headers['Content-Type']='text/html'
   headers['Retry-After']='25'
   limited=urllib.error.HTTPError('https://api.trakt.tv/sync/watched/shows',429,'Rate limit',headers,
                                 io.BytesIO(b'<html>Rate limited</html>'))
   with patch.object(server.urllib.request,'urlopen',side_effect=limited):
    response,body=get()
   self.assertEqual(response.status,429)
   self.assertEqual(response.getheader('Retry-After'),'25')
   self.assertEqual(body['error'],'Trakt rate limit reached')
  finally:httpd.shutdown();httpd.server_close()
if __name__=='__main__':unittest.main()
