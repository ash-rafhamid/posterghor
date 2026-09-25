"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { LangProvider, type Lang } from "@/i18n";
import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";

export function Providers({ lang, children }: { lang: Lang; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // retry flaky networks / 5xx, never retry a definitive 4xx
            retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <LangProvider initial={lang}>
        <AuthProvider>
          {/* honour the OS "reduce motion" setting for every entrance / scroll animation */}
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
          <Toaster
            position="bottom-center"
            offset={20}
            toastOptions={{
              unstyled: false,
              style: {
                fontFamily: "var(--font-body)",
                border: "3px solid var(--color-ink)",
                borderRadius: "18px",
                background: "#fff",
                color: "var(--color-ink)",
                boxShadow: "0 18px 30px -16px rgba(6, 8, 70, 0.75)",
                fontWeight: 700,
              },
            }}
          />
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
