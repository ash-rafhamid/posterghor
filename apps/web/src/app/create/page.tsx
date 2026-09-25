import type { Metadata } from "next";
import { Suspense } from "react";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = { title: "Poster studio" };

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-24 text-center text-ink-3">Loading studio…</div>}>
      <Studio />
    </Suspense>
  );
}
