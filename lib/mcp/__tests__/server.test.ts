import { describe, expect, it, jest } from "@jest/globals";

import { createHackerAiClient } from "@/lib/mcp/client";
import { HACKERAI_MCP_TOOLS } from "@/lib/mcp/tools";
import { dispatchMcp } from "@/lib/mcp/server";

type FetchLike = (
  input: URL,
  init?: RequestInit,
) => Promise<{ status: number; text: () => Promise<string> }>;

const clientFor = (fetchImpl: FetchLike) =>
  createHackerAiClient({
    baseUrl: "http://127.0.0.1:3000",
    cookie: "wos-session=sealed",
    fetchImpl,
  });

describe("HackerAI MCP", () => {
  it("lists ten tools and rejects a public base URL", () => {
    expect(HACKERAI_MCP_TOOLS).toHaveLength(10);
    expect(HACKERAI_MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "start_engagement",
      "ask",
      "get_run",
      "continue_run",
      "decide_approval",
      "cancel_run",
      "get_engagement",
      "list_findings",
      "get_finding",
      "get_transcript",
    ]);
    expect(() =>
      createHackerAiClient({ baseUrl: "https://hackerai.co" }),
    ).toThrow(/loopback/);
  });

  it("starts an engagement on the local agent route", async () => {
    const fetchImpl = jest.fn<FetchLike>(async () => ({
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    }));
    const response = await dispatchMcp(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "start_engagement",
          arguments: { prompt: "Check the staging login" },
        },
      },
      clientFor(fetchImpl),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:3000/api/agent");
    expect(init?.headers).toMatchObject({ cookie: "wos-session=sealed" });
    const body = JSON.parse(String(init?.body));
    expect(body.selectedModel).toBe("byom-hermes-local");
    expect(body.agentPermissionMode).toBe("ask_approval");
    expect(body.messages[0].parts[0].text).toBe("Check the staging login");
    expect(response).toMatchObject({
      id: 1,
      result: { isError: false },
    });
  });

  it("does not answer notifications and reports an unknown tool", async () => {
    const client = clientFor(jest.fn<FetchLike>());
    expect(
      await dispatchMcp(
        { jsonrpc: "2.0", method: "notifications/initialized" },
        client,
      ),
    ).toBeNull();
    const listed = await dispatchMcp(
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      client,
    );
    expect(listed).toMatchObject({
      result: { tools: expect.any(Array) },
    });
    const missing = await dispatchMcp(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "shell", arguments: {} },
      },
      client,
    );
    expect(missing).toMatchObject({ result: { isError: true } });
  });
});
