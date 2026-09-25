import type { Metadata } from "next";
import { TemplatesView } from "@/components/templates/TemplatesView";

export const metadata: Metadata = { title: "Template library" };

export default function TemplatesPage() {
  return <TemplatesView />;
}
