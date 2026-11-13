import { describe, expect, it } from "@jest/globals";

import { bindByomRoute } from "@/lib/ai/byom-context";
import { createByomLanguageModel } from "@/lib/ai/byom-provider";
import { createTrackedProvider } from "@/lib/ai/providers";
import { calculateRawModelUsageCostDollars } from "@/lib/rate-limit/token-bucket";
import { calculateTokenCost } from "@/lib/rate-limit/token-bucket";
import { UsageTracker } from "@/lib/usage-tracker";
import { getRetryFallbackModel } from "@/lib/api/chat-stream-helpers";
import { resolveServedModelForCostAccounting } from "@/lib/api/chat-stream-helpers";
import { resolveInitialSubagentModel } from "@/lib/ai/subagents/model-routing";
import {
  HERMES_DIRECT_MODELS,
  normalizeOpenAIBaseURL,
  parseByomRequest,
  parseStoredByomRoute,
  toConnectionModel,
} from "@/lib/ai/byom";

describe("BYOM routing", () => {
  it("normalizes OpenAI-compatible base URLs and blocks metadata hosts", () => {
    expect(normalizeOpenAIBaseURL("http://127.0.0.1:11434")).toBe(
      "http://127.0.0.1:11434/v1",
    );
    expect(normalizeOpenAIBaseURL("https://api.openai.com/v1/")).toBe(
      "https://api.openai.com/v1",
    );
    expect(
      normalizeOpenAIBaseURL("https://host.example/v1/chat/completions"),
    ).toBe("https://host.example/v1");
    expect(normalizeOpenAIBaseURL("http://169.254.169.254/latest")).toBeNull();
    expect(normalizeOpenAIBaseURL("file:///etc/passwd")).toBeNull();
    expect(
      normalizeOpenAIBaseURL("http://user:pass@127.0.0.1:11434/v1"),
    ).toBeNull();
  });

  it("routes Ollama, Hermes, and Unsloth to their direct defaults", () => {
    const ollama = parseByomRequest(
      { modelId: "qwen2.5-coder" },
      "byom-ollama",
    );
    expect(ollama).toEqual({
      ok: true,
      route: {
        kind: "ollama",
        modelId: "qwen2.5-coder",
        baseURL: "http://127.0.0.1:11434/v1",
        apiKey: "ollama",
      },
    });

    const hermes = parseByomRequest(
      { modelId: HERMES_DIRECT_MODELS[1].id, apiKey: "nous-test" },
      "byom-hermes",
    );
    expect(hermes.ok).toBe(true);
    if (hermes.ok) {
      expect(hermes.route.baseURL).toBe(
        "https://inference-api.nousresearch.com/v1",
      );
      expect(hermes.route.modelId).toBe("Hermes-4-70B");
      expect(hermes.route.apiKey).toBe("nous-test");
    }

    const unsloth = parseByomRequest(undefined, "byom-unsloth");
    expect(unsloth.ok).toBe(true);
    if (unsloth.ok) {
      expect(unsloth.route).toMatchObject({
        kind: "unsloth",
        modelId: "default",
        baseURL: "http://127.0.0.1:8888/v1",
      });
    }
  });

  it("requires a base URL for arbitrary endpoints and a key for Hermes", () => {
    expect(parseByomRequest({ modelId: "gpt-4.1" }, "byom-openai")).toEqual({
      ok: false,
      error: "OpenAI-compatible routing needs a base URL.",
    });
    expect(
      parseByomRequest({ modelId: "Hermes-4-70B" }, "byom-hermes"),
    ).toEqual({
      ok: false,
      error:
        "Hermes routing needs an API key (request or HERMES_API_KEY or NOUS_API_KEY).",
    });
    expect(
      parseByomRequest(
        { kind: "ollama", baseURL: "https://example.com/v1", modelId: "x" },
        "byom-openai",
      ).ok,
    ).toBe(false);
  });

  it("keeps a stored route and rejects a tampered one", () => {
    const stored = parseStoredByomRoute({
      kind: "openai-compatible",
      baseURL: "https://router.example/v1",
      modelId: "org/model",
      apiKey: "secret",
    });
    expect(stored.ok).toBe(true);
    expect(parseStoredByomRoute({ kind: "hermes", modelId: ".." }).ok).toBe(
      false,
    );
  });

  it("builds a language model for the requested id and does not bill hosted rates", () => {
    const parsed = parseByomRequest(
      {
        baseURL: "https://llm.example/v1",
        modelId: "custom-model",
        apiKey: "sk-test",
      },
      "byom-openai",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(createByomLanguageModel(parsed.route).modelId).toBe("custom-model");
    bindByomRoute(parsed.route);
    expect(createTrackedProvider().languageModel("byom-openai").modelId).toBe(
      "custom-model",
    );
    expect(
      createTrackedProvider().languageModel("model-grok-4.6").modelId,
    ).toBe("x-ai/grok-4.6");
    expect(
      calculateRawModelUsageCostDollars({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        modelName: "byom-openai",
      }),
    ).toBe(0);
    expect(calculateTokenCost(1_000_000, "output", "byom-ollama")).toBe(0);
    expect(getRetryFallbackModel("byom-hermes", "agent", "byom-hermes")).toBe(
      "byom-hermes",
    );
    expect(
      resolveServedModelForCostAccounting({
        modelName: "byom-unsloth",
        responseModel: "default",
      }),
    ).toBe("byom-unsloth");
    const tracker = new UsageTracker();
    tracker.accumulateStep(
      { inputTokens: 1_000, outputTokens: 50, raw: { cost: 4 } },
      "byom-openai",
    );
    tracker.nonModelCost += 0.25;
    expect(tracker.computeCostDollars("byom-openai")).toBe(0.25);
  });

  it("routes OpenRouter and vLLM without using a hosted HackerAI tier", () => {
    const openrouter = parseByomRequest(
      { apiKey: "or-test" },
      "byom-openrouter",
    );
    expect(openrouter).toEqual({
      ok: true,
      route: {
        kind: "openrouter",
        modelId: "openrouter/auto",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: "or-test",
      },
    });
    expect(parseByomRequest(undefined, "byom-openrouter").ok).toBe(false);
    const vllm = parseByomRequest({ modelId: "org/model" }, "byom-vllm");
    expect(vllm.ok).toBe(true);
    if (vllm.ok) {
      expect(vllm.route.baseURL).toBe("http://127.0.0.1:8000/v1");
      expect(vllm.route.modelId).toBe("org/model");
    }
    expect(toConnectionModel("hackerai-max")).toBe("byom-openrouter");
    expect(toConnectionModel("byom-vllm")).toBe("byom-vllm");
  });

  it("keeps delegated agent calls on the parent BYOM route", () => {
    expect(
      resolveInitialSubagentModel({
        capabilities: ["browser_qa"],
        complexity: "high",
        expectedDurationMinutes: 20,
        outputKind: "qa_report",
        subscription: "pro",
        parentModel: "byom-hermes",
      }),
    ).toBe("byom-hermes");
  });
});
