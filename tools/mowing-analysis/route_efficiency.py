import json,datetime,math,statistics,collections,itertools,csv
F='/root/.claude/uploads/c0829aad-e7dd-5954-8399-a43829887c4e/979355ea-junetosept2026timeline.json'
d=json.load(open(F))
def p(t): return datetime.datetime.fromisoformat(t)
def ll(s):
    a,b=s.replace('°','').split(','); return float(a),float(b)
HOME=(39.659960,-99.572947)   # 405 Walnut St
def mdist(a,b):   # Manhattan metres -- correct for a platted grid town
    dy=abs(a[0]-b[0])*111320
    dx=abs(a[1]-b[1])*111320*math.cos(math.radians(39.662))
    return dx+dy
def edist(a,b):
    dy=(a[0]-b[0])*111320; dx=(a[1]-b[1])*111320*math.cos(math.radians(39.662))
    return math.hypot(dx,dy)

recs=[]
for s in d['semanticSegments']:
    if 'visit' not in s: continue
    tc=s['visit']['topCandidate']; lat,lon=ll(tc['placeLocation']['latLng'])
    st,en=p(s['startTime']),p(s['endTime'])
    recs.append(dict(lat=lat,lon=lon,start=st,end=en,dur=(en-st).total_seconds()/60))
clusters=[]
for r in sorted(recs,key=lambda r:-r['dur']):
    for c in clusters:
        if edist((c[0],c[1]),(r['lat'],r['lon']))<=40:
            c[2].append(r); n=len(c[2])
            c[0]=sum(x['lat'] for x in c[2])/n; c[1]=sum(x['lon'] for x in c[2])/n; break
    else: clusters.append([r['lat'],r['lon'],[r]])
TOWN=(39.6620,-99.5725)
# map each visit -> cluster id, keep only in-town work-shaped visits at customer sites
sites={}
for i,c in enumerate(clusters):
    if edist(TOWN,(c[0],c[1]))>3000: continue
    if edist(HOME,(c[0],c[1]))<=40: continue          # your own house
    sites[i]=(c[0],c[1])
visits=[]
for i,c in enumerate(clusters):
    if i not in sites: continue
    for x in c[2]:
        if 6<=x['start'].hour<=21 and 8<=x['dur']<=180:
            visits.append((x['start'],i,x['dur'],x['end']))
byday=collections.defaultdict(list)
for st,i,dur,en in visits: byday[st.date()].append((st,i,dur,en))
for k in byday: byday[k].sort()

def tour_len(order,start=HOME):
    pos=start; t=0.0
    for i in order: t+=mdist(pos,sites[i]); pos=sites[i]
    return t+mdist(pos,start)

def optimize(ids):
    ids=list(ids)
    if len(ids)<=1: return ids, tour_len(ids)
    if len(ids)<=8:
        best=min(itertools.permutations(ids),key=tour_len)
        return list(best),tour_len(best)
    # nearest-neighbour + 2-opt + or-opt
    rem=set(ids); cur=HOME; order=[]
    while rem:
        nxt=min(rem,key=lambda i:mdist(cur,sites[i])); order.append(nxt); rem.discard(nxt); cur=sites[nxt]
    improved=True
    while improved:
        improved=False
        for a in range(len(order)-1):
            for b in range(a+1,len(order)):
                cand=order[:a]+order[a:b+1][::-1]+order[b+1:]
                if tour_len(cand)<tour_len(order)-0.01: order=cand; improved=True
        for a in range(len(order)):
            for b in range(len(order)):
                if a==b: continue
                o=order[:]; v=o.pop(a); o.insert(b,v)
                if tour_len(o)<tour_len(order)-0.01: order=o; improved=True
    return order,tour_len(order)

print("=== ROUTE EFFICIENCY, ACTUAL vs OPTIMAL (Manhattan / street grid, from 405 Walnut) ===\n")
print(f"{'date':>10} {'stops':>5} {'actual_km':>9} {'opt_km':>7} {'waste_km':>8} {'waste_%':>7} {'onsite_h':>8}")
tot_a=tot_o=0; rows=[]
for day in sorted(byday):
    seq=[v[1] for v in byday[day]]
    dedup=[]
    for i in seq:
        if not dedup or dedup[-1]!=i: dedup.append(i)
    uniq=list(dict.fromkeys(dedup))
    if len(uniq)<2: continue
    act=tour_len(dedup)
    opt_order,opt=optimize(uniq)
    onsite=sum(v[2] for v in byday[day])/60
    tot_a+=act; tot_o+=opt
    rows.append((day,len(dedup),act,opt,onsite,dedup,opt_order))
    print(f"{str(day):>10} {len(dedup):>5} {act/1000:>9.2f} {opt/1000:>7.2f} {(act-opt)/1000:>8.2f} {(act-opt)/act*100:>6.1f}% {onsite:>8.1f}")
print(f"\n{'TOTAL':>10} {sum(r[1] for r in rows):>5} {tot_a/1000:>9.2f} {tot_o/1000:>7.2f} {(tot_a-tot_o)/1000:>8.2f} {(tot_a-tot_o)/tot_a*100:>6.1f}%")
MPH=18  # in-town with a trailer
print(f"\nDriving at ~{MPH} mph in town with a trailer:")
print(f"  actual in-town driving : {tot_a/1609:.1f} mi -> {tot_a/1609/MPH*60:.0f} min")
print(f"  optimal same stop sets : {tot_o/1609:.1f} mi -> {tot_o/1609/MPH*60:.0f} min")
print(f"  RECOVERABLE            : {(tot_a-tot_o)/1609:.1f} mi -> {(tot_a-tot_o)/1609/MPH*60:.0f} min ({(tot_a-tot_o)/1609/MPH*60/60:.1f} hours) over {len(rows)} route days")
onsite_tot=sum(r[4] for r in rows)
print(f"\n  on-site hours over those days : {onsite_tot:.0f}")
print(f"  drive hours (actual)          : {tot_a/1609/MPH:.1f}")
print(f"  windshield share of route time: {(tot_a/1609/MPH)/(onsite_tot+tot_a/1609/MPH)*100:.0f}%")

print("\n=== BACK-TO-BACK PAIRS YOU ALREADY DO (natural clusters) ===")
pair=collections.Counter()
for day,n,a,o,h,dedup,opt in rows:
    for x,y in zip(dedup,dedup[1:]): pair[frozenset((x,y))]+=1
for pr,c in pair.most_common(12):
    a,b=tuple(pr)
    print(f"  {c:>2}x  {sites[a][0]:.5f},{sites[a][1]:.5f}  <->  {sites[b][0]:.5f},{sites[b][1]:.5f}   {mdist(sites[a],sites[b]):.0f} m apart")

print("\n=== ZONE PROPOSAL (k=4 geographic clusters, Manhattan k-medoids) ===")
ids=sorted(sites)
best=None
for seed in itertools.combinations(ids,4) if len(ids)<=14 else []:
    pass
import random
random.seed(7)
def kmedoid(ids,k,iters=400):
    bestcost=None;bestm=None
    for _ in range(iters):
        med=random.sample(ids,k)
        for _ in range(60):
            asg=collections.defaultdict(list)
            for i in ids: asg[min(med,key=lambda m:mdist(sites[i],sites[m]))].append(i)
            new=[]
            for m in med:
                grp=asg.get(m,[m])
                new.append(min(grp,key=lambda c:sum(mdist(sites[c],sites[j]) for j in grp)))
            if sorted(new)==sorted(med): break
            med=new
        cost=sum(min(mdist(sites[i],sites[m]) for m in med) for i in ids)
        if bestcost is None or cost<bestcost: bestcost,bestm=cost,med[:]
    return bestm,bestcost
med,cost=kmedoid(ids,4)
asg=collections.defaultdict(list)
for i in ids: asg[min(med,key=lambda m:mdist(sites[i],sites[m]))].append(i)
mowcount={i:sum(1 for st,j,du,en in visits if j==i) for i in ids}
for zi,(m,grp) in enumerate(sorted(asg.items(),key=lambda t:-sum(mowcount[i] for i in t[1])),1):
    order,L=optimize(grp)
    print(f"\n  ZONE {zi}: {len(grp)} properties, {sum(mowcount[i] for i in grp)} mows this season, loop from home = {L/1000:.2f} km ({L/1609:.1f} mi)")
    for i in order:
        print(f"     {sites[i][0]:.6f},{sites[i][1]:.6f}   {mowcount[i]:>2} mows   {mdist(HOME,sites[i]):.0f} m from home")
