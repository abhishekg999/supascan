import type { SupabaseClient } from "@supabase/supabase-js";
import type { Result } from "./types/result.types";
import { err, ok } from "./types/result.types";
import type {
  RPCFunction,
  RPCParameter,
  SupabaseEvent,
  SupabaseSwagger,
  TableAccessResult,
} from "./types/supabase.types";

async function getSwagger(
  client: SupabaseClient,
  schema: string,
): Promise<Result<SupabaseSwagger>> {
  const { supabaseUrl, supabaseKey } = client as unknown as {
    supabaseUrl: string;
    supabaseKey: string;
  };
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseKey,
      Accept: "application/openapi+json",
      "Accept-Profile": schema,
    },
  });

  if (!res.ok) {
    return err(new Error(`Failed to fetch swagger: ${res.status}`));
  }

  return ok((await res.json()) as SupabaseSwagger);
}

export async function* getTables(
  client: SupabaseClient,
  schema: string,
): AsyncGenerator<SupabaseEvent, Result<string[]>> {
  yield { type: "swagger_fetch_started", data: { schema } };

  const swaggerResult = await getSwagger(client, schema);

  if (!swaggerResult.success) {
    return err(swaggerResult.error);
  }

  yield { type: "swagger_fetched", data: { schema } };

  const tables = Object.keys(swaggerResult.value.paths)
    .filter((key) => !key.startsWith("/rpc/"))
    .map((key) => key.slice(1))
    .filter((key) => !!key);

  yield { type: "tables_discovered", data: { schema, tables } };
  return ok(tables);
}

export async function* getRPCs(
  client: SupabaseClient,
  schema: string,
): AsyncGenerator<SupabaseEvent, Result<string[]>> {
  yield { type: "swagger_fetch_started", data: { schema } };

  const swaggerResult = await getSwagger(client, schema);

  if (!swaggerResult.success) {
    return err(swaggerResult.error);
  }

  yield { type: "swagger_fetched", data: { schema } };

  const rpcs = Object.keys(swaggerResult.value.paths)
    .filter((key) => key.startsWith("/rpc/"))
    .map((key) => key.slice(1));

  yield { type: "rpcs_discovered", data: { schema, rpcs } };
  return ok(rpcs);
}

export async function getRPCsWithParameters(
  client: SupabaseClient,
  schema: string,
): Promise<Result<RPCFunction[]>> {
  const swaggerResult = await getSwagger(client, schema);

  if (!swaggerResult.success) {
    return err(swaggerResult.error);
  }

  const rpcFunctions: RPCFunction[] = [];

  Object.entries(swaggerResult.value.paths).forEach(
    ([path, methods]: [string, any]) => {
      if (path.startsWith("/rpc/")) {
        const rpcName = path.slice(1);

        const postMethod = methods.post;
        if (postMethod && postMethod.parameters) {
          const parameters: RPCParameter[] = [];

          postMethod.parameters.forEach((param: any) => {
            if (
              param.in === "body" &&
              param.schema &&
              param.schema.properties
            ) {
              const requiredParams = param.schema.required || [];

              Object.entries(param.schema.properties).forEach(
                ([paramName, paramDef]: [string, any]) => {
                  parameters.push({
                    name: paramName,
                    type: paramDef.type || "unknown",
                    format: paramDef.format,
                    required: requiredParams.includes(paramName),
                    description: paramDef.description,
                  });
                },
              );
            }
          });

          rpcFunctions.push({
            name: rpcName,
            parameters,
          });
        }
      }
    },
  );

  return ok(rpcFunctions);
}

export async function callRPC(
  client: SupabaseClient,
  schema: string,
  rpcName: string,
  args: Record<string, any> = {},
  options: {
    get?: boolean;
    explain?: boolean;
    limit?: number;
  } = {
    get: false,
    explain: false,
  },
): Promise<Result<any>> {
  try {
    let query = client.schema(schema).rpc(rpcName, args);

    if (options.limit && !options.explain) {
      query = query.limit(options.limit);
    }

    const { data, error } = options.explain
      ? await query.explain({
          analyze: true,
          format: "text",
          verbose: true,
          settings: true,
          wal: true,
          buffers: true,
        })
      : await query;

    if (error) {
      return err(new Error(`RPC call failed: ${error.message}`));
    }
    return ok(data);
  } catch (error) {
    return err(
      new Error(
        `RPC call exception: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

export async function* testTableRead(
  client: SupabaseClient,
  schema: string,
  table: string,
): AsyncGenerator<SupabaseEvent, Result<TableAccessResult>> {
  yield { type: "table_access_test_started", data: { schema, table } };

  const { data, error } = await client
    .schema(schema)
    .from(table)
    .select("*")
    .limit(1);

  if (error) {
    const result = {
      status: "denied" as const,
      accessible: false,
      hasData: false,
    };
    yield {
      type: "table_access_test_completed",
      data: { schema, table, result },
    };
    return ok(result);
  }

  const hasData = data && data.length > 0;

  if (hasData) {
    const { count } = await client
      .schema(schema)
      .from(table)
      .select("*", { count: "estimated", head: true });

    const result = {
      status: "readable" as const,
      accessible: true,
      hasData: true,
      rowCount: count ?? undefined,
    };
    yield {
      type: "table_access_test_completed",
      data: { schema, table, result },
    };
    return ok(result);
  }

  const result = {
    status: "empty" as const,
    accessible: true,
    hasData: false,
    rowCount: 0,
  };
  yield {
    type: "table_access_test_completed",
    data: { schema, table, result },
  };
  return ok(result);
}

export async function* testTablesRead(
  client: SupabaseClient,
  schema: string,
  tables: string[],
): AsyncGenerator<SupabaseEvent, Result<Record<string, TableAccessResult>>> {
  const accessMap: Record<string, TableAccessResult> = {};

  for (const table of tables) {
    const gen = testTableRead(client, schema, table);
    let result: TableAccessResult = {
      status: "denied",
      accessible: false,
      hasData: false,
    };

    while (true) {
      const next = await gen.next();
      if (next.done) {
        if (next.value && next.value.success) {
          result = next.value.value;
        }
        break;
      }
      yield next.value;
    }

    accessMap[table] = result;
  }

  return ok(accessMap);
}

export async function dumpTable(
  client: SupabaseClient,
  schema: string,
  table: string,
  limit = 10,
): Promise<
  Result<{
    columns: string[];
    rows: Record<string, unknown>[];
    count: number;
  }>
> {
  const { data, error, count } = await client
    .schema(schema)
    .from(table)
    .select("*", { count: "exact" })
    .limit(limit);

  if (error) {
    return err(error);
  }

  const columns = data && data.length > 0 ? Object.keys(data[0] ?? {}) : [];

  return ok({
    columns,
    rows: data ?? [],
    count: count ?? 0,
  });
}
