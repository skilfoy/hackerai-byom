import { describe, it, expect } from "@jest/globals";
import { AGENT_MODEL_OPTIONS, BYOM_MODEL_OPTIONS } from "../constants";
import { myProvider, resolveAgentTierToProviderKey } from "@/lib/ai/providers";

/** Hosted tiers stay registered for internal routing, but the selector only offers connections. */
describe("ModelSelector tier provider drift", () => {
  it("does not offer hosted Auto, Standard, Pro, or Max", () => {
    expect(AGENT_MODEL_OPTIONS).toEqual([]);
  });

  it("every connection resolves to its own registered provider", () => {
    for (const option of BYOM_MODEL_OPTIONS) {
      expect(option.description).toBeTruthy();
      const providerKey = resolveAgentTierToProviderKey(option.id);
      expect(providerKey).toBe(option.id);
      expect(() => myProvider.languageModel(providerKey)).not.toThrow();
    }
  });

  it.each([
    ["hackerai-standard", "model-deepseek-v4.1-flash-1017-pro"],
    ["hackerai-pro", "model-deepseek-v4.1-flash-1017-pro"],
    ["hackerai-max", "model-grok-4.6"],
  ] as const)("keeps the internal Agent provider for %s", (tier, model) => {
    expect(resolveAgentTierToProviderKey(tier)).toBe(model);
  });

  it("leaves Auto routing to the caller", () => {
    expect(resolveAgentTierToProviderKey("auto")).toBeNull();
  });
});
