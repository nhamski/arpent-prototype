import json, datetime, math, statistics, collections, csv
F='/root/.claude/uploads/c0829aad-e7dd-5954-8399-a43829887c4e/979355ea-junetosept2026timeline.json'
d=json.load(open(F))
def p(t): return datetime.datetime.fromisoformat(t)
def ll(s):
    a,b=s.replace('°','').split(','); return float(a),float(b)
TOWN=(39.6620,-99.5725)
def dist(a,b):
    dy=(a[0]-b[0])*111320; dx=(a[1]-b[1])*111320*math.cos(math.radians(a[0]))
    return math.hypot(dx,dy)
recs=[]
for s in d['semanticSegments']:
    if 'visit' not in s: continue
    tc=s['visit']['topCandidate']; lat,lon=ll(tc['placeLocation']['latLng'])
    st,en=p(s['startTime']),p(s['endTime'])
    recs.append(dict(lat=lat,lon=lon,start=st,end=en,dur=(en-st).total_seconds()/60,sem=tc['semanticType']))
clusters=[]
for r in sorted(recs,key=lambda r:-r['dur']):
    for c in clusters:
        if dist((c[0],c[1]),(r['lat'],r['lon']))<=40:
            c[2].append(r); n=len(c[2])
            c[0]=sum(x['lat'] for x in c[2])/n; c[1]=sum(x['lon'] for x in c[2])/n; break
    else: clusters.append([r['lat'],r['lon'],[r]])

BASES={0,1,2}  # filled below
rows=[]
for c in clusters:
    rs=c[2]; ds=[x['dur'] for x in rs]
    rows.append(dict(lat=c[0],lon=c[1],n=len(rs),mean=statistics.mean(ds),med=statistics.median(ds),
        mn=min(ds),mx=max(ds),tot=sum(ds),sem=collections.Counter(x['sem'] for x in rs).most_common(1)[0][0],
        km=dist(TOWN,(c[0],c[1]))/1000,
        dates=sorted(set(x['start'].date() for x in rs)),
        overnight=sum(1 for x in rs if x['dur']>420 or x['start'].hour<6),
        rs=rs))
rows.sort(key=lambda r:-r['n'])

# job-stop filter: in/near Logan, daytime, 8-180 min, not a base
def is_job(r,x):
    return (r['km']<3 and 6<=x['start'].hour<=21 and 8<=x['dur']<=180)

print("=== A. OVERALL ===")
alld=[r['dur'] for r in recs]
print(f"441 visits  Jun 22 - Sep 19 2026   mean {statistics.mean(alld):.0f} min  median {statistics.median(alld):.0f} min")
short=[x for x in alld if x<=180]
print(f"stops <=3h (n={len(short)}): mean {statistics.mean(short):.1f} min  median {statistics.median(short):.1f} min")

jobstops=[]
for r in rows:
    js=[x for x in r['rs'] if is_job(r,x)]
    if js: jobstops.append((r,js))
allj=[x['dur'] for r,js in jobstops for x in js]
print(f"\nIn-town daytime work-shaped stops (<3km of Logan, 8-180min, 6am-9pm): n={len(allj)}")
print(f"  mean {statistics.mean(allj):.1f} min   median {statistics.median(allj):.1f} min   total {sum(allj)/60:.0f} hours")

print("\n=== B. PER-PROPERTY (in-town, >=2 work-shaped visits), ranked ===")
print(f"{'#':>3} {'visits':>6} {'mean':>6} {'med':>6} {'min':>5} {'max':>6} {'hrs':>5}  {'first':>10} {'last':>10}  lat,lon")
out=[]
k=0
for r,js in sorted(jobstops,key=lambda t:-len(t[1])):
    if len(js)<2: continue
    k+=1
    ds=[x['dur'] for x in js]; dts=sorted(set(x['start'].date() for x in js))
    print(f"{k:>3} {len(js):>6} {statistics.mean(ds):>6.0f} {statistics.median(ds):>6.0f} {min(ds):>5.0f} {max(ds):>6.0f} {sum(ds)/60:>5.1f}  {str(dts[0]):>10} {str(dts[-1]):>10}  {r['lat']:.6f},{r['lon']:.6f}")
    out.append(dict(rank=k,visits=len(js),mean_min=round(statistics.mean(ds),1),median_min=round(statistics.median(ds),1),
        min_min=round(min(ds),1),max_min=round(max(ds),1),total_hours=round(sum(ds)/60,2),
        first=str(dts[0]),last=str(dts[-1]),distinct_days=len(dts),
        lat=round(r['lat'],6),lon=round(r['lon'],6),
        maps_link=f"https://www.google.com/maps/search/?api=1&query={r['lat']:.6f},{r['lon']:.6f}",
        all_dates="; ".join(str(x) for x in dts)))
singles=[(r,js) for r,js in jobstops if len(js)==1]
print(f"\n(+ {len(singles)} in-town properties with exactly one work-shaped visit)")
for r,js in singles:
    out.append(dict(rank=None,visits=1,mean_min=round(js[0]['dur'],1),median_min=round(js[0]['dur'],1),
        min_min=round(js[0]['dur'],1),max_min=round(js[0]['dur'],1),total_hours=round(js[0]['dur']/60,2),
        first=str(js[0]['start'].date()),last=str(js[0]['start'].date()),distinct_days=1,
        lat=round(r['lat'],6),lon=round(r['lon'],6),
        maps_link=f"https://www.google.com/maps/search/?api=1&query={r['lat']:.6f},{r['lon']:.6f}",
        all_dates=str(js[0]['start'].date())))

print("\n=== C. BASES / NON-JOB ANCHORS (long-stay) ===")
for r in rows[:6]:
    if r['km']<3 and r['mean']>200:
        print(f"  {r['lat']:.6f},{r['lon']:.6f}  n={r['n']}  mean {r['mean']:.0f} min  {r['sem']}  {r['dates'][0]} -> {r['dates'][-1]}")

print("\n=== D. WORK RHYTHM ===")
bydate=collections.defaultdict(list)
for r,js in jobstops:
    for x in js: bydate[x['start'].date()].append((x['dur'],r['lat'],r['lon']))
days=sorted(bydate)
multi=[dd for dd in days if len(bydate[dd])>=3]
print(f"days with >=1 in-town work stop: {len(days)}   days with >=3 (route days): {len(multi)}")
sp=[len(bydate[dd]) for dd in multi]
print(f"route days: mean {statistics.mean(sp):.1f} stops/day, mean {sum(sum(z[0] for z in bydate[dd]) for dd in multi)/len(multi)/60:.1f} on-site hours/day")
wd=collections.Counter(dd.strftime('%a') for dd in multi)
print("route days by weekday:", dict(wd))
mo=collections.Counter(dd.strftime('%Y-%m') for dd in days)
print("work days by month:", dict(sorted(mo.items())))

w=csv.DictWriter(open('/tmp/claude-0/-home-user-arpent-prototype/c0829aad-e7dd-5954-8399-a43829887c4e/scratchpad/logan_stops.csv','w',newline=''),fieldnames=list(out[0].keys()))
w.writeheader(); w.writerows(out)
print("\ncsv rows:",len(out))
