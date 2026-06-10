export interface SM2Result {
  interval: number;
  easeFactor: number;
  nextReview: Date;
  reviewCount: number;
}

export function calculateNextReview(
  quality: number,
  currentInterval: number,
  easeFactor: number,
  reviewCount: number
): SM2Result {
  const q = Math.max(0, Math.min(5, quality));
  let newEase = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEase < 1.3) newEase = 1.3;

  let newInterval: number;
  let newReviewCount: number;

  if (q < 3) {
    newInterval = 1;
    newReviewCount = 0;
  } else if (reviewCount === 0) {
    newInterval = 1;
    newReviewCount = 1;
  } else if (reviewCount === 1) {
    newInterval = 6;
    newReviewCount = 2;
  } else {
    newInterval = Math.round(currentInterval * newEase);
    newReviewCount = reviewCount + 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: Math.round(newEase * 100) / 100,
    nextReview,
    reviewCount: newReviewCount,
  };
}
