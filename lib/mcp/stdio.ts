import { createInterface } from "node:readline";

import { createHackerAiClientFromEnv } from "./client";
import { dispatchMcp } from "./server";

const invokedDirectly = process.argv[1]?.endsWith("stdio.ts") === true;

export const serveHackerAiMcp = async (): Promise<void> => {
  const client = createHackerAiClientFromEnv();
  const lines = createInterface({ input: process.stdin, terminal: false });
  let chain = Promise.resolve();
  lines.on("line", (line) => {
    chain = chain.then(async () => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let message: unknown;
      try {
        message = JSON.parse(trimmed);
      } catch {
        process.stderr.write(
          "hackerai-mcp: ignored a line that was not JSON\n",
        );
        return;
      }
      const response = await dispatchMcp(message, client);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    });
  });
  await new Promise<void>((resolve) => {
    lines.on("close", () => {
      void chain.then(() => resolve());
    });
  });
};

if (invokedDirectly) {
  serveHackerAiMcp().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "hackerai-mcp failed"}\n`,
    );
    process.exitCode = 1;
  });
}
