import type { Credentials } from "../types";

declare global {
  interface Window {
    __CREDS__?: string;
  }
}

export function parseHashCredentials(): Credentials | null {
  if (typeof window === "undefined") return null;

  let encodedCreds = window.location.hash.slice(1);

  if (!encodedCreds && window.__CREDS__) {
    encodedCreds = window.__CREDS__;
  }

  if (!encodedCreds) return null;

  try {
    const decoded = atob(encodedCreds);
    const parsed = JSON.parse(decoded) as Credentials;

    if (parsed.url && parsed.key) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function encodeCredentials(credentials: Credentials): string {
  const json = JSON.stringify(credentials);
  return btoa(json);
}
