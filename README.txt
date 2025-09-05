
This is a minimal 'inline JS' version that reads /Euro2KL/assets/data/boxscore.json only,
matching the exact structure you posted. It avoids external JS so path/caching issues can't blank the page.

Leaders are computed from:
- Players: game.home.players + game.away.players
- Teams: game.home.name / game.away.name, using team totals or summing players if totals are absent.

Place files:
- leaders-players.html, leaders-teams.html, stats.css -> your site root next to these pages
- boxscore.json -> /Euro2KL/assets/data/boxscore.json

(If you keep games.json too, it's ignored by this minimal build to eliminate ambiguity.)
