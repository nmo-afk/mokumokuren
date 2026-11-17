"""Real local HTTP smoke checks, independent of Chromium availability."""
import subprocess, time, unittest, urllib.request, urllib.error, socket
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class LocalHTTPChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sock=socket.socket(); sock.bind(('127.0.0.1',0)); cls.port=sock.getsockname()[1];sock.close()
        # local_server.py binds to fixed port 8765; don't start a second instance if occupied.
        cls.proc=subprocess.Popen(['python','local_server.py'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        cls.base='http://127.0.0.1:8765'
        for _ in range(30):
            try:
                urllib.request.urlopen(cls.base+'/',timeout=1).close();break
            except Exception:time.sleep(.1)
        else:
            cls.proc.terminate();raise RuntimeError('Local server failed to start')
    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        try:cls.proc.wait(timeout=3)
        except subprocess.TimeoutExpired:cls.proc.kill()
    def test_homepage(self):
        with urllib.request.urlopen(self.base+'/') as r:
            self.assertEqual(r.status,200)
            self.assertIn(b'Mokumokuren',r.read())
    def test_javascript(self):
        with urllib.request.urlopen(self.base+'/app.js') as r:
            self.assertEqual(r.status,200)
            self.assertIn(b'uiIcon',r.read())
    def test_close_icon(self):
        with urllib.request.urlopen(self.base+'/assets/arctic-icons/xmark.png') as r:
            self.assertEqual(r.status,200)
            self.assertEqual(r.read(8),b'\x89PNG\r\n\x1a\n')
    def test_missing_icon_is_404(self):
        with self.assertRaises(urllib.error.HTTPError) as e:
            urllib.request.urlopen(self.base+'/assets/arctic-icons/close.png')
        self.assertEqual(e.exception.code,404)
