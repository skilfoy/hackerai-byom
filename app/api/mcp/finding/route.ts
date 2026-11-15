import { NextRequest } from "next/server";

import { mcpError, readFinding } from "@/lib/mcp/engagement-read";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    return await readFinding(req);
  } catch (error) {
    return mcpError(error);
  }
}
