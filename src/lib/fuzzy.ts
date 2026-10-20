/**
 * Typing judgement for the intention phrase.
 *
 * Two independent predicates drive the whole prompt UI:
 *
 *   isComplete()  – may the user press Enter and enter the site?
 *   isOnTrack()   – is the input still a plausible beginning of the phrase?
 *
 * The underline colour is derived from them (neutral / green / red) and the
 * ghost completion is only rendered while the input is on track.
 *
 * Small typos are always forgiven (the original extension's default). The
 * budget is measured against the whole phrase, not against what has been
 * typed so far: characters the user has not reached yet count as correct, so
 * one wrong letter early in a long phrase is not treated as a failure just
 * because only two letters have been typed.
 */

const MAX_EDIT_BUDGET = 2;

/**
 * How many characters may be wrong in a phrase of this length. Short phrases
 * have to be typed exactly — two wrong characters in a four letter word is not
 * a typo, it is a different word.
 */
const budgetFor = (length: number): number =>
  Math.min(MAX_EDIT_BUDGET, Math.floor(length / 3));

const normalize = (value: string): string =>
  value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Optimal string alignment distance (Damerau-Levenshtein without the
 * unrestricted transposition rule). Cheap and good enough for short phrases.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const bLen = b.length;
  let prev2 = new Array<number>(bLen + 1).fill(0);
  let prev = new Array<number>(bLen + 1);
  let curr = new Array<number>(bLen + 1);

  for (let j = 0; j <= bLen; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, prev2[j - 2] + 1);
      }
      curr[j] = best;
    }
    const recycled = prev2;
    prev2 = prev;
    prev = curr;
    curr = recycled;
  }

  return prev[bLen];
}

/** True when the input is close enough to the whole phrase to be accepted. */
export function isComplete(input: string, expected: string): boolean {
  const typed = normalize(input);
  const wanted = normalize(expected);
  if (!typed || !wanted) return false;
  if (typed === wanted) return true;

  // A prefix is never complete, however close: the rest of the phrase is
  // still sitting in the ghost completion and the user has not typed it.
  if (wanted.startsWith(typed)) return false;

  const budget = budgetFor(wanted.length);
  if (budget === 0) return false;
  if (Math.abs(typed.length - wanted.length) > budget) return false;
  return editDistance(typed, wanted) <= budget;
}

/** True when the input is still heading in the right direction. */
export function isOnTrack(input: string, expected: string): boolean {
  const typed = normalize(input);
  const wanted = normalize(expected);
  if (!typed) return true;
  if (!wanted) return false;
  if (wanted.startsWith(typed)) return true;
  if (typed.length > wanted.length) return isComplete(input, expected);

  // The budget comes from the phrase, not from the part that has been typed:
  // everything the user has not reached yet counts as still correct.
  const budget = budgetFor(wanted.length);
  if (budget === 0) return false;
  return editDistance(typed, wanted.slice(0, typed.length)) <= budget;
}

/**
 * The ghost completion that follows the caret.
 *
 * Aligns the typed characters against the phrase greedily so a mistyped or
 * skipped character does not shift the remainder by a whole letter.
 */
export function hintFor(input: string, expected: string): string {
  if (!expected) return '';
  if (!input) return expected;
  if (input.length >= expected.length) return '';

  let i = 0;
  let j = 0;
  while (i < input.length && j < expected.length) {
    if (input[i] === expected[j]) {
      i += 1;
      j += 1;
    } else if (expected[j + 1] === input[i]) {
      // the user skipped a character
      i += 1;
      j += 2;
    } else {
      // substituted or inserted a character
      i += 1;
      j += 1;
    }
  }

  return expected.slice(j);
}
