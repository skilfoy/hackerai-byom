"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import {
  BYOM_PROVIDER_DEFAULTS,
  BYOM_PROVIDER_KINDS,
  HERMES_DIRECT_MODELS,
  OPENROUTER_DIRECT_MODELS,
  byomKindForSelectedModel,
  type ByomProviderKind,
} from "@/lib/ai/byom";
import type { ByomSelectedModel, SelectedModel } from "@/types/chat";
import { isByomSelectedModel } from "@/types/chat";
import {
  readByomDraft,
  writeByomDraft,
  type ByomDraft,
} from "@/lib/ai/byom-client";
import { BYOM_MODEL_OPTIONS } from "./constants";

const fieldClass =
  "w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ByomSection({
  value,
  onSelect,
  onClose,
}: {
  value: SelectedModel;
  onSelect: (model: ByomSelectedModel) => void;
  onClose: () => void;
}) {
  const active = isByomSelectedModel(value) ? value : null;
  const [drafts, setDrafts] = useState<Record<ByomProviderKind, ByomDraft>>(
    () =>
      Object.fromEntries(
        BYOM_PROVIDER_KINDS.map((kind) => [kind, readByomDraft(kind)]),
      ) as Record<ByomProviderKind, ByomDraft>,
  );

  const update = (kind: ByomProviderKind, patch: Partial<ByomDraft>) => {
    setDrafts((current) => {
      const next = { ...current, [kind]: { ...current[kind], ...patch } };
      writeByomDraft(kind, next[kind]);
      return next;
    });
  };

  return (
    <div className="pt-0.5">
      <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Connections
      </p>
      {BYOM_MODEL_OPTIONS.map((option) => {
        const kind = byomKindForSelectedModel(option.id);
        const selected = active === option.id;
        const draft = drafts[kind];
        const defaults = BYOM_PROVIDER_DEFAULTS[kind];
        return (
          <div key={option.id} className="mb-0.5">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                selected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted active:bg-muted"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground leading-snug">
                  {option.description}
                </span>
              </span>
              {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
            {selected ? (
              <div className="space-y-1.5 px-2.5 pb-2 pt-1">
                <label className="block text-[11px] text-muted-foreground">
                  Base URL
                  <input
                    className={`${fieldClass} mt-0.5`}
                    value={draft.baseURL}
                    placeholder={defaults.baseURL || "https://host/v1"}
                    spellCheck={false}
                    onChange={(event) =>
                      update(kind, { baseURL: event.target.value })
                    }
                  />
                </label>
                <label className="block text-[11px] text-muted-foreground">
                  Model id
                  <input
                    className={`${fieldClass} mt-0.5`}
                    value={draft.modelId}
                    list={
                      kind === "hermes"
                        ? "hermes-direct-models"
                        : kind === "openrouter"
                          ? "openrouter-direct-models"
                          : undefined
                    }
                    placeholder={defaults.modelId || "provider/model"}
                    spellCheck={false}
                    onChange={(event) =>
                      update(kind, { modelId: event.target.value })
                    }
                  />
                </label>
                {kind === "hermes" ? (
                  <datalist id="hermes-direct-models">
                    {HERMES_DIRECT_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </datalist>
                ) : null}
                {kind === "openrouter" ? (
                  <datalist id="openrouter-direct-models">
                    {OPENROUTER_DIRECT_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </datalist>
                ) : null}
                <label className="block text-[11px] text-muted-foreground">
                  API key
                  <input
                    className={`${fieldClass} mt-0.5`}
                    type="password"
                    autoComplete="off"
                    value={draft.apiKey}
                    placeholder={
                      defaults.apiKeyRequired
                        ? `Required, or set ${defaults.envApiKey}`
                        : "Optional"
                    }
                    onChange={(event) =>
                      update(kind, { apiKey: event.target.value })
                    }
                  />
                </label>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  The key stays in this browser and is sent only with the chat
                  request. Localhost works when HackerAI is running on this
                  computer. Cloud runs need a URL the server can reach.
                </p>
                {kind === "vllm" ? (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Serve with{" "}
                    <span className="font-mono">
                      vllm serve {"<model>"} --host 0.0.0.0 --port 8000
                      --enable-prefix-caching
                    </span>
                    . The model id is the name vLLM loaded. Docker image{" "}
                    <span className="font-mono">vllm/vllm-openai</span>,
                    Kubernetes, Ray Serve, Runpod port 8000, and Modal all
                    expose the same <span className="font-mono">/v1</span> API.
                    Quantization (FP8, AWQ, GPTQ, bitsandbytes) is a server
                    flag, not a chat setting.
                  </p>
                ) : null}
                {kind === "unsloth" ? (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Studio serves the loaded model as{" "}
                    <span className="font-mono">default</span> through
                    llama.cpp. For speed and quality, load an Unsloth Dynamic
                    GGUF (UD-Q4_K_XL, UD-Q5_K_XL, UD-Q8_K_XL) or an NVFP4/FP8
                    build. Export with{" "}
                    <span className="font-mono">
                      {
                        'save_pretrained_gguf(..., quantization_method="q4_k_m" | "q5_k_m" | "q8_0" | "f16")'
                      }
                    </span>
                    . Use the vLLM connection when you want GPU prefix caching
                    on those weights.
                  </p>
                ) : null}
                <button
                  type="button"
                  className="text-xs font-medium text-foreground underline underline-offset-2 cursor-pointer"
                  onClick={onClose}
                >
                  Use this model
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
