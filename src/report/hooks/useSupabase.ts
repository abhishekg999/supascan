import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const clientCache = new Map<string, SupabaseClient>();

export function useSupabase(
  url: string,
  apiKey: string,
  headers?: Record<string, string>,
) {
  const [client, setClient] = useState<SupabaseClient | null>(() => {
    const cacheKey = `${url}:${apiKey}:${JSON.stringify(headers || {})}`;
    const cached = clientCache.get(cacheKey);
    if (cached) return cached;

    const clientOptions = headers ? { global: { headers } } : undefined;
    const newClient = createClient(url, apiKey, clientOptions);
    clientCache.set(cacheKey, newClient);
    return newClient;
  });

  useEffect(() => {
    const cacheKey = `${url}:${apiKey}:${JSON.stringify(headers || {})}`;
    const cached = clientCache.get(cacheKey);

    if (cached && cached !== client) {
      setClient(cached);
    }
  }, [url, apiKey, headers, client]);

  return client;
}
