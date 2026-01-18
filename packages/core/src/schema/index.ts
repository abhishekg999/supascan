import type { SupabaseClient } from "@supabase/supabase-js";
import type { Result } from "../types/result.types";
import { err, ok } from "../types/result.types";
import type {
  DatabaseSchema,
  IntrospectionMethod,
  IntrospectionResult,
} from "../types/schema.types";
import { fetchSchemaViaOpenAPI } from "./openapi";
import { fetchSchemaViaGraphQL } from "./graphql";

export { fetchOpenAPISpec, parseOpenAPISpec } from "./openapi";
export {
  fetchGraphQLIntrospection,
  parseGraphQLIntrospection,
} from "./graphql";

export async function getSchema(
  client: SupabaseClient,
  schemaName: string,
): Promise<Result<{ schema: DatabaseSchema; method: IntrospectionMethod }>> {
  const openAPIResult = await fetchSchemaViaOpenAPI(client, schemaName);
  if (openAPIResult.success) {
    return ok({ schema: openAPIResult.value, method: "openapi" });
  }

  const graphQLResult = await fetchSchemaViaGraphQL(client, schemaName);
  if (graphQLResult.success) {
    return ok({ schema: graphQLResult.value, method: "graphql" });
  }

  return err(
    new Error(
      `Schema introspection failed. OpenAPI: ${openAPIResult.error.message}. GraphQL: ${graphQLResult.error.message}`,
    ),
  );
}

export async function getSchemas(
  client: SupabaseClient,
  nonexistantSchema = "NONEXISTANT_SCHEMA_THAT_SHOULDNT_EXIST",
): Promise<Result<string[]>> {
  const { supabaseUrl, supabaseKey } = client as unknown as {
    supabaseUrl: string;
    supabaseKey: string;
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseKey,
      Accept: "application/openapi+json",
      "Accept-Profile": nonexistantSchema,
    },
  });

  const json = (await res.json()) as { hint?: string; message?: string };
  const hint = json.hint ?? json.message ?? "";
  const match = hint.match(/exposed:\s*(.+)/i);
  const schemaList = match?.[1] ?? "";
  const schemas = schemaList
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return ok(schemas);
}

export async function getAllSchemas(
  client: SupabaseClient,
): Promise<Result<IntrospectionResult>> {
  const schemasResult = await getSchemas(client);
  if (!schemasResult.success) {
    return err(schemasResult.error);
  }

  const schemas: DatabaseSchema[] = [];
  let method: IntrospectionMethod = "openapi";

  for (const schemaName of schemasResult.value) {
    const schemaResult = await getSchema(client, schemaName);
    if (schemaResult.success) {
      schemas.push(schemaResult.value.schema);
      method = schemaResult.value.method;
    }
  }

  return ok({ method, schemas });
}
