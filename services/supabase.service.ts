import type { SupabaseClient } from "@supabase/supabase-js";
import { type Result, err, log, ok } from "../utils";

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

export type TableAccessStatus = "denied" | "readable" | "empty";

export type TableAccessResult = {
  status: TableAccessStatus;
  accessible: boolean;
  hasData: boolean;
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

export abstract class SupabaseService {
  public static async getSchemas(
    client: SupabaseClient,
    debug = false,
    nonexistantSchema = "NONEXISTANT_SCHEMA_THAT_SHOULDNT_EXIST",
  ): Promise<Result<string[]>> {
    if (debug) log.debug("Fetching schemas...");

    const { data, error } = await client
      .schema(nonexistantSchema)
      .from("")
      .select();

    if (data) {
      return err(new Error("Schema exists, this shouldn't happen"));
    }

    const schemas =
      error?.message
        .split("following: ")[1]
        ?.split(",")
        .map((schema) => schema.trim()) ?? [];

    if (debug) log.debug(`Found ${schemas.length} schemas`);
    return ok(schemas);
  }

  public static async getSwagger(
    client: SupabaseClient,
    schema: string,
    debug = false,
  ): Promise<Result<SupabaseSwagger>> {
    if (debug) log.debug(`Fetching swagger for schema: ${schema}`);

    const { data, error } = await client.schema(schema).from("").select();

    if (error) {
      return err(error);
    }

    return ok(data as unknown as SupabaseSwagger);
  }

  public static async getTables(
    client: SupabaseClient,
    schema: string,
    debug = false,
  ): Promise<Result<string[]>> {
    if (debug) log.debug(`Fetching tables for schema: ${schema}`);

    const swaggerResult = await this.getSwagger(client, schema, debug);

    if (!swaggerResult.success) {
      return err(swaggerResult.error);
    }

    const tables = Object.keys(swaggerResult.value.paths)
      .filter((key) => !key.startsWith("/rpc/"))
      .map((key) => key.slice(1))
      .filter((key) => !!key);

    if (debug) log.debug(`Found ${tables.length} tables`);
    return ok(tables);
  }

  public static async getRPCs(
    client: SupabaseClient,
    schema: string,
    debug = false,
  ): Promise<Result<string[]>> {
    if (debug) log.debug(`Fetching RPCs for schema: ${schema}`);

    const swaggerResult = await this.getSwagger(client, schema, debug);

    if (!swaggerResult.success) {
      return err(swaggerResult.error);
    }

    const rpcs = Object.keys(swaggerResult.value.paths)
      .filter((key) => key.startsWith("/rpc/"))
      .map((key) => key.slice(1));

    if (debug) log.debug(`Found ${rpcs.length} RPCs`);
    return ok(rpcs);
  }

  public static async getRPCsWithParameters(
    client: SupabaseClient,
    schema: string,
    debug = false,
  ): Promise<Result<RPCFunction[]>> {
    if (debug) log.debug(`Fetching RPCs with parameters for schema: ${schema}`);

    const swaggerResult = await this.getSwagger(client, schema, debug);

    if (!swaggerResult.success) {
      return err(swaggerResult.error);
    }

    const rpcFunctions: RPCFunction[] = [];

    Object.entries(swaggerResult.value.paths).forEach(
      ([path, methods]: [string, any]) => {
        if (path.startsWith("/rpc/")) {
          const rpcName = path.slice(1);

          const postMethod = methods.post; // TODO: is this right?
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

    if (debug) log.debug(`Found ${rpcFunctions.length} RPCs with parameters`);
    return ok(rpcFunctions);
  }

  public static async callRPC(
    client: SupabaseClient,
    schema: string,
    rpcName: string,
    args: Record<string, any> = {},
    debug = false,
    options: {
      get?: boolean;
      explain?: boolean;
      limit?: number;
    } = {
      get: false,
      explain: false,
    },
  ): Promise<Result<any>> {
    if (debug) log.debug(`Calling RPC: ${schema}.${rpcName}`, args);

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
        if (debug) log.debug("RPC error:", error);
        return err(new Error(`RPC call failed: ${error.message}`));
      }
      return ok(data);
    } catch (error) {
      if (debug) log.debug("RPC exception:", error);
      return err(
        new Error(
          `RPC call exception: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  public static async testTableRead(
    client: SupabaseClient,
    schema: string,
    table: string,
    debug = false,
  ): Promise<Result<TableAccessResult>> {
    if (debug) log.debug(`Testing read access for ${schema}.${table}`);

    const { data, error } = await client
      .schema(schema)
      .from(table)
      .select("*")
      .limit(1);

    if (error) {
      if (debug) log.debug(`Access denied for ${table}: ${error.message}`);
      return ok({ status: "denied", accessible: false, hasData: false });
    }

    const hasData = data && data.length > 0;

    if (hasData) {
      if (debug) log.debug(`Table ${table} is readable with data (EXPOSED)`);
      return ok({ status: "readable", accessible: true, hasData: true });
    }

    if (debug)
      log.debug(`Table ${table} returned 0 rows (empty or RLS blocked)`);
    return ok({ status: "empty", accessible: true, hasData: false });
  }

  public static async testTablesRead(
    client: SupabaseClient,
    schema: string,
    tables: string[],
    debug = false,
  ): Promise<Result<Record<string, TableAccessResult>>> {
    if (debug) log.debug(`Testing read access for ${tables.length} tables`);

    const results = await Promise.all(
      tables.map(async (table) => {
        const result = await this.testTableRead(client, schema, table, debug);
        return {
          table,
          access: result.success
            ? result.value
            : { status: "denied" as const, accessible: false, hasData: false },
        };
      }),
    );

    const accessMap = results.reduce(
      (acc, { table, access }) => {
        acc[table] = access;
        return acc;
      },
      {} as Record<string, TableAccessResult>,
    );

    return ok(accessMap);
  }

  public static async dumpTable(
    client: SupabaseClient,
    schema: string,
    table: string,
    limit = 10,
    debug = false,
  ): Promise<
    Result<{
      columns: string[];
      rows: Record<string, unknown>[];
      count: number;
    }>
  > {
    if (debug) log.debug(`Dumping table ${schema}.${table}`);

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
}
