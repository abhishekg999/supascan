import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getRPCs,
  getRPCsWithParameters,
  getSchemas,
  getTables,
  testTablesRead,
} from "./supabase";
import type {
  AnalysisResult,
  AnalyzerEvent,
  JWTInfo,
  SchemaAnalysis,
  SummaryMetadata,
} from "./types/analyzer.types";
import type { Result } from "./types/result.types";
import { err, ok } from "./types/result.types";
import type { SupabaseEvent } from "./types/supabase.types";

export async function* analyze(
  client: SupabaseClient,
  url: string,
  key: string,
  options: { schema?: string } = {},
): AsyncGenerator<AnalyzerEvent | SupabaseEvent, Result<AnalysisResult>> {
  yield { type: "analysis_started", data: {} };

  const schemasGen = getSchemas(client);
  let schemasResult;
  while (true) {
    const next = await schemasGen.next();
    if (next.done) {
      schemasResult = next.value;
      break;
    }
    yield next.value;
  }

  if (!schemasResult || !schemasResult.success) {
    return err(schemasResult?.error ?? new Error("Failed to fetch schemas"));
  }

  const schemasToAnalyze = options.schema
    ? [options.schema]
    : schemasResult.value;

  const schemaDetails: Record<string, SchemaAnalysis> = {};

  for (const schema of schemasToAnalyze) {
    yield { type: "schema_analysis_started", data: { schema } };

    const tablesGen = getTables(client, schema);
    let tablesResult;
    while (true) {
      const next = await tablesGen.next();
      if (next.done) {
        tablesResult = next.value;
        break;
      }
      yield next.value;
    }

    const rpcsGen = getRPCs(client, schema);
    let rpcsResult;
    while (true) {
      const next = await rpcsGen.next();
      if (next.done) {
        rpcsResult = next.value;
        break;
      }
      yield next.value;
    }

    const rpcFunctionsResult = await getRPCsWithParameters(client, schema);

    if (!tablesResult?.success || !rpcsResult?.success) {
      continue;
    }

    const tables = tablesResult.value;

    const accessGen = testTablesRead(client, schema, tables);
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
      rpcs: rpcsResult.value,
      rpcFunctions: rpcFunctionsResult.success ? rpcFunctionsResult.value : [],
      tableAccess: accessResult.value,
    };

    schemaDetails[schema] = analysis;

    yield {
      type: "schema_analysis_completed",
      data: { schema, analysis },
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
