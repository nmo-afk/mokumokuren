# Dual integration Windows checkpoint

- Local login accepts independent Trakt and AniList access tokens (both optional, at least one required).
- Tokens stored only in tab-scoped sessionStorage; no token is embedded in the ZIP.
- Local Python proxy sends AniList GraphQL requests directly to https://graphql.anilist.co rather than relying on Netlify.
- Settings displays account verification; saved token alone does not imply valid access.
- Episode progress actions change real provider history.
- TMDB metadata requires separate backend configuration and should be verified independently.
- No GitHub push or Netlify deploy.
