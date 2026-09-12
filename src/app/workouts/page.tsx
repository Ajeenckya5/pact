import { WorkoutDesk } from "@/components/WorkoutDesk";
import { Suspense } from "react";

export default function WorkoutsPage() {
  return (
    <Suspense fallback={<p className="text-mute">Loading desk…</p>}>
      <WorkoutDesk />
    </Suspense>
  );
}
