import type { SupabaseClient } from "@supabase/supabase-js";


import {
  SupabaseService,
  type TableAccessResult,
} from "./supabase.service";
import { type Result, ok, err } from "../utils";
import pc from "picocolors";

export type SchemaAnalysis = {
  tables: string[];
  rpcs: string[];
  tableAccess: Record<string, TableAccessResult>;
};

export type AnalysisResult = {
  schemas: string[];
  schemaDetails: Record<string, SchemaAnalysis>;
};

export abstract class AnalyzerService {
  public static async analyze(
    client: SupabaseClient,
    targetSchema: string | undefined,
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
        tableAccess: accessResult.value,
      };
    }

    return ok({
      schemas: schemasResult.value,
      schemaDetails,
    });
  }

  public static display(result: AnalysisResult): void {
    console.log();
    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log(pc.bold(pc.cyan("  SUPABASE DATABASE ANALYSIS")));
    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log();

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
      if (analysis.rpcs.length > 0) {
        analysis.rpcs.forEach((rpc) => {
          console.log(`  • ${pc.white(rpc)}`);
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
