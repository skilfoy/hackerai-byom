import type { ByomSelectedModel, SelectedModel } from "@/types/chat";

export interface ModelOption {
  id: SelectedModel;
  label: string;
  /** Short tagline shown in the hover popup (e.g. "Maximum intelligence for complex work") */
  description?: string;
  /** Models and reasoning shown beneath the description in the hover popup. */
  poweredBy?: string;
  thinking?: boolean;
}

export const AGENT_MODEL_OPTIONS: ModelOption[] = [];

export const BYOM_MODEL_OPTIONS: Array<
  ModelOption & { id: ByomSelectedModel }
> = [
  {
    id: "byom-openrouter",
    label: "OpenRouter",
    description: "Any OpenRouter model, including Auto",
    poweredBy: "https://openrouter.ai/api/v1",
  },
  {
    id: "byom-openai",
    label: "OpenAI-compatible",
    description: "Any other chat-completions endpoint",
    poweredBy: "Your base URL and model id",
  },
  {
    id: "byom-ollama",
    label: "Ollama",
    description: "Local Ollama on this computer or a reachable host",
    poweredBy: "http://127.0.0.1:11434/v1",
  },
  {
    id: "byom-vllm",
    label: "vLLM",
    description:
      "OpenAI server from vLLM, Docker, Kubernetes, Runpod, or Modal",
    poweredBy: "http://127.0.0.1:8000/v1",
  },
  {
    id: "byom-hermes",
    label: "Hermes",
    description: "Nous Portal, including Hermes 4, called directly",
    poweredBy: "inference-api.nousresearch.com",
  },
  {
    id: "byom-unsloth",
    label: "Unsloth",
    description: "Studio inference. Load a Dynamic GGUF or NVFP4/FP8 build",
    poweredBy: "http://127.0.0.1:8888/v1",
  },
];

export const byomOptionLabel = (id: ByomSelectedModel): string =>
  BYOM_MODEL_OPTIONS.find((option) => option.id === id)?.label ?? "Custom";
