MOKUMOKUREN — WINDOWS LAPTOP TEST
=================================
1. Extract this ZIP (do not run from inside the ZIP).
2. Install Python 3 if it is not installed: https://www.python.org/downloads/windows/
3. Double-click START-MOKUMOKUREN-WINDOWS.bat.
4. Your browser should open http://127.0.0.1:8765/local-login.html
5. Keep the command window open while testing. Ctrl+C stops the local server.

IMPORTANT:
- Local login is NOT the same as production OAuth. The local-login page accepts existing Trakt and AniList access tokens independently. Do not share access tokens in chat.
- If you do not have a token, you can still visit http://127.0.0.1:8765/ to inspect layout, navigation, and public content; authenticated lists will not work.
- Real posters require a working TMDB backend. If you have your own TMDB read token, launch from a Windows Command Prompt after setting TMDB_READ_TOKEN in that terminal, not in this chat.
- AniList GraphQL requests go directly to AniList through the local Python proxy. TMDB may require a TMDB_READ_TOKEN environment variable or a working deployed backend.
- The server may send authenticated API requests to Trakt or AniList. Use a test account if you don't want to change real watch history.
- Test: home, search, posters, movie/TV/anime detail, Trakt lists, episode watched/unwatched, switching sections, and narrow browser window.
- For problems, send screenshots and exact error text; NEVER send OAuth access tokens or API secrets.
- This is a laptop testing package, NOT a GitHub/Netlify production upload.
