import type { SupabaseClient } from "@supabase/supabase-js";
import type { Result } from "../types/result.types";
import { err, ok } from "../types/result.types";
import type {
  ColumnType,
  DatabaseSchema,
  RPCSchema,
  TableSchema,
} from "../types/schema.types";

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        kind
        description
        fields {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }
        inputFields {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

type GraphQLType = {
  name: string | null;
  kind: string;
  ofType?: GraphQLType | null;
};

type GraphQLField = {
  name: string;
  description?: string;
  type: GraphQLType;
};

type GraphQLInputField = {
  name: string;
  description?: string;
  type: GraphQLType;
};

type GraphQLTypeDef = {
  name: string;
  kind: string;
  description?: string;
  fields?: GraphQLField[];
  inputFields?: GraphQLInputField[];
};

type IntrospectionResult = {
  data?: {
    __schema: {
      types: GraphQLTypeDef[];
    };
  };
  errors?: Array<{ message: string }>;
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

export async function fetchGraphQLIntrospection(
  client: SupabaseClient,
): Promise<Result<IntrospectionResult>> {
  const { url, key } = extractClientInfo(client);
  const res = await fetch(`${url}/graphql/v1`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  });

  if (!res.ok) {
    return err(new Error(`GraphQL introspection failed: ${res.status}`));
  }

  const result = (await res.json()) as IntrospectionResult;
  if (result.errors?.length && result.errors[0]) {
    return err(new Error(result.errors[0].message));
  }

  return ok(result);
}

function unwrapType(type: GraphQLType): {
  name: string;
  isArray: boolean;
  nullable: boolean;
} {
  let current: GraphQLType | null | undefined = type;
  let isArray = false;
  let nullable = true;

  while (current) {
    if (current.kind === "NON_NULL") {
      nullable = false;
      current = current.ofType;
    } else if (current.kind === "LIST") {
      isArray = true;
      current = current.ofType;
    } else {
      return {
        name: current.name ?? "unknown",
        isArray,
        nullable,
      };
    }
  }

  return { name: "unknown", isArray, nullable };
}

function isTableType(typeDef: GraphQLTypeDef): boolean {
  if (typeDef.kind !== "OBJECT") return false;
  if (!typeDef.name) return false;
  if (typeDef.name.startsWith("__")) return false;
  if (typeDef.name.endsWith("Connection")) return false;
  if (typeDef.name.endsWith("Edge")) return false;
  if (typeDef.name.endsWith("Aggregate")) return false;
  if (typeDef.name.endsWith("OrderBy")) return false;
  if (typeDef.name.endsWith("Filter")) return false;
  if (typeDef.name.endsWith("InsertInput")) return false;
  if (typeDef.name.endsWith("UpdateInput")) return false;
  if (typeDef.name.endsWith("InsertResponse")) return false;
  if (typeDef.name.endsWith("UpdateResponse")) return false;
  if (typeDef.name.endsWith("DeleteResponse")) return false;
  if (
    ["Query", "Mutation", "Subscription", "PageInfo", "Node"].includes(
      typeDef.name,
    )
  )
    return false;
  return true;
}

function parseTableFromType(typeDef: GraphQLTypeDef): TableSchema {
  const columns: ColumnType[] = (typeDef.fields ?? [])
    .filter((f) => !f.name.startsWith("__"))
    .filter((f) => !f.name.endsWith("Collection"))
    .map((field) => {
      const { name, isArray, nullable } = unwrapType(field.type);
      return {
        name: field.name,
        type: name,
        nullable,
        isPrimaryKey: field.name === "id" || field.name === "nodeId",
        isArray,
        description: field.description,
      };
    });

  return {
    name: typeDef.name,
    columns,
    description: typeDef.description,
  };
}

function extractRPCsFromMutation(types: GraphQLTypeDef[]): RPCSchema[] {
  const mutation = types.find((t) => t.name === "Mutation");
  if (!mutation?.fields) return [];

  return mutation.fields
    .filter((f) => !f.name.startsWith("insert"))
    .filter((f) => !f.name.startsWith("update"))
    .filter((f) => !f.name.startsWith("delete"))
    .map((field) => {
      const { name: returnType, isArray } = unwrapType(field.type);
      return {
        name: field.name,
        parameters: [],
        returnType,
        returnsArray: isArray,
        description: field.description,
      };
    });
}

export function parseGraphQLIntrospection(
  result: IntrospectionResult,
  schemaName: string,
): DatabaseSchema {
  const types = result.data?.__schema.types ?? [];

  const tables: TableSchema[] = types
    .filter(isTableType)
    .map(parseTableFromType);

  const rpcs = extractRPCsFromMutation(types);

  return {
    name: schemaName,
    tables,
    views: [],
    rpcs,
  };
}

export async function fetchSchemaViaGraphQL(
  client: SupabaseClient,
  schemaName: string,
): Promise<Result<DatabaseSchema>> {
  const introspectionResult = await fetchGraphQLIntrospection(client);
  if (!introspectionResult.success) {
    return err(introspectionResult.error);
  }

  return ok(parseGraphQLIntrospection(introspectionResult.value, schemaName));
}
