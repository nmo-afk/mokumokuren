import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class LocalOAuthGuard(unittest.TestCase):
 def test_trakt_local_guard_precedes_redirect(self):
  s=(ROOT/'app.js').read_text(); f=s.split('async function loginTrakt(){',1)[1].split('function loginAni(){',1)[0]
  self.assertLess(f.index("['127.0.0.1','localhost']"),f.index("location.href='https://auth.trakt.tv"))
  self.assertIn('local-login.html',f)
 def test_anilist_local_guard_precedes_redirect(self):
  s=(ROOT/'app.js').read_text(); f=s.split('function loginAni(){',1)[1].split('async function callback(){',1)[0]
  self.assertLess(f.index("['127.0.0.1','localhost']"),f.index("location.href='https://anilist.co"))
 def test_local_login_documented(self):
  self.assertIn('Local OAuth sign-in is not supported',(ROOT/'local-login.html').read_text())
if __name__=='__main__':unittest.main()
