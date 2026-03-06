import { useMemo } from 'react';

/**
 * Returns warning percent if kit weight exceeds threshold of body weight.
 * Caller provides totalWeightGrams, bodyWeightKg (e.g. first profile), and weightWarningPercent (from settings).
 */
export function useWeightWarning(
  totalWeightGrams: number,
  bodyWeightKg: number | null,
  weightWarningPercent: number
): { warningPercent: number | null } {
  const warningPercent = useMemo(() => {
    if (totalWeightGrams <= 0 || bodyWeightKg == null || bodyWeightKg <= 0)
      return null;
    const bodyGrams = bodyWeightKg * 1000;
    const pct = (totalWeightGrams / bodyGrams) * 100;
    return pct >= weightWarningPercent ? Math.round(pct) : null;
  }, [totalWeightGrams, bodyWeightKg, weightWarningPercent]);

  return { warningPercent };
}
