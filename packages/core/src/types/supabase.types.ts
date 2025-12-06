import type { Event } from "./event.types";

export type TableAccessStatus = "denied" | "readable" | "empty";

export type TableAccessResult = {
  status: TableAccessStatus;
  accessible: boolean;
  hasData: boolean;
  rowCount?: number;
};

export type RPCParameter = {
  name: string;
  type: string;
  format?: string;
  required: boolean;
  description?: string;
};

export type RPCFunction = {
  name: string;
  parameters: RPCParameter[];
};

export type SupabaseSwagger = {
  swagger: string;
  paths: Record<string, unknown>;
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  [key: string]: unknown;
};

export interface SchemasFetchStartedEvent
  extends Event<"schemas_fetch_started", Record<string, never>> {
  type: "schemas_fetch_started";
  data: Record<string, never>;
}

export interface SchemasDiscoveredEvent
  extends Event<"schemas_discovered", { schemas: string[] }> {
  type: "schemas_discovered";
  data: { schemas: string[] };
}

export interface SwaggerFetchStartedEvent
  extends Event<"swagger_fetch_started", { schema: string }> {
  type: "swagger_fetch_started";
  data: { schema: string };
}

export interface SwaggerFetchedEvent
  extends Event<"swagger_fetched", { schema: string }> {
  type: "swagger_fetched";
  data: { schema: string };
}

export interface TablesDiscoveredEvent
  extends Event<"tables_discovered", { schema: string; tables: string[] }> {
  type: "tables_discovered";
  data: { schema: string; tables: string[] };
}

export interface RPCsDiscoveredEvent
  extends Event<"rpcs_discovered", { schema: string; rpcs: string[] }> {
  type: "rpcs_discovered";
  data: { schema: string; rpcs: string[] };
}

export interface TableAccessTestStartedEvent
  extends Event<
    "table_access_test_started",
    { schema: string; table: string }
  > {
  type: "table_access_test_started";
  data: { schema: string; table: string };
}

export interface TableAccessTestCompletedEvent
  extends Event<
    "table_access_test_completed",
    { schema: string; table: string; result: TableAccessResult }
  > {
  type: "table_access_test_completed";
  data: { schema: string; table: string; result: TableAccessResult };
}

export type SupabaseEvent =
  | SchemasFetchStartedEvent
  | SchemasDiscoveredEvent
  | SwaggerFetchStartedEvent
  | SwaggerFetchedEvent
  | TablesDiscoveredEvent
  | RPCsDiscoveredEvent
  | TableAccessTestStartedEvent
  | TableAccessTestCompletedEvent;
