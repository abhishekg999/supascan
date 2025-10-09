import type { SupabaseClient } from "@supabase/supabase-js";
import { type Result, ok, err, log } from "../utils";

export type SupabaseSwagger = {
  swagger: string;
  paths: Record<string, unknown>;
  [key: string]: unknown;
};

export type TableAccessStatus = "denied" | "readable" | "empty";

export type TableAccessResult = {
  status: TableAccessStatus;
  accessible: boolean;
  hasData: boolean;
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

    if (debug) log.debug(`Table ${table} returned 0 rows (empty or RLS blocked)`);
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
}
