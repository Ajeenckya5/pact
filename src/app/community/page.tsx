"use client";

import { Button, Card, Eyebrow, Field } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { usePact } from "@/lib/store";
import { Heart, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

export default function CommunityPage() {
  const store = usePact();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [comment, setComment] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = store.posts.filter((p) => !store.blocked.includes(p.authorId));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Eyebrow>Circle</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Community, with a lock on it.</h1>
        <p className="mt-3 text-mute">
          Posts inherit your privacy defaults. Sleep and calories stay off the feed unless you raise the level. Photos you attach are friends-only by default.
        </p>
      </div>

      <Card className="p-4">
        <Field
          placeholder="Share a session, a plate, a question…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="mt-3 max-h-48 w-full rounded-2xl object-cover" />
        ) : null}
        <div className="mt-3 flex items-center justify-between">
          <button className="text-mute" onClick={() => fileRef.current?.click()} aria-label="Attach photo">
            <ImagePlus className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPhoto(URL.createObjectURL(file));
            }}
          />
          <Button
            disabled={!text.trim()}
            onClick={() => {
              store.addPost(text.trim(), photo);
              setText("");
              setPhoto(undefined);
            }}
          >
            Post to {store.privacy.photoDefault}
          </Button>
        </div>
      </Card>

      {visible.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <p className="font-medium">{p.author}</p>
              <p className="text-xs text-mute">
                @{p.handle} · {timeAgo(p.at)}
              </p>
            </div>
            {p.stats ? (
              <p className="font-mono text-xs text-mute">
                {p.stats.recovery != null ? `R ${p.stats.recovery}  ` : ""}
                {p.stats.strain != null ? `S ${p.stats.strain}` : ""}
                {p.stats.workout ? `  · ${p.stats.workout}` : ""}
              </p>
            ) : null}
          </div>
          <p className="px-5 py-3">{p.text}</p>
          {p.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo} alt="" className="max-h-[420px] w-full object-cover" />
          ) : null}
          <div className="flex items-center gap-4 px-5 py-3">
            <button
              className={`inline-flex items-center gap-2 text-sm ${p.liked ? "text-heat" : "text-mute"}`}
              onClick={() => store.toggleLike(p.id)}
            >
              <Heart className={`h-4 w-4 ${p.liked ? "fill-heat" : ""}`} />
              {p.likes}
            </button>
          </div>
          <div className="space-y-2 border-t border-line px-5 py-3">
            {p.comments.map((c) => (
              <p key={c.id} className="text-sm">
                <span className="text-mute">{c.author} · </span>
                {c.text}
              </p>
            ))}
            <div className="flex gap-2">
              <Field
                placeholder="Comment"
                value={comment[p.id] ?? ""}
                onChange={(e) => setComment((s) => ({ ...s, [p.id]: e.target.value }))}
              />
              <Button
                tone="ghost"
                onClick={() => {
                  const t = comment[p.id]?.trim();
                  if (!t) return;
                  store.addComment(p.id, t);
                  setComment((s) => ({ ...s, [p.id]: "" }));
                }}
              >
                Reply
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
