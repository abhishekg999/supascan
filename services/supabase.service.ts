import type { SupabaseClient } from "@supabase/supabase-js";
import { type Result, ok, err, log } from "../utils";

export type SupabaseSwagger = {
  swagger: string;
  paths: Record<string, unknown>;
  [key: string]: unknown;
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
}
