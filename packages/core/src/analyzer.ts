import type { SupabaseClient } from "@supabase/supabase-js";
import { getSchema, getSchemas as getSchemasNew } from "./schema";
import { testTablesRead } from "./supabase";
import type {
  AnalysisResult,
  AnalyzerEvent,
  JWTInfo,
  SchemaAnalysis,
  SummaryMetadata,
} from "./types/analyzer.types";
import type { Result } from "./types/result.types";
import { err, ok } from "./types/result.types";
import type { RPCFunction } from "./types/supabase.types";
import type { SupabaseEvent } from "./types/supabase.types";

export async function* analyze(
  client: SupabaseClient,
  url: string,
  key: string,
  options: { schema?: string } = {},
): AsyncGenerator<AnalyzerEvent | SupabaseEvent, Result<AnalysisResult>> {
  yield { type: "analysis_started", data: {} };

  yield { type: "schemas_fetch_started", data: {} };
  const schemasResult = await getSchemasNew(client);

  if (!schemasResult.success) {
    return err(schemasResult.error);
  }

  yield { type: "schemas_discovered", data: { schemas: schemasResult.value } };

  const schemasToAnalyze = options.schema
    ? [options.schema]
    : schemasResult.value;

  const schemaDetails: Record<string, SchemaAnalysis> = {};

  for (const schemaName of schemasToAnalyze) {
    yield { type: "schema_analysis_started", data: { schema: schemaName } };
    yield { type: "swagger_fetch_started", data: { schema: schemaName } };

    const schemaResult = await getSchema(client, schemaName);

    if (!schemaResult.success) {
      continue;
    }

    yield { type: "swagger_fetched", data: { schema: schemaName } };

    const dbSchema = schemaResult.value.schema;
    const tables = dbSchema.tables.map((t) => t.name);
    const rpcs = dbSchema.rpcs.map((r) => r.name);
    const rpcFunctions: RPCFunction[] = dbSchema.rpcs.map((r) => ({
      name: r.name,
      parameters: r.parameters,
    }));

    yield { type: "tables_discovered", data: { schema: schemaName, tables } };
    yield { type: "rpcs_discovered", data: { schema: schemaName, rpcs } };

    const accessGen = testTablesRead(client, schemaName, tables);
    let accessResult;
    while (true) {
      const next = await accessGen.next();
      if (next.done) {
        accessResult = next.value;
        break;
      }
      yield next.value;
    }

    if (!accessResult?.success) {
      continue;
    }

    const analysis: SchemaAnalysis = {
      tables,
      rpcs,
      rpcFunctions,
      tableAccess: accessResult.value,
      databaseSchema: dbSchema,
      introspectionMethod: schemaResult.value.method,
    };

    schemaDetails[schemaName] = analysis;

    yield {
      type: "schema_analysis_completed",
      data: { schema: schemaName, analysis },
    };
  }

  const summary = await extractSummary(client, url, key);

  const result: AnalysisResult = {
    schemas: schemasResult.value,
    schemaDetails,
    summary,
  };

  yield { type: "analysis_completed", data: { result } };
  return ok(result);
}

async function extractSummary(
  client: SupabaseClient,
  url: string,
  key: string,
): Promise<AnalysisResult["summary"]> {
  const domain = extractDomain(url);
  const jwtInfo = decodeJWT(key);
  const metadata = extractMetadata(url);
  const swaggerMetadata = await extractSwaggerMetadata(client);
  const enhancedMetadata = { ...metadata, ...swaggerMetadata };

  return {
    domain,
    jwtInfo,
    metadata: enhancedMetadata,
  };
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function decodeJWT(key: string): JWTInfo | undefined {
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return undefined;

    const payload = parts[1];
    if (!payload) return undefined;

    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JWTInfo;
  } catch {
    return undefined;
  }
}

function extractMetadata(url: string): SummaryMetadata {
  const metadata: SummaryMetadata = {};

  try {
    const urlObj = new URL(url);
    metadata.protocol = urlObj.protocol;
    metadata.port =
      urlObj.port || (urlObj.protocol === "https:" ? "443" : "80");

    if (urlObj.hostname.includes(".supabase.co")) {
      metadata.service = "Supabase";

      const projectId = urlObj.hostname.replace(".supabase.co", "");
      metadata.region = projectId;
    }
  } catch {}

  return metadata;
}

async function extractSwaggerMetadata(
  client: SupabaseClient,
): Promise<Partial<SummaryMetadata>> {
  try {
    const { data, error } = await client.schema("public").from("").select();

    if (error) {
      return {};
    }

    const swagger = data as unknown as {
      info?: { title?: string; description?: string; version?: string };
    };
    const metadata: Partial<SummaryMetadata> = {};

    if (swagger.info && typeof swagger.info === "object") {
      const info = swagger.info;
      metadata.title = info.title;
      metadata.description = info.description;
      metadata.version = info.version;
    }

    return metadata;
  } catch {
    return {};
  }
}
