import { useState } from "react";
import type { JWTInfo, SummaryMetadata } from "../../core/analyzer.types";

export function TargetSummary({
  domain,
  url,
  apiKey,
  metadata,
  jwtInfo,
}: {
  domain: string;
  url: string;
  apiKey: string;
  metadata?: SummaryMetadata;
  jwtInfo?: JWTInfo;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 mb-3 fade-in">
      <h2 className="text-xs font-semibold text-gray-900 mb-1.5 flex items-center">
        <svg
          className="w-3 h-3 mr-0.5 text-supabase-green"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"
            clipRule="evenodd"
          ></path>
        </svg>
        Target Summary
      </h2>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 text-xs">
        <div>
          <label className="text-xs font-medium text-gray-500">Domain</label>
          <p className="text-xs font-semibold text-gray-900 font-mono">
            {domain}
          </p>
        </div>
        {metadata && (
          <>
            {metadata.service && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Service
                </label>
                <p className="text-xs font-semibold text-gray-900 font-mono">
                  {metadata.service}
                </p>
              </div>
            )}
            {metadata.region && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Project ID
                </label>
                <p className="text-xs font-semibold text-gray-900 font-mono">
                  {metadata.region}
                </p>
              </div>
            )}
            {metadata.title && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Title
                </label>
                <p className="text-xs font-semibold text-gray-900 font-mono">
                  {metadata.title}
                </p>
              </div>
            )}
            {metadata.version && (
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Version
                </label>
                <p className="text-xs font-semibold text-gray-900 font-mono">
                  {metadata.version}
                </p>
              </div>
            )}
          </>
        )}
        {jwtInfo && (
          <div>
            <label className="text-xs font-medium text-gray-500">
              JWT Info
            </label>
            <div className="text-xs text-gray-900 font-mono">
              {jwtInfo.role && <div>Role: {jwtInfo.role}</div>}
              {jwtInfo.exp && (
                <div>
                  Expires: {new Date(jwtInfo.exp * 1000).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}
        <APICredentials url={url} keyValue={apiKey} />
      </div>
    </section>
  );
}

function APICredentials({ url, keyValue }: { url: string; keyValue: string }) {
  const [showFullKey, setShowFullKey] = useState(false);

  return (
    <div>
      <label className="text-xs font-medium text-gray-500">
        API Credentials
      </label>
      <div className="text-xs text-gray-900 font-mono">
        <div className="truncate" title={url}>
          URL: {url}
        </div>
        <div className="flex items-center gap-1">
          <span className="flex-1 min-w-0">
            Key:{" "}
            <span className="break-all">
              {showFullKey ? keyValue : `${keyValue.substring(0, 20)}...`}
            </span>
          </span>
          <button
            className="px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors whitespace-nowrap flex-shrink-0"
            onClick={() => setShowFullKey(!showFullKey)}
          >
            {showFullKey ? "Hide Key" : "Show Full Key"}
          </button>
        </div>
      </div>
    </div>
  );
}
