import type { CLIContext } from "../context";
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

export abstract class SupabaseService {
  public static async getSchemas(
    ctx: CLIContext,
    nonexistantSchema = "NONEXISTANT_SCHEMA_THAT_SHOULDNT_EXIST",
  ): Promise<Result<string[]>> {
    log.debug(ctx, "Fetching schemas...");

    const { data, error } = await ctx.client
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

    log.debug(ctx, `Found ${schemas.length} schemas`);
    return ok(schemas);
  }

  public static async getSwagger(
    ctx: CLIContext,
    schema: string,
  ): Promise<Result<SupabaseSwagger>> {
    log.debug(ctx, `Fetching swagger for schema: ${schema}`);

    const { data, error } = await ctx.client.schema(schema).from("").select();

    if (error) {
      return err(error);
    }

    return ok(data as unknown as SupabaseSwagger);
  }

  public static async getTables(
    ctx: CLIContext,
    schema: string,
  ): Promise<Result<string[]>> {
    log.debug(ctx, `Fetching tables for schema: ${schema}`);

    const swaggerResult = await this.getSwagger(ctx, schema);

    if (!swaggerResult.success) {
      return err(swaggerResult.error);
    }

    const tables = Object.keys(swaggerResult.value.paths)
      .filter((key) => !key.startsWith("/rpc/"))
      .map((key) => key.slice(1))
      .filter((key) => !!key);

    log.debug(ctx, `Found ${tables.length} tables`);
    return ok(tables);
  }

  public static async getRPCs(
    ctx: CLIContext,
    schema: string,
  ): Promise<Result<string[]>> {
    log.debug(ctx, `Fetching RPCs for schema: ${schema}`);

    const swaggerResult = await this.getSwagger(ctx, schema);

    if (!swaggerResult.success) {
      return err(swaggerResult.error);
    }

    const rpcs = Object.keys(swaggerResult.value.paths)
      .filter((key) => key.startsWith("/rpc/"))
      .map((key) => key.slice(1));

    log.debug(ctx, `Found ${rpcs.length} RPCs`);
    return ok(rpcs);
  }

  public static async getRPCsWithParameters(
    ctx: CLIContext,
    schema: string,
  ): Promise<Result<RPCFunction[]>> {
    log.debug(ctx, `Fetching RPCs with parameters for schema: ${schema}`);

    const swaggerResult = await this.getSwagger(ctx, schema);

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

    log.debug(ctx, `Found ${rpcFunctions.length} RPCs with parameters`);
    return ok(rpcFunctions);
  }

  public static async callRPC(
    ctx: CLIContext,
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
    log.debug(ctx, `Calling RPC: ${schema}.${rpcName}`, args);

    try {
      let query = ctx.client.schema(schema).rpc(rpcName, args);

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
        log.debug(ctx, "RPC error:", error);
        return err(new Error(`RPC call failed: ${error.message}`));
      }
      return ok(data);
    } catch (error) {
      log.debug(ctx, "RPC exception:", error);
      return err(
        new Error(
          `RPC call exception: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  public static async testTableRead(
    ctx: CLIContext,
    schema: string,
    table: string,
  ): Promise<Result<TableAccessResult>> {
    log.debug(ctx, `Testing read access for ${schema}.${table}`);

    const { data, error } = await ctx.client
      .schema(schema)
      .from(table)
      .select("*")
      .limit(1);

    if (error) {
      log.debug(ctx, `Access denied for ${table}: ${error.message}`);
      return ok({ status: "denied", accessible: false, hasData: false });
    }

    const hasData = data && data.length > 0;

    if (hasData) {
      const { count } = await ctx.client
        .schema(schema)
        .from(table)
        .select("*", { count: "estimated", head: true });

      log.debug(
        ctx,
        `Table ${table} is readable with ~${count ?? "unknown"} rows (EXPOSED)`,
      );
      return ok({
        status: "readable",
        accessible: true,
        hasData: true,
        rowCount: count ?? undefined,
      });
    }

    log.debug(ctx, `Table ${table} returned 0 rows (empty or RLS blocked)`);
    return ok({
      status: "empty",
      accessible: true,
      hasData: false,
      rowCount: 0,
    });
  }

  public static async testTablesRead(
    ctx: CLIContext,
    schema: string,
    tables: string[],
  ): Promise<Result<Record<string, TableAccessResult>>> {
    log.debug(ctx, `Testing read access for ${tables.length} tables`);

    const results = await Promise.all(
      tables.map(async (table) => {
        const result = await this.testTableRead(ctx, schema, table);
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
    ctx: CLIContext,
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
    log.debug(ctx, `Dumping table ${schema}.${table}`);

    const { data, error, count } = await ctx.client
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
