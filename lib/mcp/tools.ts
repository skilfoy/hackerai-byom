import { randomUUID } from "node:crypto";

import type { HackerAiCallResult, HackerAiClient } from "./client";

type ToolArgs = Record<string, unknown>;

export type McpTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
  };
  call: (client: HackerAiClient, args: ToolArgs) => Promise<HackerAiCallResult>;
};

const text = (name: string, description: string) => ({
  type: "string",
  description,
});

const requiredString = (args: ToolArgs, key: string): string | null => {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const userMessage = (prompt: string) => ({
  id: randomUUID(),
  role: "user",
  parts: [{ type: "text", text: prompt }],
});

const missing = (field: string): HackerAiCallResult => ({
  status: 400,
  body: `${field} is required.`,
});

export const HACKERAI_MCP_TOOLS: readonly McpTool[] = [
  {
    name: "start_engagement",
    description:
      "Start a HackerAI Agent engagement. Returns a chat id. Agent runs are asynchronous; poll get_run. Defaults to the local Hermes model and ask-approval permission.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["prompt"],
      properties: {
        prompt: text("prompt", "What HackerAI should do."),
        chatId: text("chatId", "Optional id. One is generated when omitted."),
        selectedModel: text(
          "selectedModel",
          "Connection id. Defaults to byom-hermes-local.",
        ),
        permissionMode: text(
          "permissionMode",
          "ask_approval, auto_review, or full_access. Defaults to ask_approval.",
        ),
        sandboxPreference: text(
          "sandboxPreference",
          "Optional sandbox id, or e2b for the cloud sandbox.",
        ),
      },
    },
    async call(client, args) {
      const prompt = requiredString(args, "prompt");
      if (!prompt) return missing("prompt");
      const chatId = requiredString(args, "chatId") ?? randomUUID();
      const permission =
        requiredString(args, "permissionMode") ?? "ask_approval";
      const result = await client.request("/api/agent", {
        method: "POST",
        body: {
          chatId,
          messages: [userMessage(prompt)],
          selectedModel:
            requiredString(args, "selectedModel") ?? "byom-hermes-local",
          agentPermissionMode: permission,
          ...(requiredString(args, "sandboxPreference")
            ? { sandboxPreference: requiredString(args, "sandboxPreference") }
            : {}),
        },
      });
      return {
        ...result,
        body: JSON.stringify({ chatId, response: result.body }),
      };
    },
  },
  {
    name: "ask",
    description:
      "Send one Ask-mode question. The call returns after 20 seconds even if the answer is still streaming; then use get_transcript.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["prompt"],
      properties: {
        prompt: text("prompt", "The question."),
        chatId: text("chatId", "Optional id. One is generated when omitted."),
        selectedModel: text(
          "selectedModel",
          "Connection id. Defaults to byom-hermes-local.",
        ),
      },
    },
    async call(client, args) {
      const prompt = requiredString(args, "prompt");
      if (!prompt) return missing("prompt");
      const chatId = requiredString(args, "chatId") ?? randomUUID();
      const result = await client.request("/api/chat", {
        method: "POST",
        body: {
          chatId,
          mode: "ask",
          messages: [userMessage(prompt)],
          selectedModel:
            requiredString(args, "selectedModel") ?? "byom-hermes-local",
        },
      });
      return {
        ...result,
        body: JSON.stringify({ chatId, response: result.body }),
      };
    },
  },
  {
    name: "get_run",
    description: "Read the status of an Agent run.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chatId"],
      properties: {
        chatId: text("chatId", "Engagement id."),
        runId: text("runId", "Trigger run id, when you have it."),
      },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      if (!chatId) return Promise.resolve(missing("chatId"));
      return client.request("/api/agent/status", {
        method: "POST",
        body: {
          chatId,
          ...(requiredString(args, "runId")
            ? { runId: requiredString(args, "runId") }
            : {}),
        },
      });
    },
  },
  {
    name: "continue_run",
    description:
      "Answer a question the Agent asked in the middle of a run. This is not the shell-approval decision.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chatId", "runId", "toolCallId", "text"],
      properties: {
        chatId: text("chatId", "Engagement id."),
        runId: text("runId", "Trigger run id."),
        toolCallId: text("toolCallId", "Tool call that is waiting."),
        text: text("text", "The reply."),
      },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      const runId = requiredString(args, "runId");
      const toolCallId = requiredString(args, "toolCallId");
      const reply = requiredString(args, "text");
      if (!chatId || !runId || !toolCallId || !reply) {
        return Promise.resolve(missing("chatId, runId, toolCallId, and text"));
      }
      return client.request("/api/agent/reply", {
        method: "POST",
        body: { chatId, runId, toolCallId, text: reply },
      });
    },
  },
  {
    name: "decide_approval",
    description:
      "Approve or deny a pending HackerAI tool action. Default grant is a single target, not full access.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: [
        "chatId",
        "approvalSessionId",
        "partId",
        "approvalId",
        "toolCallId",
        "decision",
      ],
      properties: {
        chatId: text("chatId", "Engagement id."),
        approvalSessionId: text("approvalSessionId", "Approval session id."),
        partId: text("partId", "Message part id for the approval."),
        approvalId: text("approvalId", "Approval id."),
        toolCallId: text("toolCallId", "Tool call id."),
        decision: text("decision", "approve or deny."),
        grant: text(
          "grant",
          "target_prefix or full_access. Defaults to target_prefix.",
        ),
        targetPrefix: text(
          "targetPrefix",
          "Required when grant is target_prefix.",
        ),
        targetKind: text(
          "targetKind",
          "terminal_command, terminal_interaction, or file_change.",
        ),
        message: text("message", "Optional note shown with the decision."),
      },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      const approvalSessionId = requiredString(args, "approvalSessionId");
      const partId = requiredString(args, "partId");
      const approvalId = requiredString(args, "approvalId");
      const toolCallId = requiredString(args, "toolCallId");
      const decision = requiredString(args, "decision");
      if (
        !chatId ||
        !approvalSessionId ||
        !partId ||
        !approvalId ||
        !toolCallId ||
        (decision !== "approve" && decision !== "deny")
      ) {
        return Promise.resolve(
          missing("approval fields, with decision approve or deny"),
        );
      }
      const grant = requiredString(args, "grant") ?? "target_prefix";
      return client.request("/api/agent/approval", {
        method: "POST",
        body: {
          chatId,
          approvalSessionId,
          partId,
          value: {
            type: "agent-tool-approval",
            approvalId,
            toolCallId,
            decision,
            grant,
            ...(requiredString(args, "targetPrefix")
              ? { targetPrefix: requiredString(args, "targetPrefix") }
              : {}),
            ...(requiredString(args, "targetKind")
              ? { targetKind: requiredString(args, "targetKind") }
              : {}),
            ...(requiredString(args, "message")
              ? { message: requiredString(args, "message") }
              : {}),
          },
        },
      });
    },
  },
  {
    name: "cancel_run",
    description: "Cancel the active Agent run for an engagement.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chatId"],
      properties: {
        chatId: text("chatId", "Engagement id."),
        runId: text("runId", "Expected Trigger run id, when you have it."),
      },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      if (!chatId) return Promise.resolve(missing("chatId"));
      return client.request("/api/agent/cancel", {
        method: "POST",
        body: {
          chatId,
          ...(requiredString(args, "runId")
            ? { expectedTriggerRunId: requiredString(args, "runId") }
            : {}),
        },
      });
    },
  },
  {
    name: "get_engagement",
    description: "Read the title and run state of one engagement.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chatId"],
      properties: { chatId: text("chatId", "Engagement id.") },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      if (!chatId) return Promise.resolve(missing("chatId"));
      return client.request(
        `/api/mcp/engagement?chatId=${encodeURIComponent(chatId)}`,
      );
    },
  },
  {
    name: "list_findings",
    description: "List findings recorded for one engagement.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chatId"],
      properties: {
        chatId: text("chatId", "Engagement id."),
        cursor: text("cursor", "next_cursor from the previous page."),
        search: text("search", "Optional search text."),
        status: text("status", "active or closed."),
      },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      if (!chatId) return Promise.resolve(missing("chatId"));
      const query = new URLSearchParams({ chatId });
      const cursor = requiredString(args, "cursor");
      const search = requiredString(args, "search");
      const status = requiredString(args, "status");
      if (cursor) query.set("cursor", cursor);
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      return client.request(`/api/mcp/findings?${query.toString()}`);
    },
  },
  {
    name: "get_finding",
    description: "Read one finding, including its evidence summary.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chatId", "findingId"],
      properties: {
        chatId: text("chatId", "Engagement id."),
        findingId: text("findingId", "Finding id."),
      },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      const findingId = requiredString(args, "findingId");
      if (!chatId || !findingId)
        return Promise.resolve(missing("chatId and findingId"));
      const query = new URLSearchParams({ chatId, findingId });
      return client.request(`/api/mcp/finding?${query.toString()}`);
    },
  },
  {
    name: "get_transcript",
    description:
      "Read the newest text messages in an engagement. Tool payloads are omitted.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["chatId"],
      properties: { chatId: text("chatId", "Engagement id.") },
    },
    call(client, args) {
      const chatId = requiredString(args, "chatId");
      if (!chatId) return Promise.resolve(missing("chatId"));
      return client.request(
        `/api/mcp/transcript?chatId=${encodeURIComponent(chatId)}`,
      );
    },
  },
];

export const hackerAiToolByName = (name: string): McpTool | undefined =>
  HACKERAI_MCP_TOOLS.find((tool) => tool.name === name);
