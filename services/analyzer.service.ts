import type { CLIContext } from "../context";
import { type Result, err, ok } from "../utils";
import {
  type RPCFunction,
  SupabaseService,
  type TableAccessResult,
} from "./supabase.service";

export type SchemaAnalysis = {
  tables: string[];
  rpcs: string[];
  rpcFunctions: RPCFunction[];
  tableAccess: Record<string, TableAccessResult>;
};

export type JWTInfo = {
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  role?: string;
  [key: string]: unknown;
};

export type SummaryMetadata = {
  service?: string;
  region?: string;
  protocol?: string;
  port?: string;
  version?: string;
  title?: string;
  description?: string;
};

export type AnalysisResult = {
  schemas: string[];
  schemaDetails: Record<string, SchemaAnalysis>;
  summary: {
    domain: string;
    jwtInfo?: JWTInfo;
    metadata?: SummaryMetadata;
  };
};

export abstract class AnalyzerService {
  public static async analyze(
    ctx: CLIContext,
    targetSchema: string | undefined
  ): Promise<Result<AnalysisResult>> {
    const schemasResult = await SupabaseService.getSchemas(ctx);

    if (!schemasResult.success) {
      return err(schemasResult.error);
    }

    const schemasToAnalyze = targetSchema
      ? [targetSchema]
      : schemasResult.value;

    const schemaDetails: Record<string, SchemaAnalysis> = {};

    for (const schema of schemasToAnalyze) {
      const tablesResult = await SupabaseService.getTables(ctx, schema);
      const rpcsResult = await SupabaseService.getRPCs(ctx, schema);
      const rpcFunctionsResult = await SupabaseService.getRPCsWithParameters(
        ctx,
        schema
      );

      if (!tablesResult.success || !rpcsResult.success) continue;

      const accessResult = await SupabaseService.testTablesRead(
        ctx,
        schema,
        tablesResult.value
      );

      if (!accessResult.success) continue;

      schemaDetails[schema] = {
        tables: tablesResult.value,
        rpcs: rpcsResult.value,
        rpcFunctions: rpcFunctionsResult.success
          ? rpcFunctionsResult.value
          : [],
        tableAccess: accessResult.value,
      };
    }

    const summary = await this.extractSummary(ctx);

    return ok({
      schemas: schemasResult.value,
      schemaDetails,
      summary,
    });
  }

  private static async extractSummary(
    ctx: CLIContext
  ): Promise<AnalysisResult["summary"]> {
    const domain = this.extractDomain(ctx.url);
    const jwtInfo = this.decodeJWT(ctx.key);
    const metadata = this.extractMetadata(ctx.url, ctx.debug);

    const swaggerMetadata = await this.extractSwaggerMetadata(ctx);
    const enhancedMetadata = { ...metadata, ...swaggerMetadata };

    return {
      domain,
      jwtInfo,
      metadata: enhancedMetadata,
    };
  }

  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  private static decodeJWT(key: string): JWTInfo | undefined {
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

  private static extractMetadata(url: string, debug: boolean): SummaryMetadata {
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

  private static async extractSwaggerMetadata(
    ctx: CLIContext
  ): Promise<Partial<SummaryMetadata>> {
    try {
      const swaggerResult = await SupabaseService.getSwagger(ctx, "public");

      if (!swaggerResult.success) {
        return {};
      }

      const swagger = swaggerResult.value;
      const metadata: Partial<SummaryMetadata> = {};

      if (swagger.info && typeof swagger.info === "object") {
        const info = swagger.info as {
          title?: string;
          description?: string;
          version?: string;
        };
        metadata.title = info.title;
        metadata.description = info.description;
        metadata.version = info.version;
      }

      return metadata;
    } catch {
      return {};
    }
  }
}
