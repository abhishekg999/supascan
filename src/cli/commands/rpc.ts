import { callRPC } from "../../core/supabase";
import type { CLIContext } from "../context";
import { parseRPCArgs } from "../utils/args";
import { log } from "../formatters/console";

export async function executeRPCCommand(
  ctx: CLIContext,
  options: {
    rpc: string;
    args?: string;
    limit: string;
    explain?: boolean;
  },
): Promise<void> {
  const parts = options.rpc.split(".");

  if (parts.length !== 2) {
    log.error("Invalid RPC format. Use schema.rpc_name");
    process.exit(1);
  }

  const schema = parts[0];
  const rpcName = parts[1];

  if (!schema || !rpcName) {
    log.error("Invalid RPC format. Use schema.rpc_name");
    process.exit(1);
  }

  const parsedArgs = options.args ? parseRPCArgs(options.args) : {};
  const limit = parseInt(options.limit);

  if (isNaN(limit) || limit <= 0) {
    log.error("Invalid limit value");
    process.exit(1);
  }

  log.info(`Calling RPC: ${schema}.${rpcName}`);

  if (Object.keys(parsedArgs).length > 0) {
    log.info("Arguments:", JSON.stringify(parsedArgs));
  }

  const result = await callRPC(ctx.client, schema, rpcName, parsedArgs, {
    limit,
    explain: options.explain,
  });

  if (!result.success) {
    log.error("RPC call failed", result.error.message);
    process.exit(1);
  }

  if (ctx.json) {
    console.log(JSON.stringify(result.value, null, 2));
  } else if (options.explain) {
    console.log("\nQuery Execution Plan:\n");
    console.log(result.value);
  } else {
    console.log("\nRPC Result:\n");
    if (Array.isArray(result.value)) {
      console.table(result.value);
    } else {
      console.log(JSON.stringify(result.value, null, 2));
    }
  }
}
