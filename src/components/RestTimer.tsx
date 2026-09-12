"use client";

import { Button, Card, Eyebrow } from "@/components/ui";
import { clockRest, restSeconds, tap } from "@/lib/experience";
import { useEffect, useState } from "react";

export function RestTimer({ rest }: { rest?: string }) {
  const total = restSeconds(rest);
  const [left, setLeft] = useState(total);
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!run || left <= 0) return;
    const id = window.setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          window.setTimeout(() => {
            setRun(false);
            tap(40);
          }, 0);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [run, left]);

  return (
    <Card className="p-5">
      <Eyebrow>Rest timer</Eyebrow>
      <p className="mt-3 font-mono text-4xl">{clockRest(left)}</p>
      <p className="mt-1 text-xs text-mute">{rest ?? "90s default"} · between sets</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => setRun((v) => !v)}>{run ? "Pause" : left === 0 ? "Restart" : "Start rest"}</Button>
        <Button
          tone="ghost"
          onClick={() => {
            setRun(false);
            setLeft(total);
          }}
        >
          Reset
        </Button>
      </div>
    </Card>
  );
}
