import { seededShuffle } from './cases.ts';
import {
  FICTIONAL,
  fictionalPartyIds,
  fictionalQuestion,
} from '../../content/fictional/index.ts';

export const PARTY_QUESTIONS = FICTIONAL.party;
export const partyQuestionIds = fictionalPartyIds;

export const partyQuestion = (id: string | undefined, seed: string) => {
  if (!id) return;
  // Step 3 rooms used these five IDs for the same original comments.
  const legacy = /^party-([1-5])$/.exec(id);
  if (legacy) {
    const record = fictionalQuestion(
      `fictional-party-00${legacy[1]}`,
      `${seed}:${id}`
    );
    if (!record) return;
    const { cultureHint, ...legacyRecord } = record;
    return {
      ...legacyRecord,
      id,
      choices:
        id === 'party-2'
          ? seededShuffle(
              ['CatsAreAssholes', 'CatAdvice', 'legalcatadvice', 'aww'],
              `${seed}:${id}`
            )
          : record.choices,
    };
  }
  return fictionalQuestion(id, `${seed}:${id}`);
};
