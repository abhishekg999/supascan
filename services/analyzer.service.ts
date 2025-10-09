import type { SupabaseClient } from "@supabase/supabase-js";

import pc from "picocolors";
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
    client: SupabaseClient,
    targetSchema: string | undefined,
    url: string,
    key: string,
    debug = false,
  ): Promise<Result<AnalysisResult>> {
    const schemasResult = await SupabaseService.getSchemas(client, debug);

    if (!schemasResult.success) {
      return err(schemasResult.error);
    }

    const schemasToAnalyze = targetSchema
      ? [targetSchema]
      : schemasResult.value;

    const schemaDetails: Record<string, SchemaAnalysis> = {};

    for (const schema of schemasToAnalyze) {
      const tablesResult = await SupabaseService.getTables(
        client,
        schema,
        debug,
      );
      const rpcsResult = await SupabaseService.getRPCs(client, schema, debug);
      const rpcFunctionsResult = await SupabaseService.getRPCsWithParameters(
        client,
        schema,
        debug,
      );

      if (!tablesResult.success || !rpcsResult.success) continue;

      const accessResult = await SupabaseService.testTablesRead(
        client,
        schema,
        tablesResult.value,
        debug,
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

    const summary = await this.extractSummary(client, url, key, debug);

    return ok({
      schemas: schemasResult.value,
      schemaDetails,
      summary,
    });
  }

  private static async extractSummary(
    client: SupabaseClient,
    url: string,
    key: string,
    debug = false,
  ): Promise<AnalysisResult["summary"]> {
    const domain = this.extractDomain(url);
    const jwtInfo = this.decodeJWT(key);
    const metadata = this.extractMetadata(url, debug);

    const swaggerMetadata = await this.extractSwaggerMetadata(client, debug);
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

  private static extractMetadata(url: string, debug = false): SummaryMetadata {
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
    client: SupabaseClient,
    debug = false,
  ): Promise<Partial<SummaryMetadata>> {
    try {
      const swaggerResult = await SupabaseService.getSwagger(
        client,
        "public",
        debug,
      );

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

  public static display(result: AnalysisResult): void {
    console.log();
    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log(pc.bold(pc.cyan("  SUPABASE DATABASE ANALYSIS")));
    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log();

    console.log(pc.bold(pc.yellow("TARGET SUMMARY")));
    console.log(pc.dim("─".repeat(20)));
    console.log(pc.bold("Domain:"), pc.white(result.summary.domain));

    if (result.summary.metadata?.service) {
      console.log(
        pc.bold("Service:"),
        pc.white(result.summary.metadata.service),
      );
    }

    if (result.summary.metadata?.region) {
      console.log(
        pc.bold("Project ID:"),
        pc.white(result.summary.metadata.region),
      );
    }

    if (result.summary.metadata?.title) {
      console.log(pc.bold("Title:"), pc.white(result.summary.metadata.title));
    }

    if (result.summary.metadata?.version) {
      console.log(
        pc.bold("Version:"),
        pc.white(result.summary.metadata.version),
      );
    }

    if (result.summary.jwtInfo) {
      console.log();
      console.log(pc.bold(pc.yellow("JWT TOKEN INFO")));
      console.log(pc.dim("─".repeat(20)));

      if (result.summary.jwtInfo.iss) {
        console.log(pc.bold("Issuer:"), pc.white(result.summary.jwtInfo.iss));
      }
      if (result.summary.jwtInfo.aud) {
        console.log(pc.bold("Audience:"), pc.white(result.summary.jwtInfo.aud));
      }
      if (result.summary.jwtInfo.role) {
        console.log(pc.bold("Role:"), pc.white(result.summary.jwtInfo.role));
      }
      if (result.summary.jwtInfo.exp) {
        const expDate = new Date(result.summary.jwtInfo.exp * 1000);
        console.log(pc.bold("Expires:"), pc.white(expDate.toISOString()));
      }
      if (result.summary.jwtInfo.iat) {
        const iatDate = new Date(result.summary.jwtInfo.iat * 1000);
        console.log(pc.bold("Issued:"), pc.white(iatDate.toISOString()));
      }
    }

    console.log();
    console.log(pc.bold(pc.cyan("DATABASE ANALYSIS")));
    console.log(pc.dim("─".repeat(20)));
    console.log(
      pc.bold("Schemas discovered:"),
      pc.green(result.schemas.length.toString()),
    );
    console.log();

    Object.entries(result.schemaDetails).forEach(([schema, analysis]) => {
      console.log(pc.bold(pc.cyan(`Schema: ${schema}`)));
      console.log();

      const exposedCount = Object.values(analysis.tableAccess).filter(
        (a) => a.status === "readable",
      ).length;
      const deniedCount = Object.values(analysis.tableAccess).filter(
        (a) => a.status === "denied",
      ).length;
      const emptyCount = Object.values(analysis.tableAccess).filter(
        (a) => a.status === "empty",
      ).length;

      console.log(
        pc.bold("Tables:"),
        pc.green(analysis.tables.length.toString()),
      );
      console.log(
        pc.dim(
          `  ${exposedCount} exposed • ${emptyCount} empty/protected • ${deniedCount} denied`,
        ),
      );
      console.log();

      if (analysis.tables.length > 0) {
        analysis.tables.forEach((table) => {
          const access = analysis.tableAccess[table];
          let indicator = "";
          let description = "";

          switch (access?.status) {
            case "readable":
              indicator = pc.green("✓");
              description = pc.dim("(data exposed)");
              break;
            case "empty":
              indicator = pc.yellow("○");
              description = pc.dim("(0 rows - empty or RLS)");
              break;
            case "denied":
              indicator = pc.red("✗");
              description = pc.dim("(access denied)");
              break;
          }

          console.log(`  ${indicator} ${pc.white(table)} ${description}`);
        });
      } else {
        console.log(pc.dim("  No tables found"));
      }
      console.log();

      console.log(pc.bold("RPCs:"), pc.green(analysis.rpcs.length.toString()));
      if (analysis.rpcFunctions.length > 0) {
        analysis.rpcFunctions.forEach((rpc) => {
          console.log(`  • ${pc.white(rpc.name)}`);
          if (rpc.parameters.length > 0) {
            rpc.parameters.forEach((param) => {
              const required = param.required
                ? pc.red("(required)")
                : pc.dim("(optional)");
              const type = param.format
                ? `${param.type} (${param.format})`
                : param.type;
              console.log(
                `    - ${pc.cyan(param.name)}: ${pc.yellow(type)} ${required}`,
              );
            });
          } else {
            console.log(pc.dim("    No parameters"));
          }
        });
      } else {
        console.log(pc.dim("  No RPCs found"));
      }
      console.log();
    });

    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log();
  }
}
