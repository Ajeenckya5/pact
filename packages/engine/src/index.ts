/** Readiness call shared by the web app and the phone app. */

export type Call = "recover" | "easy" | "train" | "push";

export type HealthMetric =
  | "steps"
  | "heartRate"
  | "hrv"
  | "restingHeartRate"
  | "activeEnergy"
  | "bodyMass"
  | "sleep"
  | "workouts";

/** Where a phone metric comes from. Shown next to the number. */
export type HealthSource = "apple-health" | "health-connect" | "bluetooth" | "log" | "none";

export const HEALTH_TO_ENGINE: Record<
  HealthMetric,
  { ios: string; android: string; feeds: string }
> = {
  steps: { ios: "HKQuantityTypeIdentifierStepCount", android: "StepsRecord", feeds: "move" },
  heartRate: { ios: "HKQuantityTypeIdentifierHeartRate", android: "HeartRateRecord", feeds: "strain" },
  hrv: { ios: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN", android: "HeartRateVariabilityRmssdRecord", feeds: "recovery" },
  restingHeartRate: { ios: "HKQuantityTypeIdentifierRestingHeartRate", android: "RestingHeartRateRecord", feeds: "recovery" },
  activeEnergy: { ios: "HKQuantityTypeIdentifierActiveEnergyBurned", android: "ActiveCaloriesBurnedRecord", feeds: "strain" },
  bodyMass: { ios: "HKQuantityTypeIdentifierBodyMass", android: "WeightRecord", feeds: "trend" },
  sleep: { ios: "HKCategoryTypeIdentifierSleepAnalysis", android: "SleepSessionRecord", feeds: "sleep" },
  workouts: { ios: "HKWorkoutType", android: "ExerciseSessionRecord", feeds: "train" },
};

export function dailyCall(input: {
  sick?: boolean;
  measured?: boolean;
  recovery?: number | null;
  strain?: number | null;
  sleepScore?: number | null;
}): { call: Call; reason: string } {
  if (input.sick) {
    return { call: "recover", reason: "Sick days stay at recover." };
  }
  if (input.measured === false || input.recovery == null || input.strain == null || input.sleepScore == null) {
    return {
      call: "train",
      reason: "No wearable scores yet. Today's pick uses your training log and weather.",
    };
  }
  const { recovery, strain, sleepScore } = input;
  if (recovery < 34 || sleepScore < 58 || strain >= 18) {
    return { call: "recover", reason: "Recovery, sleep, or strain says take it easy." };
  }
  if (recovery < 50 || strain >= 14) {
    return { call: "easy", reason: "Keep the session easy." };
  }
  if (recovery >= 67 && strain < 10 && sleepScore >= 75) {
    return { call: "push", reason: "Scores support a harder session." };
  }
  return { call: "train", reason: "A normal training day." };
}

/** Recovery-age stays hidden until two weeks of real nights. */
export function recoveryAgeReady(nightsLogged: number) {
  return nightsLogged >= 14;
}
