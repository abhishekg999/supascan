import pc from "picocolors";
import type { CoreEvent } from "../../core/events.types";
import type { CLIContext } from "../context";

export function handleEvent(ctx: CLIContext, event: CoreEvent): void {
  if (!ctx.debug) {
    return;
  }

  switch (event.type) {
    case "schemas_fetch_started":
      console.error(pc.gray("[DEBUG] Fetching schemas..."));
      break;
    case "schemas_discovered":
      console.error(
        pc.gray(`[DEBUG] Found ${event.data.schemas.length} schemas`),
      );
      break;
    case "swagger_fetch_started":
      console.error(
        pc.gray(`[DEBUG] Fetching swagger for schema: ${event.data.schema}`),
      );
      break;
    case "tables_discovered":
      console.error(
        pc.gray(
          `[DEBUG] Found ${event.data.tables.length} tables in ${event.data.schema}`,
        ),
      );
      break;
    case "rpcs_discovered":
      console.error(
        pc.gray(
          `[DEBUG] Found ${event.data.rpcs.length} RPCs in ${event.data.schema}`,
        ),
      );
      break;
    case "table_access_test_started":
      console.error(
        pc.gray(
          `[DEBUG] Testing read access for ${event.data.schema}.${event.data.table}`,
        ),
      );
      break;
    case "table_access_test_completed":
      const status =
        event.data.result.status === "readable"
          ? `readable with ~${event.data.result.rowCount ?? "?"} rows (EXPOSED)`
          : event.data.result.status === "empty"
            ? "returned 0 rows (empty or RLS blocked)"
            : "access denied";
      console.error(pc.gray(`[DEBUG] Table ${event.data.table} is ${status}`));
      break;
    case "analysis_started":
      console.error(pc.gray("[DEBUG] Analysis started"));
      break;
    case "schema_analysis_started":
      console.error(pc.gray(`[DEBUG] Analyzing schema: ${event.data.schema}`));
      break;
    case "schema_analysis_completed":
      console.error(
        pc.gray(`[DEBUG] Completed analysis of schema: ${event.data.schema}`),
      );
      break;
    case "extraction_started":
      console.error(
        pc.gray(`[DEBUG] Fetching content from: ${event.data.url}`),
      );
      break;
    case "content_fetched":
      console.error(
        pc.gray(
          `[DEBUG] Fetched ${event.data.size} bytes (${event.data.contentType})`,
        ),
      );
      break;
    case "html_detected":
      console.error(
        pc.gray(
          `[DEBUG] Detected HTML content, found ${event.data.scriptCount} scripts`,
        ),
      );
      break;
    case "script_checking":
      console.error(
        pc.gray(`[DEBUG] Checking script: ${event.data.scriptUrl}`),
      );
      break;
    case "credentials_found":
      console.error(
        pc.gray(`[DEBUG] Found credentials in ${event.data.source}`),
      );
      break;
  }
}
