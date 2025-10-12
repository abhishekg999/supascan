import type { AnalysisResult } from "./analyzer.service";

function ClientScript({
  url,
  key,
  domain,
}: {
  url: string;
  key: string;
  domain: string;
}) {
  return (
    <>
      {`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = '${url}';
const SUPABASE_KEY = '${key}';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

window.supabase = supabase;
window.currentSchema = '';
window.currentTable = '';

function toggleApiKey() {
    const display = document.getElementById('api-key-display');
    const button = document.getElementById('api-key-toggle');
    if (display && button) {
        if (display.textContent.includes('...')) {
            display.textContent = '${key}';
            button.textContent = 'Hide Key';
        } else {
            display.textContent = '${key.substring(0, 20)}...';
            button.textContent = 'Show Full Key';
        }
    }
}

            function toggleQueryInterface(schema, table) {
                window.currentSchema = schema;
                window.currentTable = table;
                const interfaceId = \`query-interface-\${schema}-\${table}\`;
                const interfaceEl = document.getElementById(interfaceId);
                if (interfaceEl) {
                    interfaceEl.classList.toggle('hidden');
                }
            }
            
            function toggleRPCInterface(uniqueId) {
                const interfaceId = \`rpc-interface-\${uniqueId}\`;
                const interfaceEl = document.getElementById(interfaceId);
                if (interfaceEl) {
                    interfaceEl.classList.toggle('hidden');
                }
            }

async function saveReport() {
    try {
        // Generate filename with timestamp and domain
        const domain = '${domain}';
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = \`supabase-analysis-\${domain}-\${timestamp}.html\`;
        
        // Get the current HTML content
        const htmlContent = document.documentElement.outerHTML;
        
        // Check if File System Access API is supported
        if ('showSaveFilePicker' in window) {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'HTML files',
                    accept: {
                        'text/html': ['.html']
                    }
                }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(htmlContent);
            await writable.close();
            
            // Show success message
            showNotification('Report saved successfully!', 'success');
        } else {
            // Fallback for browsers that don't support File System Access API
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Report downloaded successfully!', 'success');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            // User cancelled the save dialog
            return;
        }
        console.error('Error saving report:', error);
        showNotification('Failed to save report: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = \`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 font-mono text-sm transition-all duration-300 transform translate-x-full\`;
    
    if (type === 'success') {
        notification.className += ' bg-emerald-100 text-emerald-800 border border-emerald-200';
    } else if (type === 'error') {
        notification.className += ' bg-red-100 text-red-800 border border-red-200';
    } else {
        notification.className += ' bg-blue-100 text-blue-800 border border-blue-200';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderSmartTable(data) {
    console.log('renderSmartTable called with data:', data);
    
    if (!data || data.length === 0) {
        console.log('No data to render');
        return '<div class="p-8 text-center text-gray-400 text-sm font-mono">No data</div>';
    }
    
    const columns = Object.keys(data[0]);
    const maxRows = Math.min(data.length, 100);
    
    console.log(\`Rendering table with \${columns.length} columns and \${maxRows} rows\`);
    
    let html = \`
        <div class="overflow-x-auto scrollbar-thin">
            <table class="w-full text-xs font-mono">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        \${columns.map(col => \`<th class="px-3 py-2 text-left font-semibold text-slate-700 border-r border-slate-200">\${escapeHtml(col)}</th>\`).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
    \`;
    
    for (let i = 0; i < maxRows; i++) {
        const row = data[i];
        html += \`
            <tr class="hover:bg-slate-50">
                \${columns.map(col => {
                    const value = row[col];
                    let displayValue;
                    let titleValue;
                    
                    if (value === null) {
                        displayValue = '<span class="text-gray-400 italic">null</span>';
                        titleValue = 'null';
                    } else if (value === undefined) {
                        displayValue = '<span class="text-gray-400 italic">undefined</span>';
                        titleValue = 'undefined';
                    } else if (typeof value === 'object') {
                        const jsonStr = JSON.stringify(value);
                        displayValue = \`<span class="text-blue-600">\${escapeHtml(jsonStr)}</span>\`;
                        titleValue = jsonStr;
                    } else {
                        const escapedValue = escapeHtml(String(value));
                        displayValue = escapedValue;
                        titleValue = String(value);
                    }
                    
                    return \`<td class="px-3 py-2 border-r border-slate-200 max-w-xs truncate" title="\${escapeHtml(titleValue)}">\${displayValue}</td>\`;
                }).join('')}
            </tr>
        \`;
    }
    
    html += \`
                </tbody>
            </table>
                </div>
    \`;
    
    if (data.length > maxRows) {
        html += \`<div class="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-200 font-mono">Showing \${maxRows} of \${data.length} rows</div>\`;
    }
    
    console.log('Table HTML generated successfully');
    return html;
}

function executeQuery(uniqueId) {
    const operation = document.getElementById(\`query-operation-\${uniqueId}\`).value;
    const resultsDiv = document.getElementById(\`query-results-\${uniqueId}\`);
    
    // Better loading feedback
    resultsDiv.innerHTML = \`
        <div class="p-8 text-center">
            <div class="inline-flex items-center gap-3 text-slate-600 font-mono text-sm">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>
                Executing query...
            </div>
        </div>
    \`;
    
    let query;
    const table = supabase.schema(window.currentSchema).from(window.currentTable);
    
    try {
        switch(operation) {
            case 'select':
                const columns = document.getElementById(\`select-columns-\${uniqueId}\`).value || '*';
                const limitValue = document.getElementById(\`select-limit-\${uniqueId}\`).value;
                const order = document.getElementById(\`select-order-\${uniqueId}\`).value;
                
                query = table.select(columns);
                if (limitValue && limitValue.trim() !== '') {
                    const limitNum = parseInt(limitValue);
                    if (!isNaN(limitNum) && limitNum > 0) {
                        query = query.limit(limitNum);
                    }
                }
                if (order && order.trim() !== '') {
                    const [col, dir] = order.trim().split(' ');
                    if (col) {
                        query = query.order(col, { ascending: dir !== 'desc' });
                    }
                }
                break;
                
            case 'insert':
                const insertData = JSON.parse(document.getElementById(\`insert-data-\${uniqueId}\`).value);
                query = table.insert(insertData);
                break;
                
            case 'update':
                const updateData = JSON.parse(document.getElementById(\`update-data-\${uniqueId}\`).value);
                const updateFilter = document.getElementById(\`update-filter-\${uniqueId}\`).value;
                query = table.update(updateData);
                if (updateFilter) {
                    const parts = updateFilter.split(' ');
                    if (parts.length >= 3) {
                        const [col, op, val] = parts;
                        if (op === '=' && val) query = query.eq(col, val.replace(/['"]/g, ''));
                    }
                }
                break;
                
            case 'delete':
                const deleteFilter = document.getElementById(\`delete-filter-\${uniqueId}\`).value;
                query = table.delete();
                if (deleteFilter) {
                    const parts = deleteFilter.split(' ');
                    if (parts.length >= 3) {
                        const [col, op, val] = parts;
                        if (op === '=' && val) query = query.eq(col, val.replace(/['"]/g, ''));
                    }
                }
                break;
        }
        
        query.then(({ data, error }) => {
            console.log('Query result:', { data, error });
            
            if (error) {
                console.error('Query error:', error);
                resultsDiv.innerHTML = \`<div class="p-4 text-red-600 text-sm font-mono bg-red-50 border border-red-200 rounded">Error: \${error.message}</div>\`;
            } else {
                console.log('Query successful, data length:', data ? data.length : 0);
                if (data && data.length > 0) {
                    console.log('Calling renderSmartTable with data:', data);
                    resultsDiv.innerHTML = renderSmartTable(data);
                } else {
                    console.log('No data returned');
                    resultsDiv.innerHTML = '<div class="p-8 text-center text-gray-400 text-sm font-mono">No data returned</div>';
                }
            }
        }).catch((err) => {
            console.error('Query execution error:', err);
            resultsDiv.innerHTML = \`<div class="p-4 text-red-600 text-sm font-mono bg-red-50 border border-red-200 rounded">Execution error: \${err.message}</div>\`;
        });
        
                } catch (err) {
                    resultsDiv.innerHTML = \`<div class="text-red-600">Error: \${err.message}</div>\`;
                }
            }
            
            function executeRPC(rpcName, uniqueId, schema) {
                const resultsDiv = document.getElementById(\`rpc-results-\${uniqueId}\`);
                
                // Loading feedback
                resultsDiv.innerHTML = \`
                    <div class="p-8 text-center">
                        <div class="inline-flex items-center gap-3 text-slate-600 font-mono text-sm">
                            <div class="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>
                            Executing RPC...
                        </div>
                    </div>
                \`;
                
                try {
                    // Collect parameters from form inputs
                    const params = {};
                    const paramInputs = document.querySelectorAll(\`[id^="rpc-param-"][id$="-\${uniqueId}"]\`);
                    
                    paramInputs.forEach(input => {
                        const paramName = input.id.replace(\`rpc-param-\`, '').replace(\`-\${uniqueId}\`, '');
                        const value = input.value.trim();
                        
                        if (value !== '') {
                            // Try to parse as JSON for complex types, otherwise use as string
                            try {
                                params[paramName] = JSON.parse(value);
                            } catch {
                                // If JSON parsing fails, use the raw value
                                params[paramName] = value;
                            }
                        }
                    });
                    
                    console.log('Executing RPC:', rpcName, 'in schema:', schema, 'with params:', params);
                    
                    const cleanRpcName = rpcName.startsWith('rpc/') ? rpcName.slice(4) : rpcName;
                    console.log('Clean RPC name:', cleanRpcName);
                    
                    const rpcCall = supabase.schema(schema).rpc(cleanRpcName, params);
                    
                    rpcCall.then(({ data, error }) => {
                        console.log('RPC result:', { data, error });
                        
                        if (error) {
                            console.error('RPC error:', error);
                            resultsDiv.innerHTML = \`<div class="p-4 text-red-600 text-sm font-mono bg-red-50 border border-red-200 rounded">Error: \${error.message}</div>\`;
                        } else {
                            console.log('RPC successful, data:', data);
                            if (data !== null && data !== undefined) {
                                if (Array.isArray(data)) {
                                    // If it's an array, render as table
                                    if (data.length > 0) {
                                        resultsDiv.innerHTML = renderSmartTable(data);
                                    } else {
                                        resultsDiv.innerHTML = '<div class="p-8 text-center text-gray-400 text-sm font-mono">RPC returned empty array</div>';
                                    }
                                } else {
                                    // If it's a single value, display it nicely
                                    resultsDiv.innerHTML = \`
                                        <div class="p-6">
                                            <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                                <div class="text-xs font-medium text-slate-600 font-mono mb-2">RPC Result:</div>
                                                <div class="text-sm font-mono text-slate-900 break-all">\${escapeHtml(JSON.stringify(data, null, 2))}</div>
                                            </div>
                                        </div>
                                    \`;
                                }
                            } else {
                                resultsDiv.innerHTML = '<div class="p-8 text-center text-gray-400 text-sm font-mono">RPC executed successfully (no return value)</div>';
                            }
                        }
                    }).catch((err) => {
                        console.error('RPC execution error:', err);
                        resultsDiv.innerHTML = \`<div class="p-4 text-red-600 text-sm font-mono bg-red-50 border border-red-200 rounded">Execution error: \${err.message}</div>\`;
                    });
                    
                } catch (err) {
                    resultsDiv.innerHTML = \`<div class="text-red-600">Error: \${err.message}</div>\`;
                }
            }
            
            // Show/hide query type sections
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to all operation selects
    document.querySelectorAll('[id^="query-operation-"]').forEach(select => {
        select.addEventListener('change', function() {
            const uniqueId = this.id.replace('query-operation-', '');
            // Hide all query types for this specific interface
            document.querySelectorAll(\`[id$="-\${uniqueId}"].query-type\`).forEach(el => el.classList.add('hidden'));
            // Show the selected query type
            const targetId = this.value + '-query-' + uniqueId;
            const target = document.getElementById(targetId);
            if (target) target.classList.remove('hidden');
                });
            });
        });

            window.toggleApiKey = toggleApiKey;
            window.toggleQueryInterface = toggleQueryInterface;
            window.toggleRPCInterface = toggleRPCInterface;
            window.executeQuery = executeQuery;
            window.executeRPC = executeRPC;
            window.saveReport = saveReport;`}
    </>
  );
}

function TargetSummary({
  domain,
  url,
  key,
  metadata,
  jwtInfo,
}: {
  domain: string;
  url: string;
  key: string;
  metadata?: any;
  jwtInfo?: any;
}) {
  return (
    <section class="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 fade-in">
      <h2 class="text-sm font-semibold text-gray-900 mb-2 flex items-center">
        <svg
          class="w-3 h-3 mr-1 text-supabase-green"
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
      <div class="grid grid-cols-1 xl:grid-cols-4 gap-3">
        <div>
          <label class="text-xs font-medium text-gray-500">Domain</label>
          <p class="text-xs font-semibold text-gray-900 font-mono">{domain}</p>
        </div>
        {MetadataDisplay({ metadata })}
        {JWTInfoDisplay({ jwtInfo })}
        {APICredentialsDisplay({ url, key })}
      </div>
    </section>
  );
}

function MetadataDisplay({ metadata }: { metadata?: any }) {
  if (!metadata) return "";

  const metadataItems = [];
  if (metadata.service)
    metadataItems.push({ label: "Service", value: metadata.service });
  if (metadata.region)
    metadataItems.push({ label: "Project ID", value: metadata.region });
  if (metadata.title)
    metadataItems.push({ label: "Title", value: metadata.title });
  if (metadata.version)
    metadataItems.push({ label: "Version", value: metadata.version });

  return (
    <>
      {metadataItems.map((item) => (
        <div>
          <label class="text-xs font-medium text-gray-500">{item.label}</label>
          <p class="text-xs font-semibold text-gray-900 font-mono">
            {item.value}
          </p>
        </div>
      ))}
    </>
  );
}

function JWTInfoDisplay({ jwtInfo }: { jwtInfo?: any }) {
  if (!jwtInfo) return "";

  return (
    <div>
      <label class="text-xs font-medium text-gray-500">JWT Info</label>
      <div class="text-xs text-gray-900 font-mono">
        {jwtInfo.role && <div>Role: {jwtInfo.role}</div>}
        {jwtInfo.exp && (
          <div>
            Expires: {new Date(jwtInfo.exp * 1000).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

function APICredentialsDisplay({ url, key }: { url: string; key: string }) {
  return (
    <div>
      <label class="text-xs font-medium text-gray-500">API Credentials</label>
      <div class="text-xs text-gray-900 font-mono">
        <div class="truncate" title={url}>
          URL: {url}
        </div>
        <div class="flex items-center gap-1">
          <span>
            Key: <span id="api-key-display">{key.substring(0, 20)}...</span>
          </span>
          <button
            id="api-key-toggle"
            class="px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            onclick="toggleApiKey()"
          >
            Show Full Key
          </button>
        </div>
      </div>
    </div>
  );
}

function SchemaSection({
  schema,
  analysis,
}: {
  schema: string;
  analysis: any;
}) {
  const exposedCount = Object.values(analysis.tableAccess).filter(
    (a: any) => a.status === "readable",
  ).length;
  const deniedCount = Object.values(analysis.tableAccess).filter(
    (a: any) => a.status === "denied",
  ).length;
  const emptyCount = Object.values(analysis.tableAccess).filter(
    (a: any) => a.status === "empty",
  ).length;

  return (
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-900">Schema: {schema}</h2>
        <div class="flex items-center gap-3 text-xs text-gray-600">
          <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {analysis.tables.length} Tables
          </span>
          <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {analysis.rpcs.length} RPCs
          </span>
          <span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
            {exposedCount} exposed | {emptyCount} empty | {deniedCount} denied
          </span>
        </div>
      </div>

      <div class="space-y-6">
        {TablesSection({
          tables: analysis.tables,
          tableAccess: analysis.tableAccess,
          schema,
        })}
        {RPCFunctionsSection({ rpcFunctions: analysis.rpcFunctions, schema })}
      </div>
    </div>
  );
}

function TablesSection({
  tables,
  tableAccess,
  schema,
}: {
  tables: string[];
  tableAccess: Record<string, any>;
  schema: string;
}) {
  return (
    <div>
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg
          class="w-5 h-5 mr-2 text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"
            clipRule="evenodd"
          ></path>
        </svg>
        Tables ({tables.length})
      </h3>
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {tables.length > 0 ? (
          <div class="divide-y divide-gray-200">
            {tables.map((table) =>
              TableRow({
                table,
                access: tableAccess[table],
                schema,
              }),
            )}
          </div>
        ) : (
          <div class="p-8 text-center text-gray-500">No tables found</div>
        )}
      </div>
    </div>
  );
}

function TableRow({
  table,
  access,
  schema,
}: {
  table: string;
  access: any;
  schema: string;
}) {
  let statusClass = "";
  let statusText = "";
  let statusIcon = "";

  switch (access?.status) {
    case "readable":
      statusClass = "bg-green-100 text-green-800 border-green-200";
      statusText = `~${access.rowCount ?? "?"} rows exposed`;
      statusIcon = "[+]";
      break;
    case "empty":
      statusClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
      statusText = "0 rows - empty or RLS";
      statusIcon = "[-]";
      break;
    case "denied":
      statusClass = "bg-red-100 text-red-800 border-red-200";
      statusText = "Access denied";
      statusIcon = "[X]";
      break;
  }

  return (
    <>
      <div class="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div class="flex items-center">
          <span class="text-lg mr-3">{statusIcon}</span>
          <span class="font-medium text-gray-900 font-mono">{table}</span>
        </div>
        <div class="flex items-center gap-3">
          <span
            class={`px-3 py-1 text-xs font-medium rounded-full border ${statusClass}`}
          >
            {statusText}
          </span>
          <button
            class="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors font-mono"
            onclick={`toggleQueryInterface('${schema}', '${table}')`}
          >
            Query
          </button>
        </div>
      </div>
      <div
        id={`query-interface-${schema}-${table}`}
        class="hidden border-t border-gray-200 bg-slate-50"
      >
        <InlineQueryInterface schema={schema} table={table} />
      </div>
    </>
  );
}

function RPCFunctionsSection({
  rpcFunctions,
  schema,
}: {
  rpcFunctions: any[];
  schema: string;
}) {
  return (
    <div>
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg
          class="w-5 h-5 mr-2 text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          ></path>
        </svg>
        RPC Functions ({rpcFunctions.length})
      </h3>
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {rpcFunctions.length > 0 ? (
          <div class="divide-y divide-gray-200">
            {rpcFunctions.map((rpc) => RPCFunctionCard({ rpc, schema }))}
          </div>
        ) : (
          <div class="p-8 text-center text-gray-500">
            No RPC functions found
          </div>
        )}
      </div>
    </div>
  );
}

function RPCFunctionCard({ rpc, schema }: { rpc: any; schema: string }) {
  const uniqueId = `rpc-${rpc.name}`;
  return (
    <div class="p-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-medium text-gray-900 font-mono">{rpc.name}</h4>
        <button
          class="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors font-mono"
          onclick={`toggleRPCInterface('${uniqueId}')`}
        >
          Execute
        </button>
      </div>
      <div class="text-xs text-gray-600 font-mono">
        {rpc.parameters.length > 0 ? (
          <>
            {rpc.parameters.length} parameter
            {rpc.parameters.length !== 1 ? "s" : ""}
            {rpc.parameters.filter((p: any) => p.required).length > 0 && (
              <span class="text-red-600 ml-1">
                ({rpc.parameters.filter((p: any) => p.required).length}{" "}
                required)
              </span>
            )}
          </>
        ) : (
          "No parameters"
        )}
      </div>

      <div
        id={`rpc-interface-${uniqueId}`}
        class="hidden border-t border-gray-200 bg-slate-50 mt-4"
      >
        <RPCInterface rpc={rpc} uniqueId={uniqueId} schema={schema} />
      </div>
    </div>
  );
}

function RPCInterface({
  rpc,
  uniqueId,
  schema,
}: {
  rpc: any;
  uniqueId: string;
  schema: string;
}) {
  return (
    <div class="p-4">
      <div class="mb-3">
        <h4 class="text-xs font-semibold text-gray-800 font-mono mb-2">
          RPC Interface: {schema}.{rpc.name}
        </h4>
        <div class="space-y-4">
          <div>
            <RPCParameterBuilder
              rpc={rpc}
              uniqueId={uniqueId}
              schema={schema}
            />
          </div>
          <div>
            <RPCResultsDisplay uniqueId={uniqueId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RPCParameterBuilder({
  rpc,
  uniqueId,
  schema,
}: {
  rpc: any;
  uniqueId: string;
  schema: string;
}) {
  return (
    <div class="space-y-3">
      <div class="text-xs font-medium text-gray-600 font-mono mb-2">
        Parameters
      </div>

      {rpc.parameters.length > 0 ? (
        <div class="space-y-3">
          {rpc.parameters.map((param: any) => (
            <div key={param.name}>
              <label class="block text-xs font-medium text-gray-600 mb-1 font-mono">
                {param.name} ({param.type})
                {param.required && <span class="text-red-500 ml-1">*</span>}
              </label>
              {param.type === "string" || param.type === "text" ? (
                <input
                  type="text"
                  id={`rpc-param-${param.name}-${uniqueId}`}
                  placeholder={param.description || `Enter ${param.name}`}
                  class="w-full p-2 border border-gray-300 rounded text-xs font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              ) : param.type === "number" || param.type === "integer" ? (
                <input
                  type="number"
                  id={`rpc-param-${param.name}-${uniqueId}`}
                  placeholder={param.description || `Enter ${param.name}`}
                  class="w-full p-2 border border-gray-300 rounded text-xs font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              ) : param.type === "boolean" ? (
                <select
                  id={`rpc-param-${param.name}-${uniqueId}`}
                  class="w-full p-2 border border-gray-300 rounded text-xs font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="">Select...</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <textarea
                  id={`rpc-param-${param.name}-${uniqueId}`}
                  rows="3"
                  placeholder={
                    param.description || `Enter ${param.name} (${param.type})`
                  }
                  class="w-full p-2 border border-gray-300 rounded text-xs font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              )}
              {param.description && (
                <div class="text-xs text-gray-500 mt-1 font-mono">
                  {param.description}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div class="text-xs text-gray-500 font-mono">
          No parameters required
        </div>
      )}

      <div class="flex items-center gap-3">
        <button
          class="px-4 py-2 bg-slate-700 text-white rounded text-xs font-mono hover:bg-slate-800 transition-colors"
          onclick={`executeRPC('${rpc.name}', '${uniqueId}', '${schema}')`}
        >
          Execute RPC
        </button>
        <div class="text-xs text-gray-500 font-mono">
          Schema:{" "}
          <span id={`rpc-schema-${uniqueId}`} class="font-semibold">
            {schema}
          </span>
        </div>
      </div>
    </div>
  );
}

function RPCResultsDisplay({ uniqueId }: { uniqueId: string }) {
  return (
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div class="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h5 class="text-xs font-semibold text-gray-700 font-mono">Results</h5>
      </div>
      <div class="relative">
        <div
          id={`rpc-results-${uniqueId}`}
          class="min-h-[300px] max-h-[500px] overflow-auto"
        >
          <div class="p-6 text-center text-gray-400 text-sm font-mono">
            RPC results will appear here...
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineQueryInterface({
  schema,
  table,
}: {
  schema: string;
  table: string;
}) {
  const uniqueId = `${schema}-${table}`;
  return (
    <div class="p-4">
      <div class="mb-3">
        <h4 class="text-xs font-semibold text-gray-800 font-mono mb-2">
          Query Interface: {schema}.{table}
        </h4>
        <div class="space-y-4">
          <div>
            <ModernQueryBuilder uniqueId={uniqueId} />
          </div>
          <div>
            <SmartResultsDisplay uniqueId={uniqueId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModernQueryBuilder({ uniqueId }: { uniqueId: string }) {
  return (
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
          Operation
        </label>
        <select
          id={`query-operation-${uniqueId}`}
          class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
        >
          <option value="select">SELECT</option>
          <option value="insert">INSERT</option>
          <option value="update">UPDATE</option>
          <option value="delete">DELETE</option>
        </select>
      </div>

      <div id={`select-query-${uniqueId}`} class="query-type">
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
            Columns
          </label>
          <input
            type="text"
            id={`select-columns-${uniqueId}`}
            placeholder="* or column1, column2, ..."
            class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
            Limit
          </label>
          <input
            type="number"
            id={`select-limit-${uniqueId}`}
            value="10"
            placeholder="10"
            class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
            Order By
          </label>
          <input
            type="text"
            id={`select-order-${uniqueId}`}
            placeholder="column_name asc/desc"
            class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
      </div>

      <div id={`insert-query-${uniqueId}`} class="query-type hidden">
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
            Data (JSON)
          </label>
          <textarea
            id={`insert-data-${uniqueId}`}
            rows="4"
            placeholder='{"column1": "value1", "column2": "value2"}'
            class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          ></textarea>
        </div>
      </div>

      <div id={`update-query-${uniqueId}`} class="query-type hidden">
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
            Data (JSON)
          </label>
          <textarea
            id={`update-data-${uniqueId}`}
            rows="4"
            placeholder='{"column1": "new_value"}'
            class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          ></textarea>
        </div>
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
            Filter
          </label>
          <input
            type="text"
            id={`update-filter-${uniqueId}`}
            placeholder="column = 'value'"
            class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
      </div>

      <div id={`delete-query-${uniqueId}`} class="query-type hidden">
        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-2 font-mono">
            Filter
          </label>
          <input
            type="text"
            id={`delete-filter-${uniqueId}`}
            placeholder="column = 'value'"
            class="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>
      </div>

      <button
        class="w-full bg-slate-700 text-white py-2 px-4 rounded text-sm font-mono hover:bg-slate-800 transition-colors"
        onclick={`executeQuery('${uniqueId}')`}
      >
        Execute Query
      </button>
    </div>
  );
}

function SmartResultsDisplay({ uniqueId }: { uniqueId: string }) {
  return (
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div class="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h5 class="text-xs font-semibold text-gray-700 font-mono">Results</h5>
      </div>
      <div class="relative">
        <div
          id={`query-results-${uniqueId}`}
          class="min-h-[400px] max-h-[600px] overflow-auto"
        >
          <div class="p-6 text-center text-gray-400 text-sm font-mono">
            Results will appear here...
          </div>
        </div>
      </div>
    </div>
  );
}

export abstract class HtmlRendererService {
  public static generateHtmlReport(
    result: AnalysisResult,
    url: string,
    key: string,
  ) {
    return (
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Supabase Database Analysis Report</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script type="module">
            {ClientScript({ url, key, domain: result.summary.domain })}
          </script>
          <script>
            {`
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            'supabase-green': '#3ECF8E',
                            'supabase-dark': '#1F2937'
                        }
                    }
                }
            }
            `}
          </script>
          <style>
            {`
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
            }
            
            .font-mono {
                font-family: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            }
            
            .fade-in { 
                animation: fadeIn 0.6s ease-out; 
            }
            
            @keyframes fadeIn { 
                from { 
                    opacity: 0; 
                    transform: translateY(20px); 
                } 
                to { 
                    opacity: 1; 
                    transform: translateY(0); 
                } 
            }
            
            .scrollbar-thin {
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 #f1f5f9;
            }
            
            .scrollbar-thin::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            
            .scrollbar-thin::-webkit-scrollbar-track {
                background: #f1f5f9;
            }
            
            .scrollbar-thin::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }
            
            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            `}
          </style>
        </head>
        <body class="bg-slate-50 min-h-screen scrollbar-thin m-0 p-0">
          <div class="w-full min-h-screen px-6 py-6">
            {/* Header */}
            <header class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 fade-in">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h1 class="text-2xl font-bold text-slate-900 mb-1 font-mono">
                    Supabase Database Analysis
                  </h1>
                  <p class="text-slate-600 font-mono text-sm">
                    Generated on {new Date().toLocaleString()}
                  </p>
                </div>
                <div class="flex items-center gap-8">
                  <div class="text-right">
                    <div class="text-xs text-slate-500 font-mono">
                      Schemas Analyzed
                    </div>
                    <div class="text-xl font-bold text-emerald-600 font-mono">
                      {result.schemas.length}
                    </div>
                  </div>
                  <button
                    onclick="saveReport()"
                    class="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm flex items-center gap-2"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                      ></path>
                    </svg>
                    Save Report
                  </button>
                </div>
              </div>
            </header>

            {/* Target Summary */}
            {TargetSummary({
              domain: result.summary.domain,
              url,
              key,
              metadata: result.summary.metadata,
              jwtInfo: result.summary.jwtInfo,
            })}

            {/* Database Analysis */}
            <section class="space-y-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg
                  class="w-6 h-6 mr-3 text-supabase-green"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Database Analysis
              </h2>
              {Object.entries(result.schemaDetails).map(([schema, analysis]) =>
                SchemaSection({ schema, analysis }),
              )}
            </section>

            {/* Footer */}
            <footer class="mt-12 text-center text-slate-500 text-sm font-mono">
              <p>Generated by supascan - Security analysis tool for Supabase</p>
            </footer>
          </div>
        </body>
      </html>
    ) as string;
  }
}
