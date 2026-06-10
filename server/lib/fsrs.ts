/** FSRS simplificado — 4 ratings (1=Again, 2=Hard, 3=Good, 4=Easy) */

export type FSRSRating = 1 | 2 | 3 | 4;

export interface FSRSState {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}

export interface FSRSResult extends FSRSState {
  interval: number;
  nextReview: Date;
}

const INITIAL_DIFFICULTY = 5;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

function clampDifficulty(d: number) {
  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, d));
}

export function initialFSRSState(): FSRSState {
  return { stability: 0, difficulty: INITIAL_DIFFICULTY, reps: 0, lapses: 0 };
}

export function stateFromLegacy(interval: number, easeFactor: number, reviewCount: number): FSRSState {
  return {
    stability: interval || 0,
    difficulty: easeFactor > 0 ? easeFactor * 2 : INITIAL_DIFFICULTY,
    reps: reviewCount,
    lapses: 0,
  };
}

export function calculateFSRS(state: FSRSState, rating: FSRSRating): FSRSResult {
  let { stability, difficulty, reps, lapses } = state;
  difficulty = clampDifficulty(difficulty);

  if (rating === 1) {
    lapses += 1;
    reps = 0;
    stability = 0;
    difficulty = clampDifficulty(difficulty + 1);
  } else {
    reps += 1;
    const difficultyDelta = rating === 2 ? 0.5 : rating === 3 ? -0.2 : -0.5;
    difficulty = clampDifficulty(difficulty + difficultyDelta);

    if (reps === 1) {
      stability = rating === 4 ? 4 : rating === 3 ? 1 : 0.5;
    } else if (reps === 2) {
      stability = rating === 4 ? 10 : rating === 3 ? 6 : 3;
    } else {
      const factor = rating === 4 ? 1.8 : rating === 3 ? 1.3 : 1.1;
      stability = Math.max(1, Math.round(stability * factor * (1 + (11 - difficulty) * 0.02)));
    }
  }

  const interval = rating === 1 ? 1 : Math.max(1, Math.round(stability));
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    stability,
    difficulty: Math.round(difficulty * 100) / 100,
    reps,
    lapses,
    interval,
    nextReview,
  };
}
