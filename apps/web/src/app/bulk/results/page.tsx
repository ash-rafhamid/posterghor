import type { Metadata } from "next";
import { BulkResults } from "@/components/bulk/BulkResults";

export const metadata: Metadata = { title: "Batch results" };

export default function BulkResultsPage() {
  return <BulkResults />;
}
