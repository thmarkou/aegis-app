import {
  DEFAULT_WATER_L_PER_PERSON_PER_DAY,
  DEFAULT_CALORIES_PER_PERSON_PER_DAY,
  DEFAULT_PLAN_DAYS,
} from '../../../shared/constants';

/**
 * Required water (L) and calories for N people for M days.
 */
export function getRequiredForPeopleAndDays(
  personCount: number,
  days: number = DEFAULT_PLAN_DAYS
): { waterLiters: number; calories: number } {
  const waterLiters = personCount * DEFAULT_WATER_L_PER_PERSON_PER_DAY * days;
  const calories = personCount * DEFAULT_CALORIES_PER_PERSON_PER_DAY * days;
  return { waterLiters, calories };
}
