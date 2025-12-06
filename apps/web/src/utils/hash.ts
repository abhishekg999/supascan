import type { SupascanConfig } from "../types";

declare global {
  interface Window {
    __SUPASCAN_CONFIG__?: string;
  }
}

export function parseSupascanConfig(): SupascanConfig | null {
  if (typeof window === "undefined") return null;

  const encoded = window.__SUPASCAN_CONFIG__;
  if (!encoded) return null;

  try {
    const decoded = atob(encoded);
    const parsed = JSON.parse(decoded) as SupascanConfig;

    if (parsed.url && parsed.key) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
