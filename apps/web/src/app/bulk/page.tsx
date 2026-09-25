import type { Metadata } from "next";
import { Suspense } from "react";
import { BulkStudio } from "@/components/bulk/BulkStudio";

export const metadata: Metadata = { title: "Bulk posters" };

export default function BulkPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-24 text-center text-ink-3">Loading…</div>}>
      <BulkStudio />
    </Suspense>
  );
}
