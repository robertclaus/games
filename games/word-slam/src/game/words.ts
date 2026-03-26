import { LibraryWord, WordCategory } from './types';

// ── Word Library ───────────────────────────────────────────────────────────────
// These are the "explainer cards" that storytellers arrange to describe the answer.
// Each word appears exactly once; storytellers select from this shared set.

function w(id: string, word: string, category: WordCategory): LibraryWord {
  return { id, word, category };
}

export const WORD_LIBRARY: LibraryWord[] = [
  // ── Nouns (34) ──────────────────────────────────────────────────────────────
  w('n-person',  'person',  'noun'),
  w('n-man',     'man',     'noun'),
  w('n-woman',   'woman',   'noun'),
  w('n-child',   'child',   'noun'),
  w('n-animal',  'animal',  'noun'),
  w('n-dog',     'dog',     'noun'),
  w('n-cat',     'cat',     'noun'),
  w('n-bird',    'bird',    'noun'),
  w('n-fish',    'fish',    'noun'),
  w('n-plant',   'plant',   'noun'),
  w('n-tree',    'tree',    'noun'),
  w('n-water',   'water',   'noun'),
  w('n-fire',    'fire',    'noun'),
  w('n-earth',   'earth',   'noun'),
  w('n-air',     'air',     'noun'),
  w('n-sky',     'sky',     'noun'),
  w('n-sun',     'sun',     'noun'),
  w('n-moon',    'moon',    'noun'),
  w('n-star',    'star',    'noun'),
  w('n-land',    'land',    'noun'),
  w('n-sea',     'sea',     'noun'),
  w('n-ice',     'ice',     'noun'),
  w('n-food',    'food',    'noun'),
  w('n-house',   'house',   'noun'),
  w('n-city',    'city',    'noun'),
  w('n-country', 'country', 'noun'),
  w('n-body',    'body',    'noun'),
  w('n-head',    'head',    'noun'),
  w('n-hand',    'hand',    'noun'),
  w('n-voice',   'voice',   'noun'),
  w('n-game',    'game',    'noun'),
  w('n-book',    'book',    'noun'),
  w('n-money',   'money',   'noun'),
  w('n-time',    'time',    'noun'),

  // ── Verbs (30) ──────────────────────────────────────────────────────────────
  w('v-is',    'is',    'verb'),
  w('v-has',   'has',   'verb'),
  w('v-make',  'make',  'verb'),
  w('v-go',    'go',    'verb'),
  w('v-come',  'come',  'verb'),
  w('v-take',  'take',  'verb'),
  w('v-get',   'get',   'verb'),
  w('v-see',   'see',   'verb'),
  w('v-know',  'know',  'verb'),
  w('v-think', 'think', 'verb'),
  w('v-look',  'look',  'verb'),
  w('v-use',   'use',   'verb'),
  w('v-find',  'find',  'verb'),
  w('v-give',  'give',  'verb'),
  w('v-move',  'move',  'verb'),
  w('v-fall',  'fall',  'verb'),
  w('v-grow',  'grow',  'verb'),
  w('v-eat',   'eat',   'verb'),
  w('v-drink', 'drink', 'verb'),
  w('v-sleep', 'sleep', 'verb'),
  w('v-play',  'play',  'verb'),
  w('v-run',   'run',   'verb'),
  w('v-fly',   'fly',   'verb'),
  w('v-swim',  'swim',  'verb'),
  w('v-fight', 'fight', 'verb'),
  w('v-build', 'build', 'verb'),
  w('v-break', 'break', 'verb'),
  w('v-live',  'live',  'verb'),
  w('v-work',  'work',  'verb'),
  w('v-die',   'die',   'verb'),

  // ── Adjectives (30) ─────────────────────────────────────────────────────────
  w('a-big',       'big',       'adjective'),
  w('a-small',     'small',     'adjective'),
  w('a-old',       'old',       'adjective'),
  w('a-new',       'new',       'adjective'),
  w('a-good',      'good',      'adjective'),
  w('a-bad',       'bad',       'adjective'),
  w('a-hot',       'hot',       'adjective'),
  w('a-cold',      'cold',      'adjective'),
  w('a-fast',      'fast',      'adjective'),
  w('a-slow',      'slow',      'adjective'),
  w('a-high',      'high',      'adjective'),
  w('a-low',       'low',       'adjective'),
  w('a-long',      'long',      'adjective'),
  w('a-short',     'short',     'adjective'),
  w('a-heavy',     'heavy',     'adjective'),
  w('a-hard',      'hard',      'adjective'),
  w('a-soft',      'soft',      'adjective'),
  w('a-loud',      'loud',      'adjective'),
  w('a-quiet',     'quiet',     'adjective'),
  w('a-dark',      'dark',      'adjective'),
  w('a-bright',    'bright',    'adjective'),
  w('a-sharp',     'sharp',     'adjective'),
  w('a-round',     'round',     'adjective'),
  w('a-empty',     'empty',     'adjective'),
  w('a-full',      'full',      'adjective'),
  w('a-wild',      'wild',      'adjective'),
  w('a-dangerous', 'dangerous', 'adjective'),
  w('a-beautiful', 'beautiful', 'adjective'),
  w('a-dead',      'dead',      'adjective'),
  w('a-alive',     'alive',     'adjective'),

  // ── Connectors (25) ─────────────────────────────────────────────────────────
  w('c-in',       'in',       'connector'),
  w('c-on',       'on',       'connector'),
  w('c-at',       'at',       'connector'),
  w('c-of',       'of',       'connector'),
  w('c-to',       'to',       'connector'),
  w('c-from',     'from',     'connector'),
  w('c-with',     'with',     'connector'),
  w('c-by',       'by',       'connector'),
  w('c-not',      'not',      'connector'),
  w('c-and',      'and',      'connector'),
  w('c-very',     'very',     'connector'),
  w('c-more',     'more',     'connector'),
  w('c-less',     'less',     'connector'),
  w('c-like',     'like',     'connector'),
  w('c-near',     'near',     'connector'),
  w('c-far',      'far',      'connector'),
  w('c-above',    'above',    'connector'),
  w('c-below',    'below',    'connector'),
  w('c-before',   'before',   'connector'),
  w('c-after',    'after',    'connector'),
  w('c-around',   'around',   'connector'),
  w('c-together', 'together', 'connector'),
  w('c-without',  'without',  'connector'),
  w('c-inside',   'inside',   'connector'),
  w('c-outside',  'outside',  'connector'),
];

// ── Answer Words ───────────────────────────────────────────────────────────────
// The secret words that teams must guess each round.

export const ANSWER_WORDS: string[] = [
  // Animals
  'elephant', 'penguin', 'butterfly', 'octopus', 'dolphin', 'giraffe',
  'kangaroo', 'crocodile', 'eagle', 'bee', 'wolf', 'shark', 'monkey',
  'frog', 'snake',

  // Food & Drink
  'pizza', 'chocolate', 'coffee', 'bread', 'soup', 'cake', 'banana',
  'sushi', 'cheese', 'honey',

  // Sports & Activities
  'swimming', 'skiing', 'boxing', 'dancing', 'singing', 'cooking',
  'painting', 'fishing', 'archery', 'cycling', 'surfing', 'climbing',

  // Places
  'hospital', 'library', 'airport', 'beach', 'castle', 'museum',
  'forest', 'mountain', 'island', 'cave', 'lighthouse', 'prison',
  'volcano', 'jungle',

  // Objects
  'umbrella', 'telescope', 'compass', 'bicycle', 'submarine', 'camera',
  'mirror', 'clock', 'key', 'ladder', 'candle',

  // Nature & Weather
  'earthquake', 'rainbow', 'tornado', 'avalanche', 'hurricane',
  'sunrise', 'river', 'glacier', 'thunder', 'desert',

  // Concepts & Abstract
  'birthday', 'friendship', 'freedom', 'danger', 'mystery', 'victory',
  'jealousy', 'adventure', 'silence', 'shadow', 'dream', 'treasure',
  'magic',

  // Professions & People
  'doctor', 'teacher', 'farmer', 'musician', 'detective', 'astronaut',
  'pirate', 'ninja', 'chef', 'firefighter',

  // Events
  'wedding', 'funeral', 'vacation', 'marathon', 'concert', 'party',

  // Other
  'ghost', 'robot', 'dragon', 'alien', 'crown', 'sword', 'safari',
];

// ── Utilities ──────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickAnswer(usedAnswers: string[]): string {
  const available = ANSWER_WORDS.filter(a => !usedAnswers.includes(a));
  const pool = available.length > 0 ? available : shuffle([...ANSWER_WORDS]);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Pre-built lookup map for the word library
export const WORD_BY_ID = new Map<string, LibraryWord>(
  WORD_LIBRARY.map(w => [w.id, w])
);

export const WORDS_BY_CATEGORY = {
  noun:      WORD_LIBRARY.filter(w => w.category === 'noun'),
  verb:      WORD_LIBRARY.filter(w => w.category === 'verb'),
  adjective: WORD_LIBRARY.filter(w => w.category === 'adjective'),
  connector: WORD_LIBRARY.filter(w => w.category === 'connector'),
};
