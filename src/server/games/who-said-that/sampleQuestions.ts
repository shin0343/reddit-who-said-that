import type { QuestionRecord } from '../../../shared/games/who-said-that/contracts.ts';

// FICTIONAL sample comments written for development. Not real Reddit content; no real authors.
// UI must show a "Sample case" label while any of these are served (see docs/GAME_DESIGN.md).
// TODO(Phase 1): replace with the curated question bank + Reddit comment provider.
const fictional = { kind: 'fictional' } as const;

export const SAMPLE_QUESTIONS: readonly QuestionRecord[] = [
  {
    id: 'sample-1',
    body: 'Update: I told my sister she could not bring her emotional support peacock to the wedding. She says I am the villain now.',
    choices: ['AmItheAsshole', 'weddingplanning', 'birding', 'tifu'],
    answerSubreddit: 'AmItheAsshole',
    threadTitle: 'AITA for banning a peacock from my wedding?',
    explanation: 'Family conflict + "am I the villain" framing is the classic AITA judgment request.',
    source: 'fictional',
    sourceRef: fictional,
  },
  {
    id: 'sample-2',
    body: 'Just lift the pot. Season it. Patience. Every carbon steel pan looks like that at first, it is called character.',
    choices: ['castiron', 'Cooking', 'BuyItForLife', 'mildlyinfuriating'],
    answerSubreddit: 'castiron',
    threadTitle: 'Is my new pan ruined??',
    explanation: 'Seasoning reassurance and "character" talk are cast-iron community staples.',
    source: 'fictional',
    sourceRef: fictional,
  },
  {
    id: 'sample-3',
    body: 'Rookie mistake. You set the buildings down before the belts. Now the spaghetti owns you.',
    choices: ['factorio', 'SimCity', 'Minecraft', 'spaghetti'],
    answerSubreddit: 'factorio',
    threadTitle: 'My first base is... a lot',
    explanation: '"Spaghetti" is factory-game slang for tangled conveyor belts, not pasta.',
    source: 'fictional',
    sourceRef: fictional,
  },
  {
    id: 'sample-4',
    body: 'Not a single blade out of place. My neighbor walked out with coffee and just stared. Worth it.',
    choices: ['lawncare', 'oddlysatisfying', 'gardening', 'mildlyinteresting'],
    answerSubreddit: 'lawncare',
    threadTitle: 'Finally got the stripes right',
    explanation: 'Stripe pride and neighbor envy are the lawn community\'s favorite flex.',
    source: 'fictional',
    sourceRef: fictional,
  },
  {
    id: 'sample-5',
    body: 'Sir, this is a gardening sub. But also yes, that tomato is clearly plotting something.',
    choices: ['gardening', 'tomatoes', 'Wellthatsucks', 'funny'],
    answerSubreddit: 'gardening',
    threadTitle: 'My tomato grew a face',
    explanation: 'Gentle off-topic correction followed by playing along is peak hobby-sub tone.',
    source: 'fictional',
    sourceRef: fictional,
  },
];
