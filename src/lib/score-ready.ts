/** A pact score needs a log. The move baseline alone is not data. */
export function hasPactData(input: {
  demo?: boolean;
  meals: { length: number };
  waterMl: number;
  workoutLogs?: { length: number };
  checkins: { sleep: boolean; fuel: boolean; water: boolean; move: boolean };
  history?: { length: number };
}) {
  if (input.demo) return true;
  if (input.meals.length > 0) return true;
  if (input.waterMl > 0) return true;
  if ((input.workoutLogs?.length ?? 0) > 0) return true;
  if (input.checkins.sleep || input.checkins.fuel || input.checkins.water || input.checkins.move) return true;
  if ((input.history?.length ?? 0) > 0) return true;
  return false;
}
