import { useEffect, useState } from "react";
import { SchemaBrowser } from "./components/SchemaBrowser";
import { TargetConfig } from "./components/TargetConfig";
import { TargetSummary } from "./components/TargetSummary";
import { useAnalysis } from "./hooks/useAnalysis";
import { useSupabase } from "./hooks/useSupabase";
import type { SupascanConfig } from "./types";
import { parseSupascanConfig } from "./utils/hash";

export function App() {
  const [config, setConfig] = useState<SupascanConfig | null>(null);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [headers, setHeaders] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    const parsed = parseSupascanConfig();
    if (parsed) {
      setConfig(parsed);
      setUrl(parsed.url);
      setKey(parsed.key);
      setHeaders(parsed.headers);
    }
  }, []);

  const client = useSupabase(url, key, headers);
  const { state: analysisState, execute: runAnalysis } = useAnalysis(
    client,
    url,
    key,
  );

  useEffect(() => {
    if (
      config?.autorun &&
      client &&
      url &&
      key &&
      analysisState.status === "idle"
    ) {
      runAnalysis();
    }
  }, [config?.autorun, client, url, key, analysisState.status, runAnalysis]);

  if (!config || !url || !key) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Supabase Security Scanner
            </h1>
            <p className="text-gray-600">
              Analyze your Supabase database for security vulnerabilities
            </p>
          </div>
          <TargetConfig
            onConfigured={(creds) => {
              setConfig(creds);
              setUrl(creds.url);
              setKey(creds.key);
              setHeaders(creds.headers);
            }}
          />
        </div>
      </div>
    );
  }

  if (analysisState.status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-supabase-green"></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Analyzing Database...
              </h2>
              <p className="text-sm text-gray-600 font-mono mt-1">{url}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (analysisState.status === "error") {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Analysis Failed
            </h2>
            <div className="p-4 bg-red-50 border border-red-200 rounded text-sm font-mono text-red-700">
              {analysisState.error.message}
            </div>
            <button
              onClick={() => runAnalysis()}
              className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (analysisState.status !== "success") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-h-screen px-4 py-4">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Supascan | Supabase Security Analysis
          </h1>
        </header>

        <TargetSummary analysis={analysisState.data} url={url} />
        <SchemaBrowser client={client} analysis={analysisState.data} />
      </div>
    </div>
  );
}
