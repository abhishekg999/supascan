import { useState } from "react";
import { useSupabase } from "../hooks/useSupabase";
import type { SupascanConfig } from "../types";

interface TargetConfigProps {
  onConfigured: (config: SupascanConfig) => void;
}

export function TargetConfig({ onConfigured }: TargetConfigProps) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");

  const client = useSupabase(
    url,
    key,
    Object.keys(headers).length > 0 ? headers : undefined,
  );

  const handleConnect = () => {
    if (!url || !key) return;

    onConfigured({
      url,
      key,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      autorun: false,
    });
  };

  const handleAddHeader = () => {
    if (headerKey && headerValue) {
      setHeaders({ ...headers, [headerKey]: headerValue });
      setHeaderKey("");
      setHeaderValue("");
    }
  };

  const handleRemoveHeader = (k: string) => {
    const { [k]: _, ...rest } = headers;
    setHeaders(rest);
  };

  return (
    <div className="bg-studio-surface border border-studio-border rounded-lg p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-studio-text">
          Connect to Supabase
        </h2>
        <p className="text-xs text-studio-muted mt-1">
          Enter your project URL and API key to begin
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-studio-muted mb-1.5">
            Project URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2 text-sm text-studio-text font-mono placeholder-studio-muted focus:outline-none focus:border-studio-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-studio-muted mb-1.5">
            API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full bg-studio-bg border border-studio-border rounded px-3 py-2 text-sm text-studio-text font-mono placeholder-studio-muted focus:outline-none focus:border-studio-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-studio-muted mb-1.5">
            Custom Headers
          </label>
          {Object.entries(headers).length > 0 && (
            <div className="space-y-1 mb-2">
              {Object.entries(headers).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between bg-studio-bg border border-studio-border rounded px-2 py-1"
                >
                  <span className="text-xs font-mono text-studio-text">
                    {k}: {v}
                  </span>
                  <button
                    onClick={() => handleRemoveHeader(k)}
                    className="text-studio-red text-xs hover:underline"
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={headerKey}
              onChange={(e) => setHeaderKey(e.target.value)}
              placeholder="Header-Name"
              className="flex-1 bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-studio-text font-mono placeholder-studio-muted focus:outline-none focus:border-studio-accent"
            />
            <input
              type="text"
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              placeholder="value"
              className="flex-1 bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-studio-text font-mono placeholder-studio-muted focus:outline-none focus:border-studio-accent"
            />
            <button
              onClick={handleAddHeader}
              className="px-3 py-1.5 bg-studio-hover border border-studio-border rounded text-xs text-studio-text hover:bg-studio-active transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={!url || !key || !client}
          className="w-full px-4 py-2.5 bg-studio-accent text-black rounded font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Connect
        </button>
      </div>
    </div>
  );
}
