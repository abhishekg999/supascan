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
