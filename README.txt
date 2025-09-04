
Place **boxscore.json** at: /Euro2KL/assets/data/boxscore.json

Fields supported (and used by the pages):
- game.date, game.status
- game.home / game.away: { id, name, score, quarters: [Q1,Q2,Q3,Q4], totals:{reb,ast,stl,blk}, players:[
    { gamertag (or name), pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm (opt), fta (opt), to (opt), fouls (opt) }
  ] }

Team page:
- Uses team_stats.json if present. Otherwise derives per-team PPG, RPG, APG, STL, BLK across **all games** in games.json.
- If games.json is missing, it will at least use scores from boxscore.json to compute PPG for the two teams.

Player page:
- Shows a scoreboard with Q1-Q4 combined (HOME : AWAY) and renders Game Leaders from the box score.

If your schema differs, adjust field names in **boxscore.json** — the parser is flexible.
