import os, re, http.server, pathlib, urllib.request, urllib.error, urllib.parse, json, webbrowser, threading, time, socketserver
ROOT=pathlib.Path(__file__).resolve().parent
PORT=8765
TRAKT_CLIENT='42rPcHWAppxsSkWTIuApWjcED9nBfgXO6ay9bNioynw'
ALLOWED={'/users/settings','/sync/playback','/sync/watchlist/movies','/sync/watchlist/shows','/sync/watched/movies','/sync/watched/shows','/sync/collection/movies','/sync/collection/shows','/sync/watchlist','/sync/watchlist/remove','/sync/history','/sync/history/remove'}
TRAKT_PAGINATION_HEADERS=('X-Pagination-Page','X-Pagination-Limit','X-Pagination-Page-Count','X-Pagination-Item-Count')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def log_message(self,fmt,*args):
  # No request paths or auth tokens are logged.
  pass
 def do_GET(self):self.handle_request()
 def do_POST(self):self.handle_request()
 def do_DELETE(self):self.handle_request()
 def handle_request(self):
  url=urllib.parse.urlsplit(self.path)
  if url.path=='/callback':self.path='/index.html';return super().do_GET()
  if not url.path.startswith('/api/'):
   if self.command!='GET':return self.send_error(405)
   return super().do_GET()
  if self.headers.get('Origin') not in (None,'http://127.0.0.1:8765','http://localhost:8765'):return self.send_error(403)
  service=url.path.removeprefix('/api/')
  if service=='trakt':
   path=urllib.parse.parse_qs(url.query).get('path',[''])[0]
   # Preserve extended=full episode lookups and allow pagination on list and progress reads.
   parsed=urllib.parse.urlsplit(path)
   route=parsed.path
   is_list=bool(re.fullmatch(r'/users/me/lists(?:/[A-Za-z0-9_-]+(?:/items)?)?',route))
   is_show=bool(re.fullmatch(r'/shows/\d+/(?:seasons(?:/\d+)?|progress/watched)',route))
   is_reviews=bool(re.fullmatch(r'/(?:movies|shows)/\d+/comments/(?:popular|newest)',route))
   is_watched_progress=path.partition('?')[0]=='/sync/progress/watched'
   if route not in ALLOWED and not (is_list or is_show or is_reviews or is_watched_progress):return self.send_error(400)
   if (is_reviews or is_watched_progress) and self.command!='GET':return self.send_error(405)
   query=urllib.parse.parse_qs(parsed.query,keep_blank_values=True)
   paged=is_list or is_watched_progress or bool(re.fullmatch(r'/sync/(?:watched|watchlist)/(?:movies|shows)',route))
   for key,values in query.items():
    if len(values)!=1:return self.send_error(400)
    v=values[0]
    valid=((is_reviews or route=='/sync/history') and key=='limit' and bool(re.fullmatch(r'[1-9][0-9]?',v)) and int(v)<=20) or (paged and key=='page' and bool(re.fullmatch(r'[1-9][0-9]{0,3}',v))) or (paged and key=='limit' and bool(re.fullmatch(r'[1-9][0-9]{0,2}',v)) and int(v)<=100) or (key=='extended' and v=='full' and (is_show or bool(re.fullmatch(r'/sync/watched/(?:movies|shows)',route)))) or (key=='extended' and v=='progress' and route=='/sync/watched/shows')
    if not valid:return self.send_error(400)
   if parsed.fragment or (self.command!='GET' and query):return self.send_error(400)
   target='https://api.trakt.tv'+path
   hdr={'Authorization':self.headers.get('Authorization',''),'trakt-api-key':TRAKT_CLIENT,'trakt-api-version':'2','User-Agent':'Mokumokuren/1.0.0-rc.1','Accept':'application/json','Content-Type':'application/json'}
  elif service in ('tmdb','anilist'):
   if service=='anilist' and self.command!='POST':return self.send_error(405)
   if service=='tmdb' and self.command!='GET':return self.send_error(405)
   if service=='tmdb' and not os.environ.get('TMDB_READ_TOKEN'):
    payload=b'{"error":"TMDB_READ_TOKEN is not configured in the local Windows server. Set this environment variable before launching the test.","code":"TMDB_NOT_CONFIGURED"}'
    self.send_response(503);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload);return
   hdr={'Content-Type':'application/json','Accept':'application/json'}
   if service=='anilist' and self.headers.get('Authorization'):hdr['Authorization']=self.headers['Authorization']
   if service=='tmdb' and os.environ.get('TMDB_READ_TOKEN'):
    tmdb_path=urllib.parse.parse_qs(url.query).get('path',[''])[0]
    if not re.fullmatch(r'/(?:trending/(?:movie|tv)/week|discover/(?:movie|tv)|search/multi|(?:movie|tv)/\d+(?:/(?:recommendations|similar|credits|videos|watch/providers|season/\d+))?)',tmdb_path):return self.send_error(400)
    params=urllib.parse.parse_qs(url.query)
    allowed_params={'query','page','with_genres','primary_release_year','first_air_date_year','sort_by','vote_average.gte','with_runtime.gte','with_runtime.lte','with_watch_providers','watch_region','append_to_response'}
    query=urllib.parse.urlencode([(k,v) for k,vals in params.items() if k in allowed_params for v in vals]+[('language','en-US')])
    target='https://api.themoviedb.org/3'+tmdb_path+'?'+query
    hdr['Authorization']='Bearer '+os.environ['TMDB_READ_TOKEN']
   else:
    target=('https://graphql.anilist.co' if service=='anilist' else 'https://mokumokuren.netlify.app'+url.path+('?' +url.query if url.query else ''))
  else:return self.send_error(404)
  try:length=int(self.headers.get('Content-Length','0'))
  except ValueError:return self.send_error(400)
  if length<0 or length>(12000 if service=='anilist' else 100000):return self.send_error(413)
  body=self.rfile.read(length) if self.command in ('POST','DELETE') else None
  upstream_headers={}
  try:
   req=urllib.request.Request(target,data=body,headers=hdr,method=self.command)
   with urllib.request.urlopen(req,timeout=18) as resp:
    status=resp.status
    payload=resp.read(3000000)
    upstream_headers=resp.headers
    ctype=upstream_headers.get('Content-Type','')
  except urllib.error.HTTPError as e:
   status=e.code
   payload=e.read(100000)
   upstream_headers=e.headers or {}
   ctype=upstream_headers.get('Content-Type','')
  except Exception:status=502;payload=b'{"error":"Local test could not reach upstream API"}';ctype='application/json'
  # Successful Trakt DELETE responses can have no JSON body.
  if status==204:
   self.send_response(204);self.send_header('Cache-Control','no-store');self.end_headers();return
  response_headers={}
  if service=='trakt':
   retry_after=upstream_headers.get('Retry-After','').strip()
   if re.fullmatch(r'[0-9]{1,4}',retry_after) and int(retry_after)<=3600:response_headers['Retry-After']=retry_after
  if 'json' not in ctype.lower():
   details={'error':'Upstream returned non-JSON (possible Cloudflare block)','upstream_status':status}
   if service=='trakt' and status in (403,502,503):
    denied=re.search(rb'sorry, you have been blocked|attention required|captcha challenge|cf-chl-',payload,re.I)
    if denied or (status==403 and re.search(rb'cloudflare',payload,re.I)):
     response_headers['X-Mokumokuren-Trakt-Blocked']='1'
     ray=upstream_headers.get('CF-Ray','').strip()
     if re.fullmatch(r'[a-f0-9]{16,32}(?:-[a-z]{3})?',ray,re.I):details['cf_ray']=ray
   if service=='trakt' and status==429:details['error']='Trakt rate limit reached'
   else:status=502
   payload=json.dumps(details).encode()
  elif service=='trakt' and self.command=='GET' and 200<=status<300:
   for name in TRAKT_PAGINATION_HEADERS:
    value=upstream_headers.get(name,'').strip()
    if re.fullmatch(r'0|[1-9][0-9]{0,15}',value) and int(value)<=9007199254740991:response_headers[name]=value
  self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(payload)))
  for name,value in response_headers.items():self.send_header(name,value)
  self.end_headers();self.wfile.write(payload)
class Server(socketserver.ThreadingMixIn,http.server.HTTPServer):daemon_threads=True
if __name__=='__main__':
 print('Mokumokuren local test at http://127.0.0.1:8765')
 print('Leave this window open. Press Ctrl+C to stop.')
 with Server(('127.0.0.1',PORT),Handler) as server:
  threading.Timer(1,lambda:webbrowser.open('http://127.0.0.1:8765/local-login.html')).start()
  try:server.serve_forever()
  except KeyboardInterrupt:pass
