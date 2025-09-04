
This build reads today's box score from **games.json** (in /Euro2KL/assets/data). 
- It picks the newest game by date fields (date/gameDate/start_time/timestamp), preferring status Final/Completed. 
- It then extracts players from any of these locations: `players`, `activePlayers`, `home.players`, `away.players`, `boxscore`, `stats`, or `statlines`.

Accepted stat keys inside each player (any casing works):
  points/pts/PTS, rebounds/reb/totReb/REB, assists/ast/AST, steals/stl/STL, blocks/blk/BLK, 
  (fgm,fga) or fg_pct, (3pm/tpm,3pa/tpa) or tp_pct, (ftm,fta) or ft_pct.
Accepted name keys: first_name+last_name, firstName+lastName, name, playerName, fullName, id.

Fallback: below the game leaders it will render season leaders from players.json (if present).

If your schema is different, send me a small snippet of games.json and I’ll tune the mapper.
