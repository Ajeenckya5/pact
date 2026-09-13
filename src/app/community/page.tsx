"use client";

import { ClipResult, ClipScanButton } from "@/components/ClipScan";
import { Button, Card, Eyebrow, Field } from "@/components/ui";
import type { AppPhotoScan } from "@/lib/app-vision";
import { timeAgo } from "@/lib/format";
import { usePact } from "@/lib/store";
import { Heart } from "lucide-react";
import { useState } from "react";

export default function CommunityPage() {
  const store = usePact();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [clip, setClip] = useState<AppPhotoScan | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});

  const visible = store.posts.filter((p) => !store.blocked.includes(p.authorId));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Eyebrow>Circle</Eyebrow>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Community, with a lock on it.</h1>
        <p className="mt-3 text-mute">
          Posts inherit your privacy defaults. Sleep and calories stay off the feed unless you raise the level. Photos
          you attach are identified on-device with CLIP (LAION-2B) and stay friends-only by default.
        </p>
      </div>

      <Card className="p-4">
        <Field
          placeholder="Share a session, a plate, a question…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {clip && photo ? <div className="mt-3"><ClipResult scan={clip} preview={photo} /></div> : photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="mt-3 max-h-48 w-full rounded-2xl object-cover" />
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2">
          <ClipScanButton
            label="Scan & attach"
            onScan={(scan, _file, preview) => {
              setPhoto(preview);
              setClip(scan);
              if (!text.trim()) setText(scan.caption);
            }}
          />
          <Button
            disabled={!text.trim()}
            onClick={() => {
              store.addPost(text.trim(), photo);
              setText("");
              setPhoto(undefined);
              setClip(null);
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
