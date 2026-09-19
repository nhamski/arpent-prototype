# Mowing analysis — Logan, KS route & stop data

Scripts that turn a Google Maps Timeline export and a MowClock `/export` backup
into per-property stop durations, $/hour, and route numbers.

Anchor: home is **405 Walnut St, Logan KS** = `39.659960, -99.572947`.
Every script uses **Manhattan distance**, not straight-line — Logan is a platted
grid, so street distance is the sum of the legs, not the hypotenuse.

## Scripts

| Script | Input | Answers |
|---|---|---|
| `stop_durations.py` | Timeline JSON | Average stop duration per property, visit counts, work-rhythm by weekday/month |
| `route_efficiency.py` | Timeline JSON | Actual vs optimal daily route length (exact TSP ≤8 stops, 2-opt/or-opt above), natural stop pairs, k-medoid zone proposal |
| `onsite_variance.py` | Timeline JSON | Per-property time variance, where the season's hours went, hours recoverable by hitting each property's own median |
| `compile_mowclock.py` | MowClock backup + Timeline JSON | Joins the two on geography: names + prices against independently measured durations, $/hour, and visits MowClock never logged |

Paths to the Timeline export are hardcoded at the top of the first three; the
compiler takes them as arguments:

```bash
python3 compile_mowclock.py mowclock-backup.json timeline.json -o out/
```

Get `mowclock-backup.json` from `https://lawncare-k7xg.onrender.com/export`
while signed in. It carries properties (with geofence centres), every job with
its duration, invoices, and the full GPS ping trail.

## Season findings, 22 Jun – 19 Sep 2026

- 26 customer properties, 169 mow-visits, 190 on-site hours.
- Mean on-site per visit **67.5 min**; median property average 55.5 min.
- 29 route days, 5.0 stops/day, 5.3 on-site hours/day. Thursday carried 11 of 29.
- **Routing is not the lever.** 61 mi of in-town driving all season; a perfect
  route recovers 12.6 mi ≈ 42 min. Windshield time is 2% of route time.
- **On-site overrun is the lever.** Holding each property to its own median
  recovers **24.8 h** — roughly 35× the routing prize.

`logan_stops_2026season.csv` is the labelled stop table; `label` is blank where
the name still needs binding to the coordinate.
