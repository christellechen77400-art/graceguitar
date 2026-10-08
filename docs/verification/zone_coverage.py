OPEN=[40,45,50,55,59,64]
def p(s,f): return OPEN[s]+f
sets={'sol-si-mi':(3,4,5),'ré-sol-si':(2,3,4),'la-ré-sol':(1,2,3)}
res={}
for name,(a,b,c) in sets.items():
    worst=None
    for third,lab in ((4,'maj'),(3,'min')):
        for root in range(12):
            ch={root,(root+third)%12,(root+7)%12}
            for z in range(0,13):          # fenêtre de 5 cases : z..z+4
                found=False
                for fa in range(z,z+5):
                    for fb in range(z,z+5):
                        for fc in range(z,z+5):
                            if {p(a,fa)%12,p(b,fb)%12,p(c,fc)%12}==ch: found=True
                if not found: res.setdefault(name,[]).append((root,lab,z))
    print(name,'fenêtres de 5 cases sans voicing :',len(res.get(name,[])),'sur',2*12*13)
# fenêtre de 5 cases à partir de 4 cases : toujours ?
for name,(a,b,c) in sets.items():
    bad=0
    for third in (4,3):
        for root in range(12):
            ch={root,(root+third)%12,(root+7)%12}
            for z in range(1,10):
                if not any({p(a,fa)%12,p(b,fb)%12,p(c,fc)%12}==ch for fa in range(z,z+6) for fb in range(z,z+6) for fc in range(z,z+6)): bad+=1
    print(name,'fenêtre de 6 cases (z=1..9) : manques',bad)
# écarts entre renversements sol-si-mi
for root in range(12):
    ch={root,(root+4)%12,(root+7)%12}
    pos=sorted({min(fa,fb,fc) for fa in range(0,17) for fb in range(0,17) for fc in range(0,17) if {p(3,fa)%12,p(4,fb)%12,p(5,fc)%12}==ch and max(fa,fb,fc)-min(fa,fb,fc)<=2 and 0<=min(fa,fb,fc)<=11})
    gaps=[(pos[(i+1)%len(pos)]-pos[i])%12 for i in range(len(pos))]
    print(root,pos,gaps)
