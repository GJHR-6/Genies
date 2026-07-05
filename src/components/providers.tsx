"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: {
            // Internet inestable en tiendas: reintentar con backoff y
            // pausar cuando no hay conexión (networkMode "online").
            networkMode: "online",
            retry: 5,
            retryDelay: (intento) => Math.min(1000 * 2 ** intento, 30_000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
