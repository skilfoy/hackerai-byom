import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import {
  BYOM_PROVIDER_KINDS,
  parseByomRequest,
  selectedModelForByomKind,
  type ByomProviderKind,
  type ByomRoute,
} from "@/lib/ai/byom";
import type { ByomSelectedModel } from "@/types/chat";

export const createByomLanguageModel = (route: ByomRoute) => {
  const provider = createOpenAICompatible({
    name: `hackerai-${route.kind}`,
    baseURL: route.baseURL,
    apiKey: route.apiKey,
    includeUsage: true,
  });
  return provider(route.modelId);
};

/** Static registry entries so provider lookup never throws before a request override. */
export const createDefaultByomLanguageModels = () => {
  const models = {} as Record<
    ByomSelectedModel,
    ReturnType<typeof createByomLanguageModel>
  >;
  for (const kind of BYOM_PROVIDER_KINDS) {
    const selected = selectedModelForByomKind(kind);
    const parsed = parseByomRequest(undefined, selected);
    const route: ByomRoute = parsed.ok
      ? parsed.route
      : {
          kind: kind as ByomProviderKind,
          modelId: "unset",
          baseURL: "https://example.invalid/v1",
          apiKey: "unused",
        };
    models[selected] = createByomLanguageModel(route);
  }
  return models;
};
