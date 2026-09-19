import json,datetime,math,statistics,collections
F='/root/.claude/uploads/c0829aad-e7dd-5954-8399-a43829887c4e/979355ea-junetosept2026timeline.json'
d=json.load(open(F))
def p(t): return datetime.datetime.fromisoformat(t)
def ll(s):
    a,b=s.replace('°','').split(','); return float(a),float(b)
HOME=(39.659960,-99.572947)
def ed(a,b):
    dy=(a[0]-b[0])*111320; dx=(a[1]-b[1])*111320*math.cos(math.radians(39.662)); return math.hypot(dx,dy)
recs=[]
for s in d['semanticSegments']:
    if 'visit' not in s: continue
    tc=s['visit']['topCandidate']; lat,lon=ll(tc['placeLocation']['latLng'])
    st,en=p(s['startTime']),p(s['endTime'])
    recs.append(dict(lat=lat,lon=lon,start=st,dur=(en-st).total_seconds()/60))
cl=[]
for r in sorted(recs,key=lambda r:-r['dur']):
    for c in cl:
        if ed((c[0],c[1]),(r['lat'],r['lon']))<=40:
            c[2].append(r); n=len(c[2]); c[0]=sum(x['lat'] for x in c[2])/n; c[1]=sum(x['lon'] for x in c[2])/n; break
    else: cl.append([r['lat'],r['lon'],[r]])
TOWN=(39.6620,-99.5725)
rows=[]
for c in cl:
    if ed(TOWN,(c[0],c[1]))>3000 or ed(HOME,(c[0],c[1]))<=40: continue
    js=[x['dur'] for x in c[2] if 6<=x['start'].hour<=21 and 8<=x['dur']<=180]
    if len(js)<3: continue
    rows.append((c[0],c[1],len(js),statistics.mean(js),statistics.median(js),min(js),max(js),
                 statistics.pstdev(js),statistics.pstdev(js)/statistics.mean(js),sum(js)/60))
print("=== ON-SITE TIME VARIANCE (properties with >=3 mows) — sorted by inconsistency ===\n")
print(f"{'mows':>4} {'mean':>5} {'med':>5} {'min':>4} {'max':>4} {'sd':>5} {'cv':>5} {'hrs':>5}  lat,lon")
for r in sorted(rows,key=lambda r:-r[8]):
    print(f"{r[2]:>4} {r[3]:>5.0f} {r[4]:>5.0f} {r[5]:>4.0f} {r[6]:>4.0f} {r[7]:>5.0f} {r[8]:>5.2f} {r[9]:>5.1f}  {r[0]:.6f},{r[1]:.6f}")
tot=sum(r[9] for r in rows)
print(f"\ntotal on-site hours in this set: {tot:.0f}")
print("\n=== WHERE THE HOURS GO (top consumers) ===")
for r in sorted(rows,key=lambda r:-r[9])[:8]:
    print(f"  {r[9]:>5.1f} h  ({r[9]/tot*100:>4.1f}% of on-site time)  {r[2]:>2} mows @ {r[3]:.0f} min avg   {r[0]:.6f},{r[1]:.6f}")
print("\n=== IF EACH PROPERTY HIT ITS OWN MEDIAN EVERY VISIT ===")
save=sum((r[3]-r[4])*r[2] for r in rows)/60
print(f"  hours recovered: {save:.1f} h  (vs 0.7 h from perfect routing)")
print("  -- the gap between your mean and your median is the overrun, and it is {:.0f}x the routing prize".format(save/0.7))
