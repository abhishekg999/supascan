import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const clientCache = new Map<string, SupabaseClient>();

export function useSupabase(
  url: string,
  apiKey: string,
  headers?: Record<string, string>,
): SupabaseClient | null {
  const [client, setClient] = useState<SupabaseClient | null>(() => {
    if (!url || !apiKey) return null;

    const cacheKey = `${url}:${apiKey}:${JSON.stringify(headers || {})}`;
    const cached = clientCache.get(cacheKey);
    if (cached) return cached;

    const clientOptions = headers ? { global: { headers } } : undefined;
    const newClient = createClient(url, apiKey, clientOptions);
    clientCache.set(cacheKey, newClient);
    return newClient;
  });

  useEffect(() => {
    if (!url || !apiKey) {
      setClient(null);
      return;
    }

    const cacheKey = `${url}:${apiKey}:${JSON.stringify(headers || {})}`;
    const cached = clientCache.get(cacheKey);

    if (cached) {
      if (cached !== client) {
        setClient(cached);
      }
    } else {
      const clientOptions = headers ? { global: { headers } } : undefined;
      const newClient = createClient(url, apiKey, clientOptions);
      clientCache.set(cacheKey, newClient);
      setClient(newClient);
    }
  }, [url, apiKey, headers, client]);

  return client;
}
