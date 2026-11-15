import { NextRequest } from "next/server";

import {
  engagementSummary,
  mcpError,
  requireOwnedChat,
} from "@/lib/mcp/engagement-read";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const owned = await requireOwnedChat(req);
    if ("error" in owned) return owned.error;
    return Response.json(engagementSummary(owned.chat), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return mcpError(error);
  }
}
