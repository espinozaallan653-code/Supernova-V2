## Supernova
A personal launchpad with built-in games, Xbox Cloud Gaming links, and an AI chat assistant. Hosted on Netlify.

- `index.html`, `styles.css`, `app.js` — the site (Games, Cloud Gaming, AI Chat, Apps tabs)
- `games/` — self-contained games that play right on the site
- `netlify/functions/chat.mts` — the AI chat endpoint (`/api/chat`), powered by Netlify AI Gateway

To add a game, drop an HTML file in `games/` and copy one of the cards in the Games section of `index.html`.
