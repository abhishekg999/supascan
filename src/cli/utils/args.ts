export const parseRPCArgs = (argsString: string): Record<string, any> => {
  try {
    const processedString = argsString.replace(
      /\$([A-Z_][A-Z0-9_]*)/g,
      (match, varName) => {
        const envValue = process.env[varName];
        if (envValue === undefined) {
          throw new Error(`Environment variable ${varName} not found`);
        }
        return JSON.stringify(envValue);
      },
    );

    return JSON.parse(processedString);
  } catch (error) {
    throw new Error(
      `Failed to parse RPC arguments: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

export const parseHeaders = (headers: string[]): Record<string, string> => {
  const parsedHeaders: Record<string, string> = {};

  for (const header of headers) {
    const colonIndex = header.indexOf(":");
    if (colonIndex === -1) {
      throw new Error(
        `Invalid header format: "${header}". Expected format: "Header-Name: value"`,
      );
    }

    const name = header.slice(0, colonIndex).trim();
    const value = header.slice(colonIndex + 1).trim();

    if (!name) {
      throw new Error(
        `Invalid header format: "${header}". Header name cannot be empty`,
      );
    }

    parsedHeaders[name] = value;
  }

  return parsedHeaders;
};
