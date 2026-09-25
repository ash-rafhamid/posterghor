import type { Metadata } from "next";
import { PosterView } from "@/components/poster/PosterView";

export const metadata: Metadata = { title: "Your poster" };

export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PosterView id={id} />;
}
