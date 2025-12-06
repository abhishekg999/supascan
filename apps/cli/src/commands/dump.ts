import { dumpTable } from "@supascan/core";
import type { CLIContext } from "../context";
import { log } from "../formatters/console";

export async function executeDumpCommand(
  ctx: CLIContext,
  options: { dump: string; limit: string },
): Promise<void> {
  const parts = options.dump.split(".");

  if (parts.length === 1) {
    const schema = parts[0];
    if (!schema) {
      log.error("Invalid dump format. Use schema.table or schema");
      process.exit(1);
    }

    log.info(`Dumping swagger for schema: ${schema}`);

    const { data, error } = await ctx.client.schema(schema).from("").select();

    if (error) {
      log.error("Failed to fetch swagger", error.message);
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (parts.length === 2) {
    const schema = parts[0];
    const table = parts[1];

    if (!schema || !table) {
      log.error("Invalid dump format. Use schema.table");
      process.exit(1);
    }

    const limit = parseInt(options.limit);
    if (isNaN(limit) || limit <= 0) {
      log.error("Invalid limit value");
      process.exit(1);
    }

    log.info(`Dumping table: ${schema}.${table} (limit: ${limit})`);

    const result = await dumpTable(ctx.client, schema, table, limit);

    if (!result.success) {
      log.error("Failed to dump table", result.error.message);
      process.exit(1);
    }

    if (ctx.json) {
      console.log(JSON.stringify(result.value, null, 2));
    } else {
      console.log(
        `\nTable: ${schema}.${table} (${result.value.count} total rows, showing ${result.value.rows.length})\n`,
      );
      console.table(result.value.rows);
    }
    return;
  }

  log.error("Invalid dump format. Use schema.table or schema");
  process.exit(1);
}
