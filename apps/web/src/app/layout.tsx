import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "@fontsource/baloo-da-2/500.css";
import "@fontsource/baloo-da-2/700.css";
import "@fontsource/baloo-da-2/800.css";
import "@fontsource/galada/400.css";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Providers } from "@/components/providers";
import type { Lang } from "@/i18n";

// Absolute base for social-card URLs: explicit override → Vercel's production domain → local dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Posterghor: print-ready Bangla posters", template: "%s · Posterghor" },
  description:
    "Make print-ready political, tribute, greeting and festival posters in minutes. Real Bangla typesetting, Gemini art direction, 2400×3200 PNG / JPG / PDF export.",
  applicationName: "Posterghor",
  openGraph: {
    title: "Posterghor: print-ready Bangla posters",
    description: "Real Bangla type, art-directed by AI, ready for the press.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Posterghor: print-ready Bangla posters" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#2a35d6",
  width: "device-width",
  initialScale: 1,
};

async function detectLang(): Promise<Lang> {
  const saved = (await cookies()).get("pg_lang")?.value;
  if (saved === "bn" || saved === "en") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return /(^|,)\s*bn\b/i.test(accept) ? "bn" : "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await detectLang();
  return (
    <html lang={lang}>
      <body>
        <Providers lang={lang}>
          <Navbar />
          <main id="main" className="min-h-[70dvh]">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
