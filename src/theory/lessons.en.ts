import type { LessonText } from './lessons';

/** The theory course, in English. */
export const lessonsEn: LessonText = {
  strings: {
    title: 'The six open strings',
    body: [
      'From lowest to highest, the open strings are E, A, D, G, B, E. The 6th string, the thickest, gives a low E; the 1st, the thinnest, gives a high E. Same note name, two octaves apart.',
      'Neighbouring strings sit a fourth apart, which is 5 frets. One pair is different: between the 3rd string (G) and the 2nd (B) the gap is a major third, 4 frets.',
      'To remember them, find the two E strings at the edges and fill in the middle: A, D, G, B. In other words, the guitar is tuned in fourths everywhere except between G and B.',
    ],
    questions: [
      {
        prompt: 'Which is the lowest string on a guitar in standard tuning?',
        choices: ['A', 'D', 'E', 'G'],
        answer: 2,
        explain: 'The 6th string, the thickest one, gives a low E: the lowest note on the guitar.',
      },
      {
        prompt: 'What is the gap between the 3rd string (G) and the 2nd string (B)?',
        choices: ['A fourth, 5 frets', 'A fifth, 7 frets', 'A major third, 4 frets', 'An octave, 12 frets'],
        answer: 2,
        explain: 'This is the one pair that is not a fourth: from G to B there are only 4 frets.',
      },
      {
        prompt: 'Two open strings share the same note name. Which ones?',
        choices: ['The 6th and the 1st', 'The 5th and the 2nd', 'The 4th and the 3rd', 'The 6th and the 5th'],
        answer: 0,
        explain: 'Both outer strings are E, two octaves apart.',
      },
    ],
  },

  naturals: {
    title: 'The seven natural notes',
    body: [
      'There are only seven note names: C, D, E, F, G, A, B. Each of them turns up in several places on the neck, but nothing sits between E and F, or between B and C.',
      'On one string, E and F are 1 fret apart, and so are B and C. Every other pair of neighbouring naturals is 2 frets apart: C–D, D–E, F–G, G–A, A–B.',
      'A piano says the same thing: no black key between E and F, and none between B and C. On the guitar, that missing key is simply a fret that does not exist.',
    ],
    questions: [
      {
        prompt: 'How many frets apart are E and F on one string?',
        choices: ['2 frets', '1 fret', '3 frets', '4 frets'],
        answer: 1,
        explain: 'E and F are neighbours: nothing fits between them, so 1 fret is enough.',
      },
      {
        prompt: 'Which pair of natural notes has no note between them?',
        choices: ['C and D', 'D and E', 'F and G', 'E and F'],
        answer: 3,
        explain: 'E–F and B–C are the two tight pairs: that is where the half steps of the major scale fall.',
      },
      {
        prompt: 'You play a B and move up 1 fret. Which note do you land on?',
        choices: ['C', 'C♯', 'B', 'A'],
        answer: 0,
        explain: 'After B comes C directly: there is no sharp between the two.',
      },
    ],
  },

  octaves: {
    title: 'The same note, an octave up',
    body: [
      'Two notes an octave apart share a name: a low G and a high G, for instance. On one string, the octave is 12 frets higher.',
      'To find it faster, change strings: move up 2 strings towards the treble and add 2 frets. From the 6th string, fret 3 (G), the same G is on the 4th string, fret 5.',
      'One exception: when the shape crosses the 2nd string (B), you need 3 frets instead of 2, because of the third between G and B. From the 4th string, fret 5, the G is on the 2nd string, fret 8.',
    ],
    questions: [
      {
        prompt: 'On one string, how many frets apart is a note from its octave?',
        choices: ['7 frets', '10 frets', '12 frets', '5 frets'],
        answer: 2,
        explain: 'Twelve frets: the same note, one octave higher.',
      },
      {
        prompt: 'Starting from the 6th string, fret 3, where do you find the same note two strings higher?',
        choices: ['4th string, fret 3', '4th string, fret 5', '5th string, fret 5', '4th string, fret 8'],
        answer: 1,
        explain: 'Two strings towards the treble, 2 frets up: that is the basic octave shape.',
      },
      {
        prompt: 'How many frets do you add when the shape crosses the 2nd string (B)?',
        choices: ['2 frets', '4 frets', '5 frets', '3 frets'],
        answer: 3,
        explain: 'Because of the third between G and B, the shape widens by one fret: 3 instead of 2.',
      },
    ],
  },

  intervals: {
    title: 'Intervals',
    body: [
      'An interval is the distance between two notes, counted in frets. A second is 2 frets, a major third is 4, a fifth is 7, an octave is 12.',
      'Those distances do not depend on the key: a fifth is always 7 frets, wherever you are on the neck.',
      'Everything else is built on this. A chord is a stack of intervals, and a scale is a run of them: once you know the third and the fifth, you have most of what worship songs need.',
    ],
    questions: [
      {
        prompt: 'How many frets is a major third?',
        choices: ['3 frets', '5 frets', '7 frets', '4 frets'],
        answer: 3,
        explain: '4 frets: the third is what makes a chord major.',
      },
      {
        prompt: 'How many frets is a fifth?',
        choices: ['5 frets', '6 frets', '7 frets', '12 frets'],
        answer: 2,
        explain: '7 frets: the most stable interval after the octave.',
      },
      {
        prompt: 'On two neighbouring strings, which interval separates two notes on the same fret?',
        choices: ['A fourth', 'A third', 'A fifth', 'An octave'],
        answer: 0,
        explain: 'Except between G and B, neighbouring strings are a fourth apart, 5 frets.',
      },
    ],
  },

  majorScale: {
    title: 'The major scale',
    body: [
      'The major scale is a recipe of distances: tone, tone, semitone, tone, tone, tone, semitone, or 2 2 1 2 2 2 1 frets. It holds 7 notes, then the octave.',
      'In C it gives C D E F G A B, with no accidentals. The two semitones fall between the 3rd and 4th notes, then between the 7th note and the octave: E–F and B–C.',
      'Every other key keeps the same recipe and adds the sharps or flats it needs. In G, the F becomes F♯.',
    ],
    questions: [
      {
        prompt: 'What is the formula of the major scale?',
        choices: ['2 1 2 2 1 2 2', '1 2 2 2 1 2 2', '2 2 1 2 2 2 1', '2 2 2 1 2 2 1'],
        answer: 2,
        explain: 'Tone, tone, semitone, tone, tone, tone, semitone: 2 2 1 2 2 2 1.',
      },
      {
        prompt: 'Where do the half steps of the major scale fall?',
        choices: [
          'Between degrees 1 and 2, and 5 and 6',
          'Between degrees 2 and 3, and 6 and 7',
          'Between degrees 4 and 5, and 6 and 7',
          'Between degrees 3 and 4, and 7 and 8',
        ],
        answer: 3,
        explain: 'The two half steps sit between the 3rd and 4th notes, then between the 7th and the octave.',
      },
      {
        prompt: 'Which note is altered in the key of G?',
        choices: ['F♯', 'C♯', 'B♭', 'None'],
        answer: 0,
        explain: 'The G scale is G A B C D E F♯: only the F is raised.',
      },
    ],
  },

  keys: {
    title: 'The key',
    body: [
      'Saying a song is in G means G is home: the song starts there, returns there, and rests there at the end. Its notes and its chords come from the G scale.',
      'In a major key the chords always line up the same way: the 1, the 4 and the 5 are major, the 2, the 3 and the 6 are minor, the 7 is diminished. In G: G, Am, Bm, C, D, Em, F♯°.',
      'In worship the key is often chosen for the congregation rather than for the guitar: a song may be in D while you play C shapes with a capo on fret 2.',
    ],
    questions: [
      {
        prompt: 'What does it mean when a song is in G?',
        choices: [
          'The song starts on a G chord',
          'G is where the song rests, and its scale supplies the chords',
          'The song only uses major chords',
          'The song is played without a capo',
        ],
        answer: 1,
        explain: 'The key is the home of the song: it keeps coming back there, and its chords come from that scale.',
      },
      {
        prompt: 'In D, which notes are altered?',
        choices: ['F♯ only', 'C♯ only', 'F♯ and C♯', 'None'],
        answer: 2,
        explain: 'The D scale is D E F♯ G A B C♯: two sharps.',
      },
      {
        prompt: 'Which chord gives the feeling of rest at the end of a song?',
        choices: ['The 4', 'The 5', 'The 6m', 'The 1'],
        answer: 3,
        explain: 'The 1, the chord of the key, is the natural resting point.',
      },
    ],
  },

  chords: {
    title: 'What a chord is',
    body: [
      'A chord is at least 3 notes played together: the root (the name of the chord), the third and the fifth. On C: C, E and G.',
      'The third decides everything: 4 frets above the root makes it major, 3 frets makes it minor. The fifth never changes.',
      'That is why C and Cm look almost the same on the neck: one fret moves, and the chord changes colour completely.',
    ],
    questions: [
      {
        prompt: 'Which notes make up a C major chord?',
        choices: ['C E G', 'C D E', 'C F G', 'C E A'],
        answer: 0,
        explain: 'Root, third and fifth: C, E and G.',
      },
      {
        prompt: 'Which note decides whether a chord is major or minor?',
        choices: ['The root', 'The third', 'The fifth', 'The octave'],
        answer: 1,
        explain: 'A third 4 frets above the root is major, 3 frets is minor; the fifth stays the same.',
      },
      {
        prompt: 'How many frets above the root is the minor third?',
        choices: ['2 frets', '4 frets', '3 frets', '7 frets'],
        answer: 2,
        explain: '3 frets for a minor third, 4 for a major one: a single fret changes the whole colour.',
      },
    ],
  },

  chordFamilies: {
    title: 'The chords of a key',
    body: [
      'A major key always gives the same 7 chords, one per degree: the 1, the 4 and the 5 are major, the 2, the 3 and the 6 are minor, the 7 is diminished. In C: C, Dm, Em, F, G, Am, B°.',
      'The 6m is the one you meet most in worship: it is the relative minor, sharing the same notes as the 1. In C that is Am, the chord shown on the neck.',
      'Knowing these 7 chords is enough to play almost any worship song: most charts move between the 1, the 4, the 5 and the 6m.',
    ],
    questions: [
      {
        prompt: 'In C, which chord is the 6m?',
        choices: ['Em', 'Am', 'Dm', 'B°'],
        answer: 1,
        explain: 'The 6th degree of C is A, and it is minor: Am.',
      },
      {
        prompt: 'Which degree is diminished in a major key?',
        choices: ['The 2', 'The 4', 'The 7', 'The 6'],
        answer: 2,
        explain: 'The 7th degree, written vii°, is the only diminished chord in the family.',
      },
      {
        prompt: 'In G, which chord is the 4th degree?',
        choices: ['Am', 'D', 'Em', 'C'],
        answer: 3,
        explain: 'The G scale is G A B C D E F♯: the 4th degree is C, and it is major.',
      },
    ],
  },

  caged: {
    title: 'The 5 CAGED shapes',
    body: [
      'CAGED is the five open chord shapes everyone knows: C, A, G, E and D. Put end to end, they cover the whole neck.',
      'Each shape can move: barre with your index finger and slide it up. The same shape 2 frets higher sounds one tone higher.',
      'For a C chord the shapes follow in this order: C open, A at fret 3, G at fret 5, E at fret 8, D at fret 10. The E shape has its root on the 6th string and the A shape on the 5th: that is where you look to know which chord you are playing.',
    ],
    questions: [
      {
        prompt: 'What do the letters of CAGED stand for?',
        choices: [
          'The 5 strings of the guitar',
          'The 5 keys played most often',
          'The 5 positions of the major scale',
          'The 5 open chord shapes C, A, G, E, D',
        ],
        answer: 3,
        explain: 'Five open shapes you can move with a barre to play in every key.',
      },
      {
        prompt: 'In the A shape, which string carries the root?',
        choices: ['The 5th string', 'The 4th string', 'The 6th string', 'The 3rd string'],
        answer: 0,
        explain: 'The A shape has its root on the 5th string, like the C shape; the E shape has it on the 6th.',
      },
      {
        prompt: 'You play an E shape barred at fret 5. Which chord sounds?',
        choices: ['G', 'E', 'C', 'A'],
        answer: 3,
        explain: 'The E shape has its root on the 6th string: fret 5 of that string is A.',
      },
    ],
  },

  capo: {
    title: 'The capo',
    body: [
      'A capo clamps all 6 strings down on one fret: everything sounds higher, one semitone per fret. The strings stay open under it, so you keep your open shapes and your ringing strings.',
      'To place it, count the frets between the key of your shape and the key you want. G shapes with a capo on fret 2 sound in A. C shapes on fret 2 sound in D.',
      'In worship this is how you follow the congregation: the song is in D, you only know C shapes, capo on fret 2 and you are set. The lower the capo, the more comfortable the neck.',
    ],
    questions: [
      {
        prompt: 'You play G shapes with a capo on fret 2. Which key do you sound in?',
        choices: ['A', 'G', 'B♭', 'C'],
        answer: 0,
        explain: 'G plus 2 semitones is A.',
      },
      {
        prompt: 'You want to sound in D using C shapes. Where does the capo go?',
        choices: ['Fret 1', 'Fret 3', 'Fret 2', 'Fret 5'],
        answer: 2,
        explain: 'C plus 2 semitones is D: capo on fret 2.',
      },
      {
        prompt: 'Why does a worship guitarist use a capo?',
        choices: [
          'To change the tuning of the guitar',
          'To play open shapes in another key, without barre chords',
          'To play more quietly',
          'To tune the guitar faster',
        ],
        answer: 1,
        explain: 'The capo moves the whole guitar: you keep your fingerings and your open strings, and the key changes.',
      },
    ],
  },

  nashville: {
    title: 'The number system',
    body: [
      'Instead of writing G, C, D, you write 1, 4, 5: the degrees of the key. In G: 1 = G, 4 = C, 5 = D, 6m = Em.',
      'The m means minor, as in 6m. A chart in numbers transposes into any key without rewriting anything: 1 4 5 6m works in G and in C.',
      'In worship that pays off when the key changes at the last minute: the song goes up a tone, the numbers stay put, only the chords change.',
    ],
    questions: [
      {
        prompt: 'In G, which chord is the 5?',
        choices: ['C', 'Em', 'Am', 'D'],
        answer: 3,
        explain: 'The 5th degree of G is D, and it is major.',
      },
      {
        prompt: 'What does 6m mean in a chart?',
        choices: ['The 6th degree, major', 'A chord with 6 notes', 'The 6th degree, minor', 'Six bars'],
        answer: 2,
        explain: 'The number gives the degree and the m tells you it is minor: in G, 6m is Em.',
      },
      {
        prompt: 'Why are numbers useful in worship?',
        choices: [
          'They sound better than letters',
          'They let you transpose a chart without rewriting it',
          'They save you from tuning the guitar',
          'They show the tempo of the song',
        ],
        answer: 1,
        explain: 'The degrees do not change when the key changes: 1 4 5 6m works anywhere.',
      },
    ],
  },

  ear: {
    title: 'Hearing the key',
    body: [
      'Major or minor is mostly about the third: a major chord sounds bright and open, a minor chord darker and tighter. It is the same difference as 4 frets against 3 on the neck.',
      'To find the key of a song, listen for where it rests: the last note of the melody and the last chord of the chorus almost always land on the 1.',
      'Train on songs you know: find the 1, then try the 5 just before it, then the 6m. Soon you will recognise a 6m 4 1 5 cadence without thinking about it.',
    ],
    questions: [
      {
        prompt: 'Which chord does a song most often rest on at the end?',
        choices: ['The 1', 'The 5', 'The 6m', 'The 4'],
        answer: 0,
        explain: 'The 1, the chord of the key: the resting point your ear expects.',
      },
      {
        prompt: 'What tells a major chord from a minor chord by ear?',
        choices: ['The root', 'The fifth', 'The third', 'The number of strings you play'],
        answer: 2,
        explain: 'The third: bright and open when major, darker when minor.',
      },
      {
        prompt: 'What is the right reflex for finding the key of a song?',
        choices: [
          'Listen for the highest chord',
          'Count the bars',
          'Watch the guitarist’s hand',
          'Listen for the note the melody rests on',
        ],
        answer: 3,
        explain: 'The note and the chord the song keeps falling back on give you the key.',
      },
    ],
  },
};
