import { NextRequest } from "next/server";

import { mcpError, readFindings } from "@/lib/mcp/engagement-read";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    return await readFindings(req);
  } catch (error) {
    return mcpError(error);
  }
}
