#!/usr/bin/env python3
"""Join a MowClock /export backup to a Google Maps Timeline export.

MowClock knows WHO (property name, address, price, geofence centre) and how long
its own timer said each visit took. The Timeline knows every stop the phone made,
including the ones MowClock never saw. Matching them on geography gives one table
with names, money, and independent durations side by side.

  python3 compile_mowclock.py mowclock-backup.json [timeline.json] [-o out_dir]

Writes properties.csv, visits.csv and unmatched_stops.csv.
"""
import argparse, csv, datetime, json, math, os, statistics, sys
from collections import defaultdict

HOME = (39.659960, -99.572947)          # 405 Walnut St, Logan KS
TOWN = (39.6620, -99.5725)
MATCH_M = 60                            # geofence centre <-> timeline cluster
CLUSTER_M = 40                          # timeline stop merge radius
LAT_M = 111320.0


def _lat_scale(lat):
    return LAT_M * math.cos(math.radians(lat))


def euclid(a, b):
    return math.hypot((a[0] - b[0]) * LAT_M, (a[1] - b[1]) * _lat_scale(39.662))


def manhattan(a, b):
    """Street distance in a platted grid town."""
    return abs(a[0] - b[0]) * LAT_M + abs(a[1] - b[1]) * _lat_scale(39.662)


def parse_ts(s):
    if not s:
        return None
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))


def parse_latlng(s):
    a, b = s.replace("°", "").split(",")
    return float(a), float(b)


# --------------------------------------------------------------- timeline side
def timeline_clusters(path):
    """Merge Timeline visit segments into distinct places near town."""
    with open(path) as fh:
        doc = json.load(fh)
    visits = []
    for seg in doc.get("semanticSegments", []):
        if "visit" not in seg:
            continue
        cand = seg["visit"]["topCandidate"]
        lat, lng = parse_latlng(cand["placeLocation"]["latLng"])
        start, end = parse_ts(seg["startTime"]), parse_ts(seg["endTime"])
        if not (start and end):
            continue
        visits.append({
            "lat": lat, "lng": lng, "start": start, "end": end,
            "minutes": (end - start).total_seconds() / 60.0,
        })
    clusters = []
    for v in sorted(visits, key=lambda v: -v["minutes"]):      # anchor on long stays
        for c in clusters:
            if euclid((c["lat"], c["lng"]), (v["lat"], v["lng"])) <= CLUSTER_M:
                c["visits"].append(v)
                n = len(c["visits"])
                c["lat"] = sum(x["lat"] for x in c["visits"]) / n
                c["lng"] = sum(x["lng"] for x in c["visits"]) / n
                break
        else:
            clusters.append({"lat": v["lat"], "lng": v["lng"], "visits": [v]})
    return [c for c in clusters if euclid(TOWN, (c["lat"], c["lng"])) <= 3000]


def is_worklike(v):
    """Daytime, long enough to be a job, short enough not to be a night."""
    return 6 <= v["start"].hour <= 21 and 8 <= v["minutes"] <= 180


# --------------------------------------------------------------- mowclock side
def load_mowclock(path):
    with open(path) as fh:
        doc = json.load(fh)
    props = {p["id"]: p for p in doc.get("properties", [])}
    jobs = defaultdict(list)
    for j in doc.get("jobs", []):
        if j.get("property_id") in props:
            jobs[j["property_id"]].append(j)
    return props, jobs, doc


def stats(vals):
    if not vals:
        return {}
    return {
        "n": len(vals),
        "mean": round(statistics.mean(vals), 1),
        "median": round(statistics.median(vals), 1),
        "min": round(min(vals), 1),
        "max": round(max(vals), 1),
        "sd": round(statistics.pstdev(vals), 1) if len(vals) > 1 else 0.0,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mowclock")
    ap.add_argument("timeline", nargs="?")
    ap.add_argument("-o", "--out", default=".")
    args = ap.parse_args()

    props, jobs, doc = load_mowclock(args.mowclock)
    clusters = timeline_clusters(args.timeline) if args.timeline else []
    os.makedirs(args.out, exist_ok=True)

    # Greedy nearest-pair match; each cluster is claimed at most once.
    pairs = []
    for pid, p in props.items():
        if p.get("center_lat") is None or p.get("center_lng") is None:
            continue
        for ci, c in enumerate(clusters):
            d = euclid((p["center_lat"], p["center_lng"]), (c["lat"], c["lng"]))
            if d <= MATCH_M:
                pairs.append((d, pid, ci))
    pairs.sort()
    prop_to_cluster, claimed = {}, set()
    for d, pid, ci in pairs:
        if pid in prop_to_cluster or ci in claimed:
            continue
        prop_to_cluster[pid] = (ci, round(d, 1))
        claimed.add(ci)

    prop_rows, visit_rows = [], []
    for pid, p in sorted(props.items(), key=lambda kv: kv[1].get("name") or ""):
        mine = [j for j in jobs.get(pid, []) if j.get("billable")]
        mc_min = [j["total_seconds"] / 60.0 for j in mine if j.get("total_seconds")]
        price = p.get("price_per_mow") or 0.0
        mc = stats(mc_min)

        ci, match_d = prop_to_cluster.get(pid, (None, None))
        tl = {}
        if ci is not None:
            wl = [v for v in clusters[ci]["visits"] if is_worklike(v)]
            tl = stats([v["minutes"] for v in wl])
            for v in wl:
                visit_rows.append({
                    "property": p.get("name", ""),
                    "address": p.get("address", ""),
                    "source": "timeline",
                    "date": v["start"].date().isoformat(),
                    "start": v["start"].isoformat(timespec="minutes"),
                    "minutes": round(v["minutes"], 1),
                    "price": price,
                    "dollars_per_hour": round(price / (v["minutes"] / 60.0), 2) if v["minutes"] else "",
                })
        for j in mine:
            m = (j.get("total_seconds") or 0) / 60.0
            started = parse_ts(j.get("started_at"))
            visit_rows.append({
                "property": p.get("name", ""),
                "address": p.get("address", ""),
                "source": "mowclock",
                "date": started.date().isoformat() if started else "",
                "start": started.isoformat(timespec="minutes") if started else "",
                "minutes": round(m, 1),
                "price": j.get("price_snapshot") or price,
                "dollars_per_hour": round((j.get("price_snapshot") or price) / (m / 60.0), 2) if m else "",
            })

        centre = (p.get("center_lat"), p.get("center_lng"))
        has_centre = centre[0] is not None and centre[1] is not None
        prop_rows.append({
            "name": p.get("name", ""),
            "address": p.get("address", ""),
            "price_per_mow": price,
            "frequency": p.get("frequency", ""),
            "cadence": p.get("cadence") or "",
            "bag": p.get("bag"), "trim": p.get("trim"), "active": p.get("active"),
            "mowclock_mows": mc.get("n", 0),
            "mowclock_mean_min": mc.get("mean", ""),
            "mowclock_median_min": mc.get("median", ""),
            "timeline_mows": tl.get("n", 0),
            "timeline_mean_min": tl.get("mean", ""),
            "timeline_median_min": tl.get("median", ""),
            "timeline_min_min": tl.get("min", ""),
            "timeline_max_min": tl.get("max", ""),
            "timeline_sd_min": tl.get("sd", ""),
            # $/hr on the independent measurement when we have it, else MowClock's
            "dollars_per_hour": round(price / ((tl.get("mean") or mc.get("mean") or 0) / 60.0), 2)
                                 if (tl.get("mean") or mc.get("mean")) else "",
            "season_hours": round((tl.get("mean", 0) * tl.get("n", 0)
                                   or mc.get("mean", 0) * mc.get("n", 0)) / 60.0, 2),
            "season_revenue": round(price * (tl.get("n", 0) or mc.get("n", 0)), 2),
            "missed_by_mowclock": (tl.get("n", 0) - mc.get("n", 0)) if ci is not None else "",
            "m_from_home": round(manhattan(HOME, centre)) if has_centre else "",
            "lat": centre[0] if has_centre else "", "lng": centre[1] if has_centre else "",
            "timeline_match_m": match_d if match_d is not None else "NO MATCH",
            "has_fence": p.get("has_fence"),
        })

    unmatched = [{
        "lat": round(c["lat"], 6), "lng": round(c["lng"], 6),
        "worklike_visits": sum(1 for v in c["visits"] if is_worklike(v)),
        "total_visits": len(c["visits"]),
        "mean_min": round(statistics.mean([v["minutes"] for v in c["visits"] if is_worklike(v)]), 1)
                    if any(is_worklike(v) for v in c["visits"]) else "",
        "m_from_home": round(manhattan(HOME, (c["lat"], c["lng"]))),
        "maps_link": f"https://www.google.com/maps/search/?api=1&query={c['lat']:.6f},{c['lng']:.6f}",
    } for i, c in enumerate(clusters)
        if i not in claimed and any(is_worklike(v) for v in c["visits"])]
    unmatched.sort(key=lambda r: -r["worklike_visits"])

    def dump(name, rows):
        path = os.path.join(args.out, name)
        if not rows:
            open(path, "w").write("")
            return path
        with open(path, "w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        return path

    for name, rows in (("properties.csv", prop_rows),
                       ("visits.csv", sorted(visit_rows, key=lambda r: (r["date"], r["start"]))),
                       ("unmatched_stops.csv", unmatched)):
        print(f"wrote {dump(name, rows)}  ({len(rows)} rows)")

    billable = [r for r in prop_rows if r["dollars_per_hour"] != ""]
    print(f"\nproperties: {len(prop_rows)}   with a geofence centre: "
          f"{sum(1 for r in prop_rows if r['lat'] != '')}   "
          f"matched to timeline: {len(prop_to_cluster)}")
    print(f"timeline stops MowClock never logged: {len(unmatched)}")
    if billable:
        rate = sorted(billable, key=lambda r: r["dollars_per_hour"])
        print(f"\n$/hour across {len(billable)} priced properties: "
              f"median {statistics.median([r['dollars_per_hour'] for r in billable]):.2f}")
        print("worst five:")
        for r in rate[:5]:
            print(f"  ${r['dollars_per_hour']:>7.2f}/hr  {r['name'][:32]:<32} "
                  f"${r['price_per_mow']:.0f} / {r['timeline_mean_min'] or r['mowclock_mean_min']} min")
    gaps = [r for r in prop_rows if isinstance(r["missed_by_mowclock"], int) and r["missed_by_mowclock"] > 0]
    if gaps:
        print(f"\nvisits the Timeline saw but MowClock did not log (unbilled work):")
        for r in sorted(gaps, key=lambda r: -r["missed_by_mowclock"])[:10]:
            print(f"  +{r['missed_by_mowclock']:>2}  {r['name'][:38]:<38} "
                  f"~${r['missed_by_mowclock'] * r['price_per_mow']:.0f} unbilled")


if __name__ == "__main__":
    main()
