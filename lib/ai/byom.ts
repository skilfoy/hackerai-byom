import type { ByomSelectedModel } from "@/types/chat";
import { isByomSelectedModel } from "@/types/chat";

/**
 * Bring-your-own-model routing.
 *
 * HackerAI's hosted tiers stay on OpenRouter. These routes skip that and call
 * an OpenAI-compatible chat-completions endpoint directly:
 *   - openai-compatible: any base URL the operator supplies
 *   - ollama: local Ollama's OpenAI shim
 *   - hermes: Nous Research inference (Hermes and the Portal catalog)
 *   - unsloth: Unsloth Studio / Unsloth's OpenAI-compatible server
 *
 * The server makes the HTTP call. localhost reaches Ollama or Unsloth only
 * when this process is on the same machine. Cloud runs need a reachable URL.
 */

export const BYOM_PROVIDER_KINDS = [
  "openai-compatible",
  "ollama",
  "hermes",
  "unsloth",
] as const;

export type ByomProviderKind = (typeof BYOM_PROVIDER_KINDS)[number];

export type ByomRoute = {
  kind: ByomProviderKind;
  modelId: string;
  baseURL: string;
  apiKey?: string;
};

export const HERMES_DIRECT_MODELS = [
  { id: "Hermes-4.3-36B", label: "Hermes 4.3 36B" },
  { id: "Hermes-4-70B", label: "Hermes 4 70B" },
  { id: "Hermes-4-405B", label: "Hermes 4 405B" },
] as const;

const SELECTED_MODEL_BY_KIND = {
  "openai-compatible": "byom-openai",
  ollama: "byom-ollama",
  hermes: "byom-hermes",
  unsloth: "byom-unsloth",
} as const satisfies Record<ByomProviderKind, ByomSelectedModel>;

const KIND_BY_SELECTED_MODEL: Record<ByomSelectedModel, ByomProviderKind> = {
  "byom-openai": "openai-compatible",
  "byom-ollama": "ollama",
  "byom-hermes": "hermes",
  "byom-unsloth": "unsloth",
};

type ProviderDefault = {
  baseURL: string;
  modelId: string;
  envBaseURL: string;
  envModel: string;
  envApiKey: string;
  altEnvApiKey?: string;
  /** Sent when the endpoint ignores auth, so the SDK still has a token. */
  placeholderApiKey: string;
  apiKeyRequired: boolean;
};

export const BYOM_PROVIDER_DEFAULTS: Record<ByomProviderKind, ProviderDefault> =
  {
    "openai-compatible": {
      baseURL: "",
      modelId: "",
      envBaseURL: "BYOM_OPENAI_BASE_URL",
      envModel: "BYOM_OPENAI_MODEL",
      envApiKey: "BYOM_OPENAI_API_KEY",
      placeholderApiKey: "unused",
      apiKeyRequired: false,
    },
    ollama: {
      baseURL: "http://127.0.0.1:11434/v1",
      modelId: "llama3.1",
      envBaseURL: "OLLAMA_BASE_URL",
      envModel: "OLLAMA_MODEL",
      envApiKey: "OLLAMA_API_KEY",
      placeholderApiKey: "ollama",
      apiKeyRequired: false,
    },
    hermes: {
      baseURL: "https://inference-api.nousresearch.com/v1",
      modelId: "Hermes-4-70B",
      envBaseURL: "HERMES_BASE_URL",
      envModel: "HERMES_MODEL",
      envApiKey: "HERMES_API_KEY",
      altEnvApiKey: "NOUS_API_KEY",
      placeholderApiKey: "",
      apiKeyRequired: true,
    },
    unsloth: {
      baseURL: "http://127.0.0.1:8888/v1",
      modelId: "default",
      envBaseURL: "UNSLOTH_BASE_URL",
      envModel: "UNSLOTH_MODEL",
      envApiKey: "UNSLOTH_API_KEY",
      placeholderApiKey: "unsloth",
      apiKeyRequired: false,
    },
  };

export const byomKindForSelectedModel = (
  model: ByomSelectedModel,
): ByomProviderKind => KIND_BY_SELECTED_MODEL[model];

export const selectedModelForByomKind = (
  kind: ByomProviderKind,
): ByomSelectedModel => SELECTED_MODEL_BY_KIND[kind];

export const isByomProviderKind = (value: unknown): value is ByomProviderKind =>
  typeof value === "string" &&
  (BYOM_PROVIDER_KINDS as readonly string[]).includes(value);

/** True for selector ids and any billing name that must not use hosted rates. */
export const isByomBillingModel = (modelName?: string): boolean => {
  if (!modelName) return false;
  return isByomSelectedModel(modelName) || modelName.startsWith("byom-");
};

const BLOCKED_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google.internal.",
]);

const isBlockedAddress = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  // Link-local, including cloud instance metadata.
  if (host.startsWith("169.254.")) return true;
  if (host === "fd00:ec2::254") return true;
  return false;
};

/**
 * Normalize an OpenAI-compatible base URL to origin + /v1.
 * Rejects non-HTTP schemes, embedded credentials, and metadata hosts.
 */
export const normalizeOpenAIBaseURL = (input: string): string | null => {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (isBlockedAddress(url.hostname)) return null;

  let path = url.pathname.replace(/\/+$/, "");
  path = path.replace(/\/chat\/completions$/, "");
  path = path.replace(/\/models$/, "");
  if (path === "" || path === "/") path = "/v1";
  else if (!path.endsWith("/v1")) path = `${path}/v1`;

  return `${url.origin}${path}`;
};

const MODEL_ID_PATTERN = /^[\w.\-/:@+]{1,256}$/;

export const isValidByomModelId = (modelId: string): boolean =>
  MODEL_ID_PATTERN.test(modelId) && !modelId.includes("..");

const nonEmpty = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readEnv = (name: string | undefined): string | undefined => {
  if (!name) return undefined;
  return nonEmpty(process.env[name]);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type ByomParseResult =
  { ok: true; route: ByomRoute } | { ok: false; error: string };

const finishRoute = (
  kind: ByomProviderKind,
  modelId: string | undefined,
  baseInput: string | undefined,
  apiKey: string | undefined,
): ByomParseResult => {
  const defaults = BYOM_PROVIDER_DEFAULTS[kind];
  if (!modelId || !isValidByomModelId(modelId)) {
    return {
      ok: false,
      error: "Bring-your-own model id is missing or invalid.",
    };
  }
  if (!baseInput) {
    return {
      ok: false,
      error:
        kind === "openai-compatible"
          ? "OpenAI-compatible routing needs a base URL."
          : "Bring-your-own routing needs a base URL.",
    };
  }
  const baseURL = normalizeOpenAIBaseURL(baseInput);
  if (!baseURL) {
    return {
      ok: false,
      error:
        "Base URL must be http or https and cannot target a metadata address.",
    };
  }
  const resolvedKey = apiKey || defaults.placeholderApiKey;
  if (defaults.apiKeyRequired && !resolvedKey) {
    return {
      ok: false,
      error: "Hermes routing needs an API key (request or HERMES_API_KEY).",
    };
  }
  return {
    ok: true,
    route: {
      kind,
      modelId,
      baseURL,
      ...(resolvedKey ? { apiKey: resolvedKey } : {}),
    },
  };
};

/** Resolve a selector choice plus the optional client/env override. */
export const parseByomRequest = (
  raw: unknown,
  selected: ByomSelectedModel,
): ByomParseResult => {
  const kind = byomKindForSelectedModel(selected);
  const defaults = BYOM_PROVIDER_DEFAULTS[kind];
  const body = isRecord(raw) ? raw : {};
  if (body.kind !== undefined && body.kind !== kind) {
    return {
      ok: false,
      error: "BYOM provider does not match the selected model.",
    };
  }
  return finishRoute(
    kind,
    nonEmpty(body.modelId) || readEnv(defaults.envModel) || defaults.modelId,
    nonEmpty(body.baseURL) ||
      readEnv(defaults.envBaseURL) ||
      defaults.baseURL ||
      undefined,
    nonEmpty(body.apiKey) ||
      readEnv(defaults.envApiKey) ||
      readEnv(defaults.altEnvApiKey),
  );
};

/** Re-validate a route already accepted on a previous hop (agent to subagent). */
export const parseStoredByomRoute = (raw: unknown): ByomParseResult => {
  if (!isRecord(raw) || !isByomProviderKind(raw.kind)) {
    return { ok: false, error: "Stored BYOM route is invalid." };
  }
  return finishRoute(
    raw.kind,
    nonEmpty(raw.modelId),
    nonEmpty(raw.baseURL),
    nonEmpty(raw.apiKey),
  );
};

export const redactByomRoute = (route: ByomRoute) => ({
  kind: route.kind,
  modelId: route.modelId,
  baseURL: route.baseURL,
  apiKey: route.apiKey ? "set" : "missing",
});
