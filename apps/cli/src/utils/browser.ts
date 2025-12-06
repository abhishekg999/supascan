import { spawn } from "child_process";

export const openInBrowser = (filePath: string): void => {
  const platform = process.platform;
  let command: string;
  let args: string[];

  if (process.env.BROWSER) {
    command = process.env.BROWSER;
    args = [filePath];
  } else {
    switch (platform) {
      case "darwin":
        command = "open";
        args = [filePath];
        break;
      case "win32":
        command = "start";
        args = [filePath];
        break;
      default:
        command = "xdg-open";
        args = [filePath];
        break;
    }
  }

  spawn(command, args, { detached: true, stdio: "ignore" });
};
