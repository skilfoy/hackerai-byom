"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import {
  BYOM_PROVIDER_DEFAULTS,
  HERMES_DIRECT_MODELS,
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
    () => ({
      "openai-compatible": readByomDraft("openai-compatible"),
      ollama: readByomDraft("ollama"),
      hermes: readByomDraft("hermes"),
      unsloth: readByomDraft("unsloth"),
    }),
  );

  const update = (kind: ByomProviderKind, patch: Partial<ByomDraft>) => {
    setDrafts((current) => {
      const next = { ...current, [kind]: { ...current[kind], ...patch } };
      writeByomDraft(kind, next[kind]);
      return next;
    });
  };

  return (
    <div className="mt-1 border-t border-border/50 pt-1.5">
      <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Bring your own model
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
                      kind === "hermes" ? "hermes-direct-models" : undefined
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
                <label className="block text-[11px] text-muted-foreground">
                  API key
                  <input
                    className={`${fieldClass} mt-0.5`}
                    type="password"
                    autoComplete="off"
                    value={draft.apiKey}
                    placeholder={
                      defaults.apiKeyRequired
                        ? "Required, or set HERMES_API_KEY"
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
