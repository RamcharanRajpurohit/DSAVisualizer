/**
 * One input contract for every visualizer, so values look and behave the same everywhere.
 *
 *  - Values the user types: whole numbers VALUE_MIN … VALUE_MAX.
 *  - Random / preset values: RANDOM_MIN … RANDOM_MAX (two digits keep nodes and bars compact).
 *  - Sizes: RANDOM_COUNT values by default when something is filled randomly.
 */
export const VALUE_MIN = 0;
export const VALUE_MAX = 999;
export const RANDOM_MIN = 1;
export const RANDOM_MAX = 99;
export const RANDOM_COUNT = 8;

export const RANGE_TEXT = `${VALUE_MIN}–${VALUE_MAX}`;
