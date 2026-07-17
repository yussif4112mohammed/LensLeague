/**
 * Elo Rating System Math Engine
 * Calculates points adjustment for head-to-head match outcomes.
 * 
 * @param {number} ratingA Current rating of Photo A
 * @param {number} ratingB Current rating of Photo B
 * @param {number} outcomeA Outcome for A: 1 = Win, 0 = Loss, 0.5 = Draw
 * @param {number} k K-factor (defaults to 32)
 * @returns {object} { ratingA: number, ratingB: number, changeA: number, changeB: number }
 */
export function calculateElo(ratingA, ratingB, outcomeA, k = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const outcomeB = 1 - outcomeA;

  const changeA = Math.round(k * (outcomeA - expectedA));
  const changeB = Math.round(k * (outcomeB - expectedB));

  return {
    newRatingA: ratingA + changeA,
    newRatingB: ratingB + changeB,
    changeA: changeA >= 0 ? `+${changeA}` : `${changeA}`,
    changeB: changeB >= 0 ? `+${changeB}` : `${changeB}`,
    rawChangeA: changeA,
    rawChangeB: changeB
  };
}
