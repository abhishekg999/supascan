import type { Tab } from "../../types";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}: TabBarProps) {
  if (tabs.length === 0) {
    return (
      <div className="h-9 bg-studio-surface border-b border-studio-border flex items-center px-3">
        <span className="text-xs text-studio-muted font-mono">
          Table Editor
        </span>
      </div>
    );
  }

  return (
    <div className="h-9 bg-studio-surface border-b border-studio-border flex items-center overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const icon =
          tab.type === "table" ? (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          );

        const label =
          tab.type === "table"
            ? `${tab.schema}.${tab.table}`
            : `${tab.rpc.name}()`;

        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-2 px-3 h-full border-r border-studio-border cursor-pointer transition-colors ${
              isActive
                ? "bg-studio-bg text-studio-text"
                : "text-studio-muted hover:text-studio-text hover:bg-studio-hover"
            }`}
            onClick={() => onTabSelect(tab.id)}
          >
            {icon}
            <span className="text-xs font-mono whitespace-nowrap max-w-[140px] truncate">
              {label}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="p-0.5 rounded hover:bg-studio-active opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 3l6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
