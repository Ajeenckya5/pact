export function personalToday(input: {
  call: "recover" | "easy" | "train" | "push";
  hour: number;
  waterMl: number;
  waterGoal: number;
  proteinLeft: number;
  boxesOpen: number;
  empty: boolean;
}) {
  const waterLeft = Math.max(0, Math.round(input.waterGoal - input.waterMl));
  const callLine =
    input.call === "recover"
      ? "Today's call is recover."
      : input.call === "push"
        ? "Today's call is push."
        : input.call === "easy"
          ? "Today's call is easy."
          : "Today's call is train.";
  const protein = input.proteinLeft > 0 ? `${input.proteinLeft}g protein still open.` : "Protein is in.";
  if (input.boxesOpen === 0) {
    return { headline: "All four boxes are in.", detail: `${callLine} ${protein}` };
  }
  if (waterLeft > 0 && input.hour < 20) {
    return {
      headline: `${waterLeft.toLocaleString("en-US")} ml to go before 20:00`,
      detail: input.empty ? `Today is empty until you log it. ${callLine}` : `${callLine} ${protein}`,
    };
  }
  if (waterLeft > 0) {
    return { headline: "Water is still open tonight.", detail: `${callLine} ${protein}` };
  }
  return {
    headline: input.empty ? "Today is empty until you log it." : "Keep the open boxes moving.",
    detail: `${callLine} ${protein}`,
  };
}

export function celebrationMode(reducedMotion: boolean, momentsOn: boolean) {
  if (!momentsOn) return "off" as const;
  return reducedMotion ? ("quiet" as const) : ("full" as const);
}
