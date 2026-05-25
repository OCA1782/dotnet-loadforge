"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, type ReactNode } from "react";
import { getQueryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth";

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
