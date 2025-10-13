export function Header({
  domain,
  schemaCount,
}: {
  domain: string;
  schemaCount: number;
}) {
  const handleSaveReport = async () => {
    try {
      const filename = `supabase-analysis-${domain}-${new Date().toISOString().split("T")[0]}.html`;
      const htmlContent = document.documentElement.outerHTML;

      if ("showSaveFilePicker" in window) {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "HTML files",
              accept: {
                "text/html": [".html"],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(htmlContent);
        await writable.close();
      } else {
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Error saving report:", error);
    }
  };

  return (
    <header className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3 fade-in">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900 mb-0.5 font-mono">
            {domain}
          </h1>
          <p className="text-slate-600 font-mono text-xs">
            Generated on {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-mono">
              Schemas Analyzed
            </div>
            <div className="text-lg font-bold text-emerald-600 font-mono">
              {schemaCount}
            </div>
          </div>
          <button
            onClick={handleSaveReport}
            className="px-2 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors font-mono text-xs flex items-center gap-1.5"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            Save Report
          </button>
        </div>
      </div>
    </header>
  );
}
