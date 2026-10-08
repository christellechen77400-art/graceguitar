"""Référence : enchaînement de triades dans une zone du manche.
À porter en TypeScript (src/theory/zoneChain.ts) avec les mêmes tests.
Cordes numérotées 0 = mi grave ... 5 = mi aigu. Accordage standard (MIDI)."""
OPEN = [40, 45, 50, 55, 59, 64]
STRING_SETS = {'sol-si-mi': (3, 4, 5), 'ré-sol-si': (2, 3, 4), 'la-ré-sol': (1, 2, 3)}
QUALITY = {'maj': (0, 4, 7), 'min': (0, 3, 7)}

def pc(s, f): return (OPEN[s] + f) % 12

def voicings(chord, sset, lo, hi, max_span=2):
    """chord = (root_pc, quality). Retourne [(frets, inversion)] avec toutes les cases dans [lo, hi]."""
    root, q = chord
    tones = {(root + i) % 12 for i in QUALITY[q]}
    out = []
    a, b, c = sset
    for fa in range(lo, hi + 1):
        for fb in range(lo, hi + 1):
            for fc in range(lo, hi + 1):
                notes = [pc(a, fa), pc(b, fb), pc(c, fc)]
                if set(notes) == tones and max(fa, fb, fc) - min(fa, fb, fc) <= max_span:
                    bass = notes[0]
                    inv = 0 if bass == root else (1 if bass == (root + QUALITY[q][1]) % 12 else 2)
                    out.append(((fa, fb, fc), inv))
    return out

def cost(v1, v2):
    return sum(abs(x - y) for x, y in zip(v1, v2))

def best_chain(chords, sset, lo, hi):
    """Programmation dynamique : minimise le déplacement total. None si un accord n'a aucune triade dans la zone."""
    layers = [voicings(c, sset, lo, hi) for c in chords]
    if any(not l for l in layers):
        return None
    best = [{i: (0, None) for i in range(len(layers[0]))}]
    for k in range(1, len(layers)):
        cur = {}
        for j, (vj, _) in enumerate(layers[k]):
            cur[j] = min(((best[k - 1][i][0] + cost(layers[k - 1][i][0], vj), i) for i in best[k - 1]))
        best.append(cur)
    j = min(best[-1], key=lambda x: best[-1][x][0]); total = best[-1][j][0]
    path = []
    for k in range(len(layers) - 1, -1, -1):
        path.append(layers[k][j]); j = best[k][j][1] if k else None
    return total, path[::-1]

if __name__ == '__main__':
    # Gloire à Dieu, tonalité de La : La, Fa♯m, Ré, Mi
    chords = [(9, 'maj'), (6, 'min'), (2, 'maj'), (4, 'maj')]
    total, path = best_chain(chords, STRING_SETS['sol-si-mi'], 5, 10)
    print('déplacement total', total)
    for c, (f, inv) in zip(['La', 'Fa♯m', 'Ré', 'Mi'], path): print(c, f, ['fondamentale', '1er renv.', '2e renv.'][inv])
    assert all(5 <= x <= 10 for f, _ in path for x in f)
    # propriété annoncée dans la doc : fenêtre de 6 cases (z de 1 à 9) → toujours une triade sur sol-si-mi
    for root in range(12):
        for q in QUALITY:
            for z in range(1, 10):
                assert voicings((root, q), STRING_SETS['sol-si-mi'], z, z + 5), (root, q, z)
    print('OK')
