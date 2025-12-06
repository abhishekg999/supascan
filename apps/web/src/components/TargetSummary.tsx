import type { AnalysisResult } from "@supascan/core";

interface TargetSummaryProps {
  analysis: AnalysisResult;
  url: string;
}

export function TargetSummary({ analysis, url }: TargetSummaryProps) {
  const { summary } = analysis;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <h2 className="text-lg font-bold text-gray-900 mb-3">Target Summary</h2>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <span className="font-semibold text-gray-700">Domain:</span>
          <span className="font-mono text-gray-900">{summary.domain}</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <span className="font-semibold text-gray-700">URL:</span>
          <span className="font-mono text-gray-600 text-xs break-all">
            {url}
          </span>
        </div>

        {summary.metadata?.service && (
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <span className="font-semibold text-gray-700">Service:</span>
            <span className="font-mono text-gray-900">
              {summary.metadata.service}
            </span>
          </div>
        )}

        {summary.metadata?.region && (
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <span className="font-semibold text-gray-700">Region:</span>
            <span className="font-mono text-gray-900">
              {summary.metadata.region}
            </span>
          </div>
        )}

        {summary.metadata?.version && (
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <span className="font-semibold text-gray-700">Version:</span>
            <span className="font-mono text-gray-900">
              {summary.metadata.version}
            </span>
          </div>
        )}

        {summary.jwtInfo && (
          <>
            <div className="border-t border-gray-200 my-2 pt-2">
              <span className="font-semibold text-gray-700 text-base">
                JWT Token Info
              </span>
            </div>
            {summary.jwtInfo.role && (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-semibold text-gray-700">Role:</span>
                <span className="font-mono text-gray-900">
                  {summary.jwtInfo.role}
                </span>
              </div>
            )}
            {summary.jwtInfo.iss && (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-semibold text-gray-700">Issuer:</span>
                <span className="font-mono text-gray-900 text-xs break-all">
                  {summary.jwtInfo.iss}
                </span>
              </div>
            )}
            {summary.jwtInfo.aud && (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-semibold text-gray-700">Audience:</span>
                <span className="font-mono text-gray-900">
                  {summary.jwtInfo.aud}
                </span>
              </div>
            )}
            {summary.jwtInfo.exp && (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-semibold text-gray-700">Expires:</span>
                <span className="font-mono text-gray-900">
                  {new Date(summary.jwtInfo.exp * 1000).toISOString()}
                </span>
              </div>
            )}
            {summary.jwtInfo.iat && (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="font-semibold text-gray-700">Issued:</span>
                <span className="font-mono text-gray-900">
                  {new Date(summary.jwtInfo.iat * 1000).toISOString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
