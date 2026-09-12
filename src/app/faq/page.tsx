"use client";

import { Card, Chip, Eyebrow, Field } from "@/components/ui";
import { FAQS, FAQ_CATEGORIES, searchFaq, type FaqCategory } from "@/lib/faq";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "All">("All");
  const [open, setOpen] = useState<string | null>(FAQS[0]?.id ?? null);

  const rows = useMemo(() => searchFaq(query, category), [query, category]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Eyebrow>Product desk</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">FAQ — how Pact works.</h1>
        <p className="mt-3 max-w-2xl text-mute">
          App how-tos only: scan, privacy, library, cart. Training and diet questions belong in{" "}
          <Link href="/coach" className="text-acid">
            Pact Coach
          </Link>
          , which sits on a separate built-in Q&amp;A corpus.
        </p>
      </div>

      <Field
        placeholder="Search FAQ — scan, privacy, library…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Chip active={category === "All"} onClick={() => setCategory("All")}>
          All · {FAQS.length}
        </Chip>
        {FAQ_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-mute">
            Nothing in FAQ for “{query}”. If this is about sets, food, or recovery, ask{" "}
            <Link href="/coach" className="text-acid">
              the coach
            </Link>
            .
          </p>
          <button type="button" className="mt-2 text-sm text-acid" onClick={() => setQuery("")}>
            Clear search
          </button>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {rows.map((item) => {
            const expanded = open === item.id;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-white/3"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : item.id)}
                >
                  <span>
                    <span className="block font-medium">{item.q}</span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-mute">{item.category}</span>
                  </span>
                  <span className="font-mono text-xs text-mute">{expanded ? "–" : "+"}</span>
                </button>
                {expanded ? <p className="px-5 pb-5 text-sm text-mute">{item.a}</p> : null}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
