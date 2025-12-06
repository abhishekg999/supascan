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
    if (!url || !key) {
      alert("Please provide both URL and API key");
      return;
    }

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

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Configure Target</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supabase URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key (anon key)
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Headers (optional)
          </label>
          <div className="space-y-2">
            {Object.entries(headers).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-600">
                  {k}: {v}
                </span>
                <button
                  onClick={() => handleRemoveHeader(k)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                placeholder="Header-Name"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
              <input
                type="text"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                placeholder="value"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
              <button
                onClick={handleAddHeader}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={!url || !key || !client}
          className="w-full px-4 py-2 bg-supabase-green text-white rounded-md font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Connect
        </button>
      </div>
    </div>
  );
}
