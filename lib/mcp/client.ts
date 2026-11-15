type FetchLike = (
  input: URL,
  init?: RequestInit,
) => Promise<{ status: number; text: () => Promise<string> }>;

export type HackerAiCallResult = {
  status: number;
  body: string;
  timedOut?: boolean;
};

export type HackerAiClient = {
  request: (
    path: string,
    init?: { method?: string; body?: unknown },
  ) => Promise<HackerAiCallResult>;
};

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);
const BODY_LIMIT = 16_000;

export const assertLocalHackerAiBaseUrl = (
  baseUrl: string,
  allowRemote: boolean,
): string => {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("HACKERAI_BASE_URL is not a URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("HACKERAI_BASE_URL must be http or https.");
  }
  if (url.username || url.password) {
    throw new Error("HACKERAI_BASE_URL cannot contain credentials.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!allowRemote && !LOOPBACK.has(host)) {
    throw new Error(
      "HACKERAI_BASE_URL must be loopback unless HACKERAI_MCP_ALLOW_REMOTE=1.",
    );
  }
  return url.origin;
};

export const createHackerAiClient = ({
  baseUrl,
  cookie,
  authorization,
  allowRemote = false,
  fetchImpl: fetchImplOption,
  timeoutMs = 20_000,
}: {
  baseUrl: string;
  cookie?: string;
  authorization?: string;
  allowRemote?: boolean;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): HackerAiClient => {
  const origin = assertLocalHackerAiBaseUrl(baseUrl, allowRemote);
  const fetchImpl = fetchImplOption ?? fetch;
  return {
    async request(path, init) {
      const headers: Record<string, string> = { accept: "application/json" };
      if (cookie) headers.cookie = cookie;
      if (authorization) headers.authorization = authorization;
      if (init?.body !== undefined)
        headers["content-type"] = "application/json";
      try {
        const response = await fetchImpl(new URL(path, origin), {
          method: init?.method ?? "GET",
          headers,
          body:
            init?.body === undefined ? undefined : JSON.stringify(init.body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const body = (await response.text()).slice(0, BODY_LIMIT);
        return { status: response.status, body };
      } catch (error) {
        const timedOut =
          error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError");
        return {
          status: 0,
          timedOut,
          body: timedOut
            ? "The HackerAI request timed out. Poll get_run or get_transcript with the chat id."
            : "HackerAI did not respond. Is it running on this machine?",
        };
      }
    },
  };
};

export const sessionCookieHeader = (
  value: string | undefined,
): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.includes("=") ? trimmed : `wos-session=${trimmed}`;
};

export const createHackerAiClientFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): HackerAiClient =>
  createHackerAiClient({
    baseUrl: env.HACKERAI_BASE_URL?.trim() || "http://127.0.0.1:3000",
    cookie:
      sessionCookieHeader(env.HACKERAI_COOKIE) ??
      sessionCookieHeader(env.HACKERAI_SESSION_COOKIE),
    authorization: env.HACKERAI_AUTHORIZATION?.trim() || undefined,
    allowRemote: env.HACKERAI_MCP_ALLOW_REMOTE === "1",
  });
