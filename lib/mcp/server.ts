import type { HackerAiClient } from "./client";
import { HACKERAI_MCP_TOOLS, hackerAiToolByName } from "./tools";

type Rpc = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

const PROTOCOL = "2024-11-05";

const error = (id: unknown, code: number, message: string) => ({
  jsonrpc: "2.0" as const,
  id: id ?? null,
  error: { code, message },
});

const result = (id: unknown, value: unknown) => ({
  jsonrpc: "2.0" as const,
  id,
  result: value,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const dispatchMcp = async (
  message: unknown,
  client: HackerAiClient,
): Promise<Record<string, unknown> | null> => {
  if (!isRecord(message)) return error(null, -32600, "Invalid request.");
  const rpc = message as Rpc;
  if (rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") {
    return error(rpc.id, -32600, "Invalid request.");
  }
  if (rpc.id === undefined) return null;

  if (rpc.method === "initialize") {
    return result(rpc.id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: "hackerai", version: "0.1.0" },
    });
  }
  if (rpc.method === "ping") return result(rpc.id, {});
  if (rpc.method === "tools/list") {
    return result(rpc.id, {
      tools: HACKERAI_MCP_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
  }
  if (rpc.method === "tools/call") {
    const params = isRecord(rpc.params) ? rpc.params : {};
    const name = typeof params.name === "string" ? params.name : "";
    const tool = hackerAiToolByName(name);
    if (!tool) {
      return result(rpc.id, {
        content: [{ type: "text", text: `Unknown tool ${name}.` }],
        isError: true,
      });
    }
    const args = isRecord(params.arguments) ? params.arguments : {};
    const called = await tool.call(client, args);
    const failed = called.status === 0 || called.status >= 400;
    return result(rpc.id, {
      content: [
        {
          type: "text",
          text: called.timedOut
            ? called.body
            : `HTTP ${called.status}\n${called.body}`,
        },
      ],
      isError: failed,
    });
  }
  return error(rpc.id, -32601, `Unknown method ${rpc.method}.`);
};
