import { useCallback, useState } from "react";
import type { AsyncState, SupabaseClient } from "../types";

type QueryOperation = "select" | "insert" | "update" | "delete";

interface QueryParams {
  operation: QueryOperation;
  columns?: string;
  limit?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  data?: Record<string, unknown>;
  filter?: string;
}

export function useTableQuery(
  client: SupabaseClient | null,
  schema: string,
  table: string,
) {
  const [state, setState] = useState<AsyncState<Record<string, unknown>[]>>({
    status: "idle",
  });

  const execute = useCallback(
    async (params: QueryParams) => {
      if (!client) {
        setState({
          status: "error",
          error: new Error("Supabase client not initialized"),
        });
        return;
      }

      setState({ status: "loading" });

      try {
        const tableRef = client.schema(schema).from(table);
        const {
          operation,
          columns = "*",
          limit,
          orderBy,
          orderDir,
          data,
          filter,
        } = params;

        switch (operation) {
          case "select": {
            let query = tableRef.select(columns);
            if (limit && limit > 0) query = query.limit(limit);
            if (orderBy)
              query = query.order(orderBy, { ascending: orderDir !== "desc" });

            const { data: resultData, error } = await query;

            if (error) throw new Error(error.message);

            const data = Array.isArray(resultData)
              ? resultData.map((row) =>
                  row && typeof row === "object" && !Array.isArray(row)
                    ? Object.assign({}, row)
                    : {},
                )
              : [];
            setState({ status: "success", data });
            return data;
          }
          case "insert": {
            if (!data) throw new Error("Data required for insert");

            const { data: resultData, error } = await tableRef
              .insert(data)
              .select();

            if (error) throw new Error(error.message);

            const insertedData = Array.isArray(resultData)
              ? resultData.map((row) =>
                  row && typeof row === "object" && !Array.isArray(row)
                    ? Object.assign({}, row)
                    : {},
                )
              : [];
            setState({ status: "success", data: insertedData });
            return insertedData;
          }
          case "update": {
            if (!data) throw new Error("Data required for update");

            let updateQuery = tableRef.update(data);
            if (filter) {
              const [col, op, val] = filter.split(" ", 3);
              if (col && op === "=" && val) {
                updateQuery = updateQuery.eq(col, val.replace(/['"]/g, ""));
              }
            }

            const { data: resultData, error } = await updateQuery.select();

            if (error) throw new Error(error.message);

            const updatedData = Array.isArray(resultData)
              ? resultData.map((row) =>
                  row && typeof row === "object" && !Array.isArray(row)
                    ? Object.assign({}, row)
                    : {},
                )
              : [];
            setState({ status: "success", data: updatedData });
            return updatedData;
          }
          case "delete": {
            let deleteQuery = tableRef.delete();
            if (filter) {
              const [col, op, val] = filter.split(" ", 3);
              if (col && op === "=" && val) {
                deleteQuery = deleteQuery.eq(col, val.replace(/['"]/g, ""));
              }
            }

            const { data: resultData, error } = await deleteQuery.select();

            if (error) throw new Error(error.message);

            const deletedData = Array.isArray(resultData)
              ? resultData.map((row) =>
                  row && typeof row === "object" && !Array.isArray(row)
                    ? Object.assign({}, row)
                    : {},
                )
              : [];
            setState({ status: "success", data: deletedData });
            return deletedData;
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ status: "error", error: err });
        throw err;
      }
    },
    [client, schema, table],
  );

  return { state, execute };
}
