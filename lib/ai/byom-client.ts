"use client";

import {
  BYOM_PROVIDER_DEFAULTS,
  byomKindForSelectedModel,
  type ByomProviderKind,
  type ByomRoute,
} from "@/lib/ai/byom";
import { isByomSelectedModel } from "@/types/chat";

const STORAGE_KEY = "hackerai_byom_routes_v1";

export type ByomDraft = {
  baseURL: string;
  modelId: string;
  apiKey: string;
};

const emptyDraft = (kind: ByomProviderKind): ByomDraft => {
  const defaults = BYOM_PROVIDER_DEFAULTS[kind];
  return {
    baseURL: defaults.baseURL,
    modelId: defaults.modelId,
    apiKey: "",
  };
};

const readAll = (): Partial<Record<ByomProviderKind, ByomDraft>> => {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const readByomDraft = (kind: ByomProviderKind): ByomDraft => {
  const fallback = emptyDraft(kind);
  const saved = readAll()[kind];
  if (!saved || typeof saved !== "object") return fallback;
  return {
    baseURL:
      typeof saved.baseURL === "string" && saved.baseURL.trim()
        ? saved.baseURL
        : fallback.baseURL,
    modelId:
      typeof saved.modelId === "string" && saved.modelId.trim()
        ? saved.modelId
        : fallback.modelId,
    apiKey: typeof saved.apiKey === "string" ? saved.apiKey : "",
  };
};

export const writeByomDraft = (
  kind: ByomProviderKind,
  draft: ByomDraft,
): void => {
  if (typeof window === "undefined") return;
  try {
    const all = readAll();
    all[kind] = draft;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore quota and private-mode failures. The in-memory form still works.
  }
};

/** Attach the saved route when the outgoing request selected a BYOM tier. */
export const byomRequestForSelectedModel = (
  selected: unknown,
):
  | (Pick<ByomRoute, "kind" | "modelId" | "baseURL"> & { apiKey?: string })
  | undefined => {
  const model = typeof selected === "string" ? selected : null;
  if (!isByomSelectedModel(model)) {
    return undefined;
  }
  const kind = byomKindForSelectedModel(model);
  const draft = readByomDraft(kind);
  return {
    kind,
    baseURL: draft.baseURL,
    modelId: draft.modelId,
    ...(draft.apiKey.trim() ? { apiKey: draft.apiKey.trim() } : {}),
  };
};
