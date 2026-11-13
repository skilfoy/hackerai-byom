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

export const AGENT_MODEL_OPTIONS: ModelOption[] = [
  {
    id: "hackerai-standard",
    label: "HackerAI Standard",
    description: "Reliable agent for everyday automation",
    poweredBy: "DeepSeek V4.1 Flash 1017 · High reasoning",
    thinking: true,
  },
  {
    id: "hackerai-pro",
    label: "HackerAI Pro",
    description: "Superior performance for most assignments",
    poweredBy: "DeepSeek V4.1 Flash 1017 · Max reasoning",
    thinking: true,
  },
  {
    id: "hackerai-max",
    label: "HackerAI Max",
    description: "Maximum intelligence for complex work",
    thinking: true,
  },
];

export const BYOM_MODEL_OPTIONS: Array<
  ModelOption & { id: ByomSelectedModel }
> = [
  {
    id: "byom-openai",
    label: "OpenAI-compatible",
    description: "Any chat-completions endpoint",
    poweredBy: "Your base URL and model id",
  },
  {
    id: "byom-ollama",
    label: "Ollama",
    description: "Local Ollama on this computer or a reachable host",
    poweredBy: "http://127.0.0.1:11434/v1",
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
    description: "Unsloth Studio's OpenAI-compatible server",
    poweredBy: "http://127.0.0.1:8888/v1",
  },
];

export const byomOptionLabel = (id: ByomSelectedModel): string =>
  BYOM_MODEL_OPTIONS.find((option) => option.id === id)?.label ?? "Custom";
