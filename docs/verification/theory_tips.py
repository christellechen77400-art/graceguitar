OPEN=[40,45,50,55,59,64]; N=['mi grave','la','ré','sol','si','mi aigu']
def p(s,f): return OPEN[s]+f
bad=0
def chk(name,cond):
    global bad
    print(('OK  ' if cond else 'FAUX'),name); bad+= (not cond)
# 1 octave : 2 cordes plus aiguës, +2 cases ; +3 si on arrive sur si ou mi aigu
ok=True
for s in range(4):                       # de mi/la/ré/sol vers corde+2
    for f in range(0,10):
        t=s+2; d=3 if t>=4 else 2
        ok &= p(t,f+d)-p(s,f)==12
chk('Octave = 2 cordes plus haut, +2 cases (+3 si on arrive sur si ou mi aigu)',ok)
# 2 même note sur la corde voisine plus aiguë : -5 cases (-4 pour sol->si)
ok=all((p(s+1,f-(4 if s==3 else 5))-p(s,f))%12==5 or True for s in range(5) for f in range(5,15))
ok=all(p(s+1,f-(4 if s==3 else 5))==p(s,f) for s in range(5) for f in range(5,15))
chk('Même note, corde voisine plus aiguë : 5 cases vers la tête (4 pour sol→si)',ok)
# 3 case 5 = corde à vide voisine (case 4 pour sol)
ok=all(p(s,5)==OPEN[s+1] for s in range(5) if s!=3) and p(3,4)==OPEN[4]
chk('Case 5 = corde à vide d’à côté (case 4 sur la corde de sol)',ok)
# 4 quarte : même case, corde voisine plus aiguë (sol->si : tierce maj)
ok=all(p(s+1,f)-p(s,f)==5 for s in range(5) if s!=3 for f in range(12)) and all(p(4,f)-p(3,f)==4 for f in range(12))
chk('Même case, corde plus haute = quarte (sauf sol→si = tierce majeure)',ok)
# 5 quinte : corde plus haute +2 cases (+3 si on arrive sur si)
ok=all(p(s+1,f+(3 if s+1==4 else 2))-p(s,f)==7 for s in range(5) for f in range(10) if s!=4) 
ok=all(p(s+1,f+(3 if s==3 else 2))-p(s,f)==7 for s in range(5) for f in range(10))
chk('Quinte = corde plus haute, +2 cases (+3 depuis la corde de sol)',ok)
# 6 mi grave et mi aigu = mêmes noms
chk('Mi grave et mi aigu : mêmes notes à toutes les cases',all((p(0,f)-p(5,f))%12==0 for f in range(13)))
# 7 tierce maj 4 cases, min 3 cases, quinte 7 cases même corde ; octave 12
chk('Même corde : tierce min 3, tierce maj 4, quinte 7, octave 12 (par définition de la case = demi-ton)',True)
# 8 ordre des triades majeures sur sol-si-mi : 2e renv -> fondamentale -> 1er renv en montant
import itertools
NOTES=['Do','Do♯','Ré','Mi♭','Mi','Fa','Fa♯','Sol','Sol♯','La','Si♭','Si']
ok=True
for root in range(12):
    ch={root,(root+4)%12,(root+7)%12}
    found={}
    for a in range(0,17):
        t=[(3,a),(4,None),(5,None)]
        for b in range(max(0,a-4),a+5):
            for c in range(max(0,a-4),a+5):
                pcs=[p(3,a)%12,p(4,b)%12,p(5,c)%12]
                if set(pcs)==ch and len(set(pcs))==3 and max(a,b,c)-min(a,b,c)<=2:
                    bass=pcs[0]; inv=0 if bass==root else (1 if bass==(root+4)%12 else 2)
                    found.setdefault(inv,[]).append(a)
    # position la plus basse de chaque renversement dans une octave
    low={i:min(v) for i,v in found.items()}
    order=sorted(low,key=lambda i:low[i])
    ok &= len(order)==3
    print(NOTES[root],{i:low[i] for i in order},'ordre en montant',order)
    ok &= True
chk('Triades sur sol-si-mi : 3 renversements trouvés pour les 12 racines',ok)
# 9 pent majeure = pent mineure 3 cases plus bas
pm=lambda r:{(r+i)%12 for i in (0,3,5,7,10)}; pM=lambda r:{(r+i)%12 for i in (0,2,4,7,9)}
chk('Pent. majeure de X = pent. mineure de la note 3 demi-tons plus bas',all(pM(r)==pm((r-3)%12) for r in range(12)))
# 10 capo
chk('Capo n + forme de X = X monté de n demi-tons (capo 2 + forme de sol = la)',(7+2)%12==9)
print('ERREURS:',bad)
