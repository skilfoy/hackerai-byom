import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";
import { getUserID } from "@/lib/auth/get-user-id";
import { getConvexClient } from "@/lib/db/convex-client";
import { getChatById, getReport, listReports } from "@/lib/db/actions";
import { ChatSDKError } from "@/lib/errors";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export const mcpError = (error: unknown) => {
  if (error instanceof ChatSDKError) return error.toResponse();
  return json({ message: "HackerAI could not read that engagement." }, 503);
};

export const requireOwnedChat = async (req: NextRequest) => {
  const chatId = req.nextUrl.searchParams.get("chatId")?.trim() ?? "";
  if (!chatId || chatId.length > 200) {
    return { error: json({ message: "chatId is required." }, 400) };
  }
  const userId = await getUserID(req);
  const chat = await getChatById({ id: chatId });
  if (!chat || chat.user_id !== userId) {
    return { error: json({ message: "Engagement not found." }, 404) };
  }
  return { userId, chatId, chat };
};

const textFromParts = (
  parts: unknown,
): { text: string; otherParts: number } => {
  if (!Array.isArray(parts)) return { text: "", otherParts: 0 };
  const lines: string[] = [];
  let otherParts = 0;
  for (const part of parts) {
    if (
      part &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "text" &&
      typeof (part as { text?: unknown }).text === "string"
    ) {
      lines.push((part as { text: string }).text);
    } else {
      otherParts += 1;
    }
  }
  return { text: lines.join("\n").slice(0, 800), otherParts };
};

export const engagementSummary = (
  chat: NonNullable<Awaited<ReturnType<typeof getChatById>>>,
) => ({
  id: chat.id,
  title: chat.title,
  finishReason: chat.finish_reason ?? null,
  activeRunId: chat.active_trigger_run_id ?? null,
  canceledAt: chat.canceled_at ?? null,
});

export const readFindings = async (req: NextRequest) => {
  const owned = await requireOwnedChat(req);
  if ("error" in owned) return owned.error;
  const statusParam = req.nextUrl.searchParams.get("status");
  const status =
    statusParam === "active" || statusParam === "closed"
      ? statusParam
      : undefined;
  if (statusParam && !status) {
    return json({ message: "status must be active or closed." }, 400);
  }
  const search = req.nextUrl.searchParams.get("search")?.trim();
  const reports = await listReports({
    userId: owned.userId,
    chatId: owned.chatId,
    limit: 10,
    cursor: req.nextUrl.searchParams.get("cursor"),
    ...(search ? { search: search.slice(0, 200) } : {}),
    ...(status ? { status } : {}),
  });
  return json(reports);
};

export const readFinding = async (req: NextRequest) => {
  const owned = await requireOwnedChat(req);
  if ("error" in owned) return owned.error;
  const findingId = req.nextUrl.searchParams.get("findingId")?.trim() ?? "";
  if (!findingId || findingId.length > 128) {
    return json({ message: "findingId is required." }, 400);
  }
  return json(
    await getReport({
      userId: owned.userId,
      chatId: owned.chatId,
      findingId,
    }),
  );
};

export const readTranscript = async (req: NextRequest) => {
  const owned = await requireOwnedChat(req);
  if ("error" in owned) return owned.error;
  const serviceKey = process.env.CONVEX_SERVICE_ROLE_KEY;
  if (!serviceKey)
    return json({ message: "Chat history is not configured." }, 503);
  const page = await getConvexClient().query(
    api.messages.getMessagesPageForBackend,
    {
      serviceKey,
      userId: owned.userId,
      chatId: owned.chatId,
      paginationOpts: { cursor: null, numItems: 12 },
    },
  );
  return json({
    isDone: page.isDone,
    messages: page.page.map((message) => {
      const extracted = textFromParts(message.parts);
      return {
        id: message.id,
        role: message.role,
        text: extracted.text,
        otherParts: extracted.otherParts,
      };
    }),
  });
};
