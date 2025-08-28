
# Euro2KLeague — Advanced Stats Pages

## Where to edit data
- `assets/data/players.json` — one row per player (totals). Add any new numeric fields (e.g., `oreb`, `dreb`, `fouls_drawn`) — the UI can add them as columns.
- `assets/data/stats-config.json`
  - `player_columns_default`: default columns shown on Player Stats.
  - `computed_formulas`: define new computed metrics as formulas, e.g. `"eFG": "(fgm + 0.5*tpm)/fga"`.
  - `leaders_default_metric`: which metric to show by default on Leaders.

## Add a new metric (example)
1. Add raw fields to each player in `players.json` if needed (e.g., `oreb`, `dreb`).
2. (Optional) Add a computed formula in `stats-config.json`:
   ```json
   "efg": "(fgm + 0.5*tpm)/fga"
   ```
3. Open Player Stats → **+ Add Metric** → tick **EFG** to show it.

## CSV import/export
- Player Stats page supports export of the current view to CSV, and import of CSV to merge new columns into the dataset by matching `name+team`.

## Leaders pages
- Pick any metric, set min GP / Top N, and update. Teams leaders allow per-game or totals.

