import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseService } from "./supabase.service";
import { type Result, ok, err } from "../utils";
import pc from "picocolors";

export type AnalysisResult = {
  schemas: string[];
  tables: string[];
  rpcs: string[];
};

export abstract class AnalyzerService {
  public static async analyze(
    client: SupabaseClient,
    schema: string,
    debug = false,
  ): Promise<Result<AnalysisResult>> {
    const schemasResult = await SupabaseService.getSchemas(client, debug);
    const tablesResult = await SupabaseService.getTables(client, schema, debug);
    const rpcsResult = await SupabaseService.getRPCs(client, schema, debug);

    if (!schemasResult.success) {
      return err(schemasResult.error);
    }

    if (!tablesResult.success) {
      return err(tablesResult.error);
    }

    if (!rpcsResult.success) {
      return err(rpcsResult.error);
    }

    return ok({
      schemas: schemasResult.value,
      tables: tablesResult.value,
      rpcs: rpcsResult.value,
    });
  }

  public static display(result: AnalysisResult, schema: string): void {
    console.log();
    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log(pc.bold(pc.cyan("  SUPABASE DATABASE ANALYSIS")));
    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log();

    console.log(
      pc.bold("Schemas discovered:"),
      pc.green(result.schemas.length.toString()),
    );
    result.schemas.forEach((s) => {
      const indicator = s === schema ? pc.yellow("→") : " ";
      console.log(`  ${indicator} ${pc.white(s)}`);
    });
    console.log();

    console.log(
      pc.bold(`Tables in '${schema}' schema:`),
      pc.green(result.tables.length.toString()),
    );
    if (result.tables.length > 0) {
      result.tables.forEach((table) => {
        console.log(`  • ${pc.white(table)}`);
      });
    } else {
      console.log(pc.dim("  No tables found"));
    }
    console.log();

    console.log(
      pc.bold(`RPCs in '${schema}' schema:`),
      pc.green(result.rpcs.length.toString()),
    );
    if (result.rpcs.length > 0) {
      result.rpcs.forEach((rpc) => {
        console.log(`  • ${pc.white(rpc)}`);
      });
    } else {
      console.log(pc.dim("  No RPCs found"));
    }
    console.log();

    console.log(pc.bold(pc.cyan("━".repeat(60))));
    console.log();
  }
}
