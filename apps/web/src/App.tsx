import type { RPCFunction } from "@supascan/core";
import { useEffect, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TabBar } from "./components/layout/TabBar";
import { DataGrid } from "./components/table/DataGrid";
import { Toolbar } from "./components/table/Toolbar";
import { RPCView } from "./components/rpc/RPCView";
import { TargetConfig } from "./components/TargetConfig";
import { useAnalysis } from "./hooks/useAnalysis";
import { usePagination } from "./hooks/usePagination";
import { useSupabase } from "./hooks/useSupabase";
import { useTableQuery } from "./hooks/useTableQuery";
import type { SupascanConfig, Tab } from "./types";
import { parseSupascanConfig } from "./utils/hash";

export function App() {
  const [config, setConfig] = useState<SupascanConfig | null>(null);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [headers, setHeaders] = useState<Record<string, string> | undefined>();

  const [selectedSchema, setSelectedSchema] = useState("public");
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeTableTab = activeTab?.type === "table" ? activeTab : null;

  const pagination = usePagination(100);
  const { state: queryState, execute: executeQuery } = useTableQuery(
    client,
    activeTableTab?.schema ?? "",
    activeTableTab?.table ?? "",
  );

  useEffect(() => {
    if (activeTableTab && client) {
      pagination.goToPage(1);
      pagination.setTotalCount(null);
      setSortColumn(null);
      setSortDir("asc");
      executeQuery({
        operation: "select",
        columns: "*",
        limit: 100,
        offset: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, client]);

  const runTableQuery = (
    page?: number,
    col?: string | null,
    dir?: "asc" | "desc",
  ) => {
    if (!activeTableTab || !client) return;
    const offset =
      page !== undefined
        ? (page - 1) * pagination.state.pageSize
        : pagination.offset;
    const orderBy = col !== undefined ? col : sortColumn;
    const orderDir = dir !== undefined ? dir : sortDir;
    executeQuery({
      operation: "select",
      columns: "*",
      limit: pagination.state.pageSize,
      offset,
      orderBy: orderBy ?? undefined,
      orderDir,
    }).then((result) => {
      if (result?.count !== undefined) {
        pagination.setTotalCount(result.count);
      }
    });
  };

  const handleSort = (column: string) => {
    let newDir: "asc" | "desc" = "asc";
    let newCol: string | null = column;
    if (sortColumn === column) {
      if (sortDir === "asc") newDir = "desc";
      else {
        newCol = null;
        newDir = "asc";
      }
    }
    setSortColumn(newCol);
    setSortDir(newDir);
    runTableQuery(1, newCol, newDir);
    pagination.goToPage(1);
  };

  const handlePageChange = (page: number) => {
    pagination.goToPage(page);
    runTableQuery(page);
  };

  const openTable = (schema: string, table: string) => {
    const id = `table:${schema}.${table}`;
    if (!tabs.some((t) => t.id === id)) {
      setTabs([...tabs, { type: "table", id, schema, table }]);
    }
    setActiveTabId(id);
  };

  const openRPC = (schema: string, rpc: RPCFunction) => {
    const id = `rpc:${schema}.${rpc.name}`;
    if (!tabs.some((t) => t.id === id)) {
      setTabs([...tabs, { type: "rpc", id, schema, rpc }]);
    }
    setActiveTabId(id);
  };

  const closeTab = (id: string) => {
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      const last = remaining[remaining.length - 1];
      setActiveTabId(last?.id ?? null);
    }
  };

  if (!config || !url || !key) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-studio-bg">
        <div className="w-full max-w-md">
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
      <div className="h-screen w-screen flex items-center justify-center bg-studio-bg">
        <div className="flex items-center gap-3 text-studio-text">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-studio-muted border-t-studio-accent" />
          <span className="font-mono text-sm">Analyzing database...</span>
        </div>
      </div>
    );
  }

  if (analysisState.status === "error") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-studio-bg">
        <div className="bg-studio-surface border border-studio-border rounded-lg p-6 max-w-md">
          <h2 className="text-studio-red font-semibold mb-2">
            Analysis Failed
          </h2>
          <p className="text-studio-muted text-sm font-mono mb-4">
            {analysisState.error.message}
          </p>
          <button
            onClick={() => runAnalysis()}
            className="px-3 py-1.5 bg-studio-accent text-black rounded text-sm font-medium hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (analysisState.status !== "success") return null;

  const analysis = analysisState.data;
  const schemaData = analysis.schemaDetails[selectedSchema];

  const tableData = queryState.status === "success" ? queryState.data.data : [];
  const isLoading = queryState.status === "loading";

  return (
    <div className="h-screen w-screen flex bg-studio-bg">
      <Sidebar
        analysis={analysis}
        selectedSchema={selectedSchema}
        onSchemaChange={setSelectedSchema}
        onTableSelect={openTable}
        onRPCSelect={openRPC}
        activeTabId={activeTabId}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={closeTab}
        />
        {activeTab ? (
          activeTab.type === "table" ? (
            <div className="flex-1 flex flex-col min-h-0">
              <Toolbar
                tableName={`${activeTab.schema}.${activeTab.table}`}
                rowCount={pagination.state.totalCount}
                isLoading={isLoading}
                onRefresh={() => runTableQuery()}
              />
              <DataGrid
                data={tableData}
                loading={isLoading}
                sortColumn={sortColumn}
                sortDir={sortDir}
                onSort={handleSort}
                pagination={{
                  page: pagination.state.page,
                  pageSize: pagination.state.pageSize,
                  totalCount: pagination.state.totalCount,
                  onPageChange: handlePageChange,
                  onPageSizeChange: (size) => {
                    pagination.setPageSize(size);
                    runTableQuery(1);
                  },
                }}
              />
            </div>
          ) : (
            <RPCView
              client={client}
              schema={activeTab.schema}
              rpc={activeTab.rpc}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-studio-muted">
            <span className="font-mono text-sm">Select a table or RPC</span>
          </div>
        )}
      </div>
    </div>
  );
}
