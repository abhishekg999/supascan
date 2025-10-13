import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const clientCache = new Map<string, SupabaseClient>();

export function useSupabase(url: string, apiKey: string) {
  const [client, setClient] = useState<SupabaseClient | null>(() => {
    const cacheKey = `${url}:${apiKey}`;
    const cached = clientCache.get(cacheKey);
    if (cached) return cached;

    const newClient = createClient(url, apiKey);
    clientCache.set(cacheKey, newClient);
    return newClient;
  });

  useEffect(() => {
    const cacheKey = `${url}:${apiKey}`;
    const cached = clientCache.get(cacheKey);

    if (cached && cached !== client) {
      setClient(cached);
    }
  }, [url, apiKey, client]);

  return client;
}
