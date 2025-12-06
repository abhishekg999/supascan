import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export const generateTempFilePath = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(tmpdir(), `supascan-${timestamp}.html`);
};

export const writeHtmlFile = (filePath: string, content: string): void => {
  writeFileSync(filePath, content, "utf8");
};
