import pc from "picocolors";
import type { CLIContext } from "../context";
import { SupabaseService } from "../services/supabase.service";
import { log } from "../utils";

export async function executeDumpCommand(
  ctx: CLIContext,
  options: {
    dump: string;
    limit: string;
  },
): Promise<void> {
  const parts = options.dump.split(".");

  if (parts.length === 1 && parts[0]) {
    const schema = parts[0];

    const swaggerResult = await SupabaseService.getSwagger(ctx, schema);

    if (!swaggerResult.success) {
      log.error("Failed to get swagger", swaggerResult.error.message);
      process.exit(1);
    }

    if (ctx.json) {
      console.log(JSON.stringify(swaggerResult.value, null, 2));
    } else {
      displaySwaggerResult(schema, swaggerResult.value);
    }
    return;
  }

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    log.error("Invalid format. Use: schema.table or schema");
    process.exit(1);
  }

  const schema = parts[0];
  const table = parts[1];
  const limit = parseInt(options.limit);

  const dumpResult = await SupabaseService.dumpTable(ctx, schema, table, limit);

  if (!dumpResult.success) {
    log.error("Failed to dump table", dumpResult.error.message);
    process.exit(1);
  }

  if (ctx.json) {
    console.log(JSON.stringify(dumpResult.value, null, 2));
  } else {
    displayTableDumpResult(schema, table, dumpResult.value);
  }
}

function displaySwaggerResult(schema: string, swagger: any): void {
  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log(pc.bold(pc.cyan(`  SWAGGER DUMP: ${schema}`)));
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();
  console.log(JSON.stringify(swagger, null, 2));
  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();
}

function displayTableDumpResult(
  schema: string,
  table: string,
  result: {
    columns: string[];
    rows: Record<string, unknown>[];
    count: number;
  },
): void {
  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log(pc.bold(pc.cyan(`  TABLE DUMP: ${schema}.${table}`)));
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();
  console.log(pc.bold("Total rows:"), pc.green(result.count.toString()));
  console.log(pc.bold("Showing:"), pc.green(result.rows.length.toString()));
  console.log(pc.bold("Columns:"), pc.green(result.columns.length.toString()));
  console.log();
  console.log(pc.dim(result.columns.join(", ")));
  console.log();

  if (result.rows.length > 0) {
    console.table(result.rows);
  } else {
    console.log(pc.dim("No rows found"));
  }

  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();
}
