import type { RPCParameter } from "./supabase.types";

export type ColumnType = {
  name: string;
  type: string;
  format?: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isArray: boolean;
  description?: string;
};

export type TableSchema = {
  name: string;
  columns: ColumnType[];
  description?: string;
};

export type RPCSchema = {
  name: string;
  parameters: RPCParameter[];
  returnType: string;
  returnsArray: boolean;
  description?: string;
};

export type DatabaseSchema = {
  name: string;
  tables: TableSchema[];
  views: TableSchema[];
  rpcs: RPCSchema[];
};

export type IntrospectionMethod = "openapi" | "graphql";

export type IntrospectionResult = {
  method: IntrospectionMethod;
  schemas: DatabaseSchema[];
};
