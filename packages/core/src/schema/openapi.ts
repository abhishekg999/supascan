import type { SupabaseClient } from "@supabase/supabase-js";
import type { Result } from "../types/result.types";
import { err, ok } from "../types/result.types";
import type {
  ColumnType,
  DatabaseSchema,
  RPCSchema,
  TableSchema,
} from "../types/schema.types";
import type { RPCParameter } from "../types/supabase.types";

type OpenAPISpec = {
  swagger?: string;
  openapi?: string;
  paths: Record<string, PathItem>;
  definitions?: Record<string, Definition>;
  components?: { schemas?: Record<string, Definition> };
  info?: { title?: string; description?: string; version?: string };
};

type PathItem = {
  get?: Operation;
  post?: Operation;
  patch?: Operation;
  delete?: Operation;
};

type Operation = {
  parameters?: Parameter[];
  responses?: Record<string, Response>;
  description?: string;
};

type Parameter = {
  name: string;
  in: string;
  type?: string;
  format?: string;
  required?: boolean;
  description?: string;
  schema?: SchemaRef;
};

type Response = {
  schema?: SchemaRef;
};

type SchemaRef = {
  $ref?: string;
  type?: string;
  items?: SchemaRef;
  properties?: Record<string, PropertyDef>;
  required?: string[];
};

type Definition = {
  type?: string;
  properties?: Record<string, PropertyDef>;
  required?: string[];
  description?: string;
};

type PropertyDef = {
  type?: string;
  format?: string;
  description?: string;
  $ref?: string;
  items?: { type?: string; $ref?: string };
  default?: unknown;
};

function extractClientInfo(client: SupabaseClient): {
  url: string;
  key: string;
} {
  const { supabaseUrl, supabaseKey } = client as unknown as {
    supabaseUrl: string;
    supabaseKey: string;
  };
  return { url: supabaseUrl, key: supabaseKey };
}

export async function fetchOpenAPISpec(
  client: SupabaseClient,
  schema: string,
): Promise<Result<OpenAPISpec>> {
  const { url, key } = extractClientInfo(client);
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Accept: "application/openapi+json",
      "Accept-Profile": schema,
    },
  });

  if (!res.ok) {
    return err(new Error(`OpenAPI fetch failed: ${res.status}`));
  }

  return ok((await res.json()) as OpenAPISpec);
}

function resolveRef(ref: string, spec: OpenAPISpec): Definition | undefined {
  const parts = ref.split("/");
  const name = parts[parts.length - 1];
  if (!name) return undefined;
  return spec.definitions?.[name] ?? spec.components?.schemas?.[name];
}

function parsePropertyType(prop: PropertyDef): {
  type: string;
  format?: string;
  isArray: boolean;
} {
  if (prop.type === "array" && prop.items) {
    const itemType =
      prop.items.type ?? prop.items.$ref?.split("/").pop() ?? "unknown";
    return { type: itemType, format: undefined, isArray: true };
  }
  return {
    type: prop.type ?? prop.$ref?.split("/").pop() ?? "unknown",
    format: prop.format,
    isArray: false,
  };
}

function parseTableFromDefinition(name: string, def: Definition): TableSchema {
  const requiredFields = new Set(def.required ?? []);
  const columns: ColumnType[] = Object.entries(def.properties ?? {}).map(
    ([colName, prop]) => {
      const { type, format, isArray } = parsePropertyType(prop);
      return {
        name: colName,
        type,
        format,
        nullable: !requiredFields.has(colName),
        isPrimaryKey: colName === "id",
        isArray,
        description: prop.description,
      };
    },
  );

  return {
    name,
    columns,
    description: def.description,
  };
}

function parseRPCFromPath(
  path: string,
  pathItem: PathItem,
  spec: OpenAPISpec,
): RPCSchema | undefined {
  const postOp = pathItem.post;
  if (!postOp) return undefined;

  const rpcName = path.replace("/rpc/", "");
  const parameters: RPCParameter[] = [];

  for (const param of postOp.parameters ?? []) {
    if (param.in === "body" && param.schema) {
      const schema = param.schema.$ref
        ? resolveRef(param.schema.$ref, spec)
        : param.schema;

      if (schema?.properties) {
        const requiredParams = new Set(schema.required ?? []);
        for (const [paramName, paramDef] of Object.entries(schema.properties)) {
          const { type, format } = parsePropertyType(paramDef);
          parameters.push({
            name: paramName,
            type,
            format,
            required: requiredParams.has(paramName),
            description: paramDef.description,
          });
        }
      }
    }
  }

  let returnType = "unknown";
  let returnsArray = false;

  const response = postOp.responses?.["200"];
  if (response?.schema) {
    if (response.schema.type === "array") {
      returnsArray = true;
      returnType =
        response.schema.items?.$ref?.split("/").pop() ??
        response.schema.items?.type ??
        "unknown";
    } else if (response.schema.$ref) {
      returnType = response.schema.$ref.split("/").pop() ?? "unknown";
    } else {
      returnType = response.schema.type ?? "unknown";
    }
  }

  return {
    name: rpcName,
    parameters,
    returnType,
    returnsArray,
    description: postOp.description,
  };
}

export function parseOpenAPISpec(
  spec: OpenAPISpec,
  schemaName: string,
): DatabaseSchema {
  const tables: TableSchema[] = [];
  const views: TableSchema[] = [];
  const rpcs: RPCSchema[] = [];

  const tableNames = new Set<string>();
  for (const path of Object.keys(spec.paths)) {
    if (!path.startsWith("/rpc/") && path !== "/") {
      tableNames.add(path.slice(1));
    }
  }

  for (const tableName of tableNames) {
    const def =
      spec.definitions?.[tableName] ?? spec.components?.schemas?.[tableName];
    if (def) {
      tables.push(parseTableFromDefinition(tableName, def));
    } else {
      tables.push({ name: tableName, columns: [] });
    }
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (path.startsWith("/rpc/")) {
      const rpc = parseRPCFromPath(path, pathItem, spec);
      if (rpc) rpcs.push(rpc);
    }
  }

  return {
    name: schemaName,
    tables,
    views,
    rpcs,
  };
}

export async function fetchSchemaViaOpenAPI(
  client: SupabaseClient,
  schemaName: string,
): Promise<Result<DatabaseSchema>> {
  const specResult = await fetchOpenAPISpec(client, schemaName);
  if (!specResult.success) {
    return err(specResult.error);
  }

  return ok(parseOpenAPISpec(specResult.value, schemaName));
}
