import pc from "picocolors";
import type { CLIContext } from "../context";
import {
  SupabaseService,
  type RPCFunction,
  type RPCParameter,
} from "../services/supabase.service";
import { log, parseRPCArgs } from "../utils";

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

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    log.error("Invalid RPC format. Use: schema.rpc_name");
    process.exit(1);
  }

  const schema = parts[0];
  const rpcName = parts[1];

  const rpcFunctionsResult = await SupabaseService.getRPCsWithParameters(
    ctx,
    schema,
  );

  let rpcFunction: RPCFunction | null = null;

  if (rpcFunctionsResult.success) {
    rpcFunction =
      rpcFunctionsResult.value.find((rpc) => rpc.name === `rpc/${rpcName}`) ||
      null;
  } else {
    log.warn(
      "Failed to get RPC functions from schema, proceeding without validation",
      rpcFunctionsResult.error.message,
    );
  }

  if (!options.args) {
    displayRPCHelp(schema, rpcName, rpcFunction);
    return;
  }

  let args: Record<string, any> = {};
  try {
    args = parseRPCArgs(options.args);
  } catch (error) {
    log.error(
      "Failed to parse RPC arguments",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }

  if (rpcFunction) {
    const requiredParams = rpcFunction.parameters.filter(
      (p: RPCParameter) => p.required,
    );
    const missingParams = requiredParams.filter(
      (p: RPCParameter) => !(p.name in args),
    );

    if (missingParams.length > 0) {
      log.error(
        `Missing required parameters: ${missingParams.map((p: RPCParameter) => p.name).join(", ")}`,
      );
      process.exit(1);
    }
  } else {
    log.warn(
      "Skipping parameter validation due to schema introspection failure",
    );
  }

  const rpcResult = await SupabaseService.callRPC(ctx, schema, rpcName, args, {
    get: true,
    explain: options.explain,
    limit: parseInt(options.limit),
  });

  if (!rpcResult.success) {
    log.error("RPC call failed", rpcResult.error.message);
    process.exit(1);
  }

  if (ctx.json) {
    console.log(JSON.stringify(rpcResult.value, null, 2));
  } else {
    displayRPCResult(schema, rpcName, rpcResult.value, options.explain);
  }
}

function displayRPCHelp(
  schema: string,
  rpcName: string,
  rpcFunction: RPCFunction | null,
): void {
  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log(pc.bold(pc.cyan(`  RPC HELP: ${schema}.${rpcName}`)));
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();

  if (rpcFunction && rpcFunction.parameters.length > 0) {
    console.log(pc.bold("Parameters:"));
    rpcFunction.parameters.forEach((param: RPCParameter) => {
      const required = param.required
        ? pc.red("(required)")
        : pc.dim("(optional)");
      const type = param.format
        ? `${param.type} (${param.format})`
        : param.type;
      console.log(`  * ${pc.cyan(param.name)}: ${pc.yellow(type)} ${required}`);
      if (param.description) {
        console.log(pc.dim(`    ${param.description}`));
      }
    });
    console.log();
    console.log(pc.bold("Usage:"));
    console.log(
      pc.dim(
        `supascan --rpc "${schema}.${rpcName}" --args '{"param1": "value1", "param2": "value2"}'`,
      ),
    );
  } else if (rpcFunction) {
    console.log(pc.dim("No parameters required"));
    console.log();
    console.log(pc.bold("Usage:"));
    console.log(pc.dim(`supascan --rpc "${schema}.${rpcName}"`));
  } else {
    console.log(
      pc.yellow(
        "[!] Schema introspection failed - parameter information unavailable",
      ),
    );
    console.log();
    console.log(pc.bold("Usage:"));
    console.log(
      pc.dim(
        `supascan --rpc "${schema}.${rpcName}" --args '{"param1": "value1"}'`,
      ),
    );
    console.log();
    console.log(
      pc.dim(
        "Note: You can still call the RPC, but parameter validation is disabled",
      ),
    );
  }
  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();
}

function displayRPCResult(
  schema: string,
  rpcName: string,
  result: any,
  explain?: boolean,
): void {
  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  if (explain) {
    console.log(pc.bold(pc.cyan(`  QUERY PLAN: ${schema}.${rpcName}`)));
  } else {
    console.log(pc.bold(pc.cyan(`  RPC RESULT: ${schema}.${rpcName}`)));
  }
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();

  if (explain) {
    console.log(pc.bold("Execution Plan:"));
    console.log();
    if (typeof result === "string") {
      console.log(pc.yellow(result));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } else if (Array.isArray(result)) {
    console.log(pc.bold("Results:"), pc.green(result.length.toString()));
    console.log();
    if (result.length > 0) {
      console.table(result);
    } else {
      console.log(pc.dim("No results returned"));
    }
  } else if (typeof result === "object" && result !== null) {
    console.log(pc.bold("Result:"));
    console.table([result]);
  } else {
    console.log(pc.bold("Result:"), pc.green(String(result)));
  }

  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();
}
