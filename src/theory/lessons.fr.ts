import type { LessonText } from './lessons';

/** Cours de théorie, en français. */
export const lessonsFr: LessonText = {
  strings: {
    title: 'Les six cordes à vide',
    body: [
      'De la plus grave à la plus aiguë, les cordes à vide sont E, A, D, G, B, E. La 6e corde, la plus épaisse, donne un E grave ; la 1re, la plus fine, donne un E aigu. Même nom de note, deux octaves d’écart.',
      'Entre deux cordes voisines, l’écart est une quarte, soit 5 cases. Une seule paire fait exception : entre la 3e corde (G) et la 2e (B), l’écart est une tierce majeure, soit 4 cases.',
      'Pour t’en souvenir, repère les deux E aux extrémités, puis remplis le milieu : A, D, G, B. Autrement dit, la guitare est accordée en quartes partout, sauf entre G et B.',
    ],
    questions: [
      {
        prompt: 'Quelle est la corde la plus grave d’une guitare en accordage standard ?',
        choices: ['A', 'D', 'E', 'G'],
        answer: 2,
        explain: 'La 6e corde, la plus épaisse, donne un E grave : c’est la note la plus basse de la guitare.',
      },
      {
        prompt: 'Quel est l’écart entre la 3e corde (G) et la 2e corde (B) ?',
        choices: ['Une quarte, 5 cases', 'Une quinte, 7 cases', 'Une tierce majeure, 4 cases', 'Une octave, 12 cases'],
        answer: 2,
        explain: 'C’est la seule paire qui n’est pas à une quarte : entre G et B il n’y a que 4 cases.',
      },
      {
        prompt: 'Deux cordes à vide portent le même nom de note. Lesquelles ?',
        choices: ['La 6e et la 1re', 'La 5e et la 2e', 'La 4e et la 3e', 'La 6e et la 5e'],
        answer: 0,
        explain: 'Les deux cordes extrêmes sont des E, à deux octaves d’écart.',
      },
    ],
  },

  naturals: {
    title: 'Les sept notes naturelles',
    body: [
      'Il n’y a que sept noms de notes : C, D, E, F, G, A, B. Chacune se retrouve à plusieurs endroits du manche, mais rien ne se glisse entre E et F, ni entre B et C.',
      'Sur une même corde, E et F sont à 1 case l’un de l’autre, et B et C aussi. Tous les autres voisins naturels sont à 2 cases : C–D, D–E, F–G, G–A, A–B.',
      'Un piano dit exactement la même chose : pas de touche noire entre E et F, ni entre B et C. Sur la guitare, cette touche qui manque est simplement une case qui n’existe pas.',
    ],
    questions: [
      {
        prompt: 'Combien de cases séparent E et F sur une même corde ?',
        choices: ['2 cases', '1 case', '3 cases', '4 cases'],
        answer: 1,
        explain: 'E et F sont voisines : rien ne se glisse entre elles, 1 case suffit.',
      },
      {
        prompt: 'Quelle paire de notes naturelles n’a aucune note entre elles ?',
        choices: ['C et D', 'D et E', 'F et G', 'E et F'],
        answer: 3,
        explain: 'E–F et B–C sont les deux paires collées : c’est là que tombent les demi-tons de la gamme majeure.',
      },
      {
        prompt: 'Tu joues un B et tu montes d’une case. Sur quelle note arrives-tu ?',
        choices: ['C', 'C♯', 'B', 'A'],
        answer: 0,
        explain: 'Après B vient directement C : il n’y a pas de dièse entre les deux.',
      },
    ],
  },

  octaves: {
    title: 'La même note à l’octave',
    body: [
      'Deux notes séparées d’une octave portent le même nom : un G grave et un G aigu, par exemple. Sur une même corde, l’octave est 12 cases plus haut.',
      'Pour la retrouver plus vite, change de corde : monte de 2 cordes vers les aigus et ajoute 2 cases. Depuis la 6e corde, case 3 (G), le même G est sur la 4e corde, case 5.',
      'Une exception : quand la forme traverse la 2e corde (B), il faut 3 cases au lieu de 2, à cause de la tierce entre G et B. Depuis la 4e corde, case 5, le G est sur la 2e corde, case 8.',
    ],
    questions: [
      {
        prompt: 'Sur une même corde, combien de cases séparent une note de son octave ?',
        choices: ['7 cases', '10 cases', '12 cases', '5 cases'],
        answer: 2,
        explain: 'Douze cases : la même note, une octave plus haut.',
      },
      {
        prompt: 'Depuis la 6e corde, case 3, où retrouves-tu la même note deux cordes plus haut ?',
        choices: ['4e corde, case 3', '4e corde, case 5', '5e corde, case 5', '4e corde, case 8'],
        answer: 1,
        explain: 'Deux cordes vers les aigus, 2 cases de plus : c’est la forme d’octave de base.',
      },
      {
        prompt: 'Combien de cases faut-il ajouter quand la forme traverse la 2e corde (B) ?',
        choices: ['2 cases', '4 cases', '5 cases', '3 cases'],
        answer: 3,
        explain: 'À cause de la tierce entre G et B, la forme s’élargit d’une case : 3 au lieu de 2.',
      },
    ],
  },

  intervals: {
    title: 'Les intervalles',
    body: [
      'Un intervalle, c’est la distance entre deux notes, comptée en cases. La seconde vaut 2 cases, la tierce majeure 4 cases, la quinte 7 cases, l’octave 12 cases.',
      'Ces distances ne dépendent pas de la tonalité : une quinte fait toujours 7 cases, où que tu sois sur le manche.',
      'Tout le reste s’appuie là-dessus. Un accord est un empilement d’intervalles, une gamme une suite d’intervalles : quand tu connais la tierce et la quinte, tu as l’essentiel des accords de louange.',
    ],
    questions: [
      {
        prompt: 'Combien de cases vaut une tierce majeure ?',
        choices: ['3 cases', '5 cases', '7 cases', '4 cases'],
        answer: 3,
        explain: '4 cases : c’est la tierce qui rend un accord majeur.',
      },
      {
        prompt: 'Combien de cases vaut une quinte ?',
        choices: ['5 cases', '6 cases', '7 cases', '12 cases'],
        answer: 2,
        explain: '7 cases : l’intervalle le plus stable après l’octave.',
      },
      {
        prompt: 'Sur deux cordes voisines, quel intervalle sépare deux notes de même case ?',
        choices: ['Une quarte', 'Une tierce', 'Une quinte', 'Une octave'],
        answer: 0,
        explain: 'Sauf entre G et B, deux cordes voisines sont à une quarte, soit 5 cases.',
      },
    ],
  },

  majorScale: {
    title: 'La gamme majeure',
    body: [
      'La gamme majeure est une recette de distances : ton, ton, demi-ton, ton, ton, ton, demi-ton, soit 2 2 1 2 2 2 1 cases. Elle contient 7 notes, puis l’octave.',
      'En C, elle donne C D E F G A B, sans altération. Les deux demi-tons tombent entre la 3e et la 4e note, puis entre la 7e note et l’octave : E–F et B–C.',
      'Dans toutes les autres tonalités, on garde la même recette et on ajoute les dièses ou les bémols nécessaires. En G, c’est le F qui devient F♯.',
    ],
    questions: [
      {
        prompt: 'Quelle est la formule de la gamme majeure ?',
        choices: ['2 1 2 2 1 2 2', '1 2 2 2 1 2 2', '2 2 1 2 2 2 1', '2 2 2 1 2 2 1'],
        answer: 2,
        explain: 'Ton, ton, demi-ton, ton, ton, ton, demi-ton : 2 2 1 2 2 2 1.',
      },
      {
        prompt: 'Où tombent les demi-tons de la gamme majeure ?',
        choices: [
          'Entre les degrés 1 et 2, et 5 et 6',
          'Entre les degrés 2 et 3, et 6 et 7',
          'Entre les degrés 4 et 5, et 6 et 7',
          'Entre les degrés 3 et 4, et 7 et 8',
        ],
        answer: 3,
        explain: 'Les deux demi-tons sont entre la 3e et la 4e note, puis entre la 7e et l’octave.',
      },
      {
        prompt: 'Quelle note est altérée dans la gamme de G ?',
        choices: ['F♯', 'C♯', 'B♭', 'Aucune'],
        answer: 0,
        explain: 'La gamme de G est G A B C D E F♯ : seul le F devient F♯.',
      },
    ],
  },

  keys: {
    title: 'La tonalité',
    body: [
      'Dire qu’un chant est « en G », c’est dire que G est la maison : le chant part de là, y revient, et s’y repose à la fin. Ses notes et ses accords viennent de la gamme de G.',
      'Dans une tonalité majeure, les accords se répartissent toujours de la même façon : le 1, le 4 et le 5 sont majeurs, le 2, le 3 et le 6 mineurs, le 7 diminué. En G : G, Am, Bm, C, D, Em, F♯°.',
      'En louange, la tonalité est souvent choisie pour l’assemblée et pas pour la guitare : le chant peut être en D alors que tu joues des formes de C avec un capo en case 2.',
    ],
    questions: [
      {
        prompt: 'Que veut dire « ce chant est en G » ?',
        choices: [
          'Le chant commence par un accord de G',
          'G est la note de repos du chant, et sa gamme fournit les accords',
          'Le chant ne contient que des accords majeurs',
          'Le chant se joue sans capodastre',
        ],
        answer: 1,
        explain: 'La tonalité, c’est la maison du chant : il y revient, et ses accords sortent de cette gamme.',
      },
      {
        prompt: 'En D, quelles notes sont altérées ?',
        choices: ['F♯ seulement', 'C♯ seulement', 'F♯ et C♯', 'Aucune'],
        answer: 2,
        explain: 'La gamme de D est D E F♯ G A B C♯ : deux dièses.',
      },
      {
        prompt: 'Quel accord donne la sensation de repos à la fin d’un chant ?',
        choices: ['Le 4', 'Le 5', 'Le 6m', 'Le 1'],
        answer: 3,
        explain: 'Le 1, l’accord de la tonalité, est le point de repos naturel.',
      },
    ],
  },

  chords: {
    title: 'Ce qu’est un accord',
    body: [
      'Un accord, c’est au moins 3 notes jouées ensemble : la fondamentale (le nom de l’accord), la tierce et la quinte. Sur C : C, E et G.',
      'La tierce décide de tout : à 4 cases au-dessus de la fondamentale, l’accord est majeur ; à 3 cases, il est mineur. La quinte, elle, ne bouge pas.',
      'C’est pour ça qu’un C et un Cm se jouent presque pareil : une seule case change, et l’accord change complètement de couleur.',
    ],
    questions: [
      {
        prompt: 'Quelles notes forment un accord de C majeur ?',
        choices: ['C E G', 'C D E', 'C F G', 'C E A'],
        answer: 0,
        explain: 'Fondamentale, tierce et quinte : C, E et G.',
      },
      {
        prompt: 'Quelle note décide qu’un accord est majeur ou mineur ?',
        choices: ['La fondamentale', 'La tierce', 'La quinte', 'L’octave'],
        answer: 1,
        explain: 'La tierce à 4 cases donne un majeur, à 3 cases un mineur ; la quinte reste la même.',
      },
      {
        prompt: 'Combien de cases séparent la fondamentale de sa tierce mineure ?',
        choices: ['2 cases', '4 cases', '3 cases', '7 cases'],
        answer: 2,
        explain: '3 cases pour la tierce mineure, 4 pour la majeure : une seule case change toute la couleur.',
      },
    ],
  },

  chordFamilies: {
    title: 'Les accords d’une tonalité',
    body: [
      'Une tonalité majeure donne toujours les mêmes 7 accords, un par degré : le 1, le 4 et le 5 majeurs, le 2, le 3 et le 6 mineurs, le 7 diminué. En C : C, Dm, Em, F, G, Am, B°.',
      'Le 6m est celui que tu croises le plus en louange : c’est le relatif mineur, il partage les mêmes notes que le 1. En C, c’est Am, l’accord affiché sur le manche.',
      'Repérer ces 7 accords, c’est pouvoir accompagner presque n’importe quel chant : la plupart des grilles tournent autour du 1, du 4, du 5 et du 6m.',
    ],
    questions: [
      {
        prompt: 'En C, quel accord est le 6m ?',
        choices: ['Em', 'Am', 'Dm', 'B°'],
        answer: 1,
        explain: 'Le 6e degré de C est A, et il est mineur : Am.',
      },
      {
        prompt: 'Quel degré est diminué dans une tonalité majeure ?',
        choices: ['Le 2', 'Le 4', 'Le 7', 'Le 6'],
        answer: 2,
        explain: 'Le 7e degré, écrit vii°, est le seul diminué de la famille.',
      },
      {
        prompt: 'En G, quel est l’accord du 4e degré ?',
        choices: ['Am', 'D', 'Em', 'C'],
        answer: 3,
        explain: 'La gamme de G est G A B C D E F♯ : le 4e degré est C, majeur.',
      },
    ],
  },

  caged: {
    title: 'Les 5 formes CAGED',
    body: [
      'CAGED, ce sont les 5 formes d’accords ouverts que tout le monde connaît : C, A, G, E et D. Mises bout à bout, elles couvrent tout le manche.',
      'Chaque forme peut se déplacer : tu poses un barré avec l’index et tu remontes. La même forme jouée 2 cases plus haut sonne 1 ton plus haut.',
      'Pour un C, les formes se suivent ainsi : C en position ouverte, A en case 3, G en case 5, E en case 8, D en case 10. La forme de E a sa fondamentale sur la 6e corde, la forme de A sur la 5e : c’est là que tu regardes pour savoir quel accord tu joues.',
    ],
    questions: [
      {
        prompt: 'Que désignent les lettres de CAGED ?',
        choices: [
          'Les 5 cordes de la guitare',
          'Les 5 tonalités les plus jouées',
          'Les 5 positions de la gamme majeure',
          'Les 5 formes d’accords ouverts C, A, G, E, D',
        ],
        answer: 3,
        explain: 'Cinq formes ouvertes que tu peux déplacer avec un barré pour jouer dans toutes les tonalités.',
      },
      {
        prompt: 'Dans la forme de A, quelle corde porte la fondamentale ?',
        choices: ['La 5e corde', 'La 4e corde', 'La 6e corde', 'La 3e corde'],
        answer: 0,
        explain: 'La forme de A a sa fondamentale sur la 5e corde, comme la forme de C ; celle de E sur la 6e.',
      },
      {
        prompt: 'Tu joues une forme de E avec un barré en case 5. Quel accord sonne ?',
        choices: ['G', 'E', 'C', 'A'],
        answer: 3,
        explain: 'La forme de E a sa fondamentale sur la 6e corde : case 5 de cette corde, c’est A.',
      },
    ],
  },

  capo: {
    title: 'Le capodastre',
    body: [
      'Le capodastre serre les 6 cordes sur une case : tout sonne plus haut, d’un demi-ton par case. Les cordes restent à vide sous le capo, donc tu gardes tes formes ouvertes et tes cordes qui sonnent plein.',
      'Pour savoir où le mettre, compte les cases entre la tonalité de ta forme et celle que tu veux. Formes de G avec un capo en case 2 : ça sonne en A. Formes de C en case 2 : ça sonne en D.',
      'En louange, c’est l’outil pour suivre l’assemblée : on te demande D, tu ne connais que les formes de C, capo en case 2 et c’est réglé. Plus le capo est bas, plus le manche reste confortable.',
    ],
    questions: [
      {
        prompt: 'Tu joues des formes de G avec un capo en case 2. Dans quelle tonalité sonnes-tu ?',
        choices: ['A', 'G', 'B♭', 'C'],
        answer: 0,
        explain: 'G plus 2 demi-tons donne A.',
      },
      {
        prompt: 'Tu veux sonner en D avec des formes de C. Où mets-tu le capo ?',
        choices: ['Case 1', 'Case 3', 'Case 2', 'Case 5'],
        answer: 2,
        explain: 'C plus 2 demi-tons donne D : capo en case 2.',
      },
      {
        prompt: 'Pourquoi un guitariste de louange utilise-t-il un capodastre ?',
        choices: [
          'Pour changer l’accordage de la guitare',
          'Pour jouer des formes ouvertes dans une autre tonalité, sans barrés',
          'Pour jouer moins fort',
          'Pour accorder la guitare plus vite',
        ],
        answer: 1,
        explain: 'Le capo déplace la guitare entière : tu gardes tes doigtés et tes cordes à vide, la tonalité change.',
      },
    ],
  },

  nashville: {
    title: 'Le chiffrage Nashville',
    body: [
      'Plutôt que d’écrire G, C, D, on écrit 1, 4, 5 : ce sont les degrés de la tonalité. En G : 1 = G, 4 = C, 5 = D, 6m = Em.',
      'Le m veut dire mineur, comme dans 6m. Une grille en chiffres se transpose dans n’importe quelle tonalité sans rien réécrire : 1 4 5 6m marche en G comme en C.',
      'En louange, ça rend service quand la tonalité change au dernier moment : le chant monte d’un ton, les chiffres ne bougent pas, seuls les accords changent.',
    ],
    questions: [
      {
        prompt: 'En G, à quoi correspond le 5 ?',
        choices: ['C', 'Em', 'Am', 'D'],
        answer: 3,
        explain: 'Le 5e degré de G est D, majeur.',
      },
      {
        prompt: 'Que veut dire 6m dans une grille ?',
        choices: ['Le 6e degré, majeur', 'Un accord de 6 notes', 'Le 6e degré, mineur', 'Six mesures'],
        answer: 2,
        explain: 'Le chiffre donne le degré, le m dit mineur : en G, 6m est Em.',
      },
      {
        prompt: 'Pourquoi le chiffrage est-il pratique en louange ?',
        choices: [
          'Il sonne mieux que les lettres',
          'Il permet de transposer une grille sans la réécrire',
          'Il évite d’accorder la guitare',
          'Il indique le tempo du chant',
        ],
        answer: 1,
        explain: 'Les degrés ne changent pas quand la tonalité change : 1 4 5 6m marche partout.',
      },
    ],
  },

  ear: {
    title: 'Reconnaître à l’oreille',
    body: [
      'Majeur ou mineur, ça s’entend d’abord à la tierce : un accord majeur sonne clair et ouvert, un accord mineur plus sombre, plus serré. C’est la même différence que 4 cases contre 3 sur le manche.',
      'Pour trouver la tonalité d’un chant, écoute où il se repose : la dernière note de la mélodie et le dernier accord du refrain retombent presque toujours sur le 1.',
      'Entraîne-toi sur les chants que tu connais : repère le 1, puis essaie le 5 juste avant, puis le 6m. Tu reconnaîtras bientôt la cadence 6m 4 1 5 sans réfléchir.',
    ],
    questions: [
      {
        prompt: 'Sur quel accord un chant se repose-t-il le plus souvent à la fin ?',
        choices: ['Le 1', 'Le 5', 'Le 6m', 'Le 4'],
        answer: 0,
        explain: 'Le 1, l’accord de la tonalité : c’est le point de repos que ton oreille attend.',
      },
      {
        prompt: 'Qu’est-ce qui différencie un accord majeur d’un accord mineur à l’oreille ?',
        choices: ['La fondamentale', 'La quinte', 'La tierce', 'Le nombre de cordes jouées'],
        answer: 2,
        explain: 'La tierce : claire et ouverte en majeur, plus sombre en mineur.',
      },
      {
        prompt: 'Quel est le bon réflexe pour trouver la tonalité d’un chant ?',
        choices: [
          'Chercher l’accord le plus aigu',
          'Compter les mesures',
          'Regarder la main du guitariste',
          'Chercher la note où la mélodie se repose',
        ],
        answer: 3,
        explain: 'La note et l’accord sur lesquels le chant retombe donnent la tonalité.',
      },
    ],
  },
};
