<p align="center">
  <a href="https://hackerai.co/">
    <img src="public/icon-512x512.png" width="150" alt="HackerAI Logo">
  </a>
</p>

<h1 align="center">HackerAI</h1>

<h2 align="center">Your AI-Powered Penetration Testing Assistant</h2>

<p align="center">
  <strong>BYOM fork:</strong> OpenRouter, any OpenAI-compatible endpoint, local Ollama, vLLM, and direct Hermes and Unsloth routing. Hosted Auto, Standard, Pro, and Max are not offered.
</p>

<div align="center">

[![License](https://img.shields.io/badge/License-Apache%202.0%20with%20Commercial%20Restrictions-red.svg)](LICENSE)
[![Website](https://img.shields.io/badge/Website-hackerai.co-2d3748.svg)](https://hackerai.co)

</div>

## Getting started

Coding agents should start with [AGENTS.md](AGENTS.md).

### Prerequisites

You'll need the following accounts:

**Required:**

- [OpenRouter](https://openrouter.ai/) - AI model provider
- [OpenAI](https://platform.openai.com/) - Identifies security requests that should use the [Inference.net](https://inference.net/) security model
- [E2B](https://e2b.dev/) - Isolated cloud execution in Agent mode
- [Convex](https://www.convex.dev/) - Database and backend
- [Amazon S3](https://aws.amazon.com/s3/) - File storage
- [WorkOS](https://workos.com/) - Authentication and user management
- [Trigger.dev](https://trigger.dev/) - Required durable runtime for agent tasks

**Optional:**

- [Inference.net](https://inference.net/) - Security-tuned model for requests that standard models may refuse
- [Perplexity](https://perplexity.ai/) - Web search functionality
- [Jina AI](https://jina.ai/reader) - Web URL content retrieval
- [Redis](https://redis.io/) - Stream resumption
- [Upstash Redis](https://upstash.com/) - Rate limiting
- [PostHog](https://posthog.com/) - Analytics
- [Stripe](https://stripe.com/) - Payment processing

### Bring your own model

The model selector sends Ask, Agent, and delegated subagents to a connection you configure. Saved Auto, Standard, Pro, and Max choices migrate to the OpenRouter connection. They are not selectable.

| Route             | Default endpoint                            | What it calls                                                                                                                                                              |
| ----------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenRouter        | `https://openrouter.ai/api/v1`              | Your OpenRouter key. Default model `openrouter/auto`. This replaces hosted Auto.                                                                                           |
| OpenAI-compatible | The base URL you enter                      | `POST {base}/chat/completions`                                                                                                                                             |
| Ollama            | `http://127.0.0.1:11434/v1`                 | Local Ollama's OpenAI shim                                                                                                                                                 |
| vLLM              | `http://127.0.0.1:8000/v1`                  | A vLLM OpenAI server. The model id is the weights vLLM loaded.                                                                                                             |
| Hermes            | `https://inference-api.nousresearch.com/v1` | Nous Portal directly. Defaults include Hermes 4.3 36B, Hermes 4 70B, and Hermes 4 405B. Other Portal model ids work too.                                                   |
| Hermes Local      | `http://127.0.0.1:8080/v1`                  | llama.cpp managed by Hermes Agent. No Portal account or key. Set the model id to the name Hermes loaded. Port 8081 is the usual port when you start llama-server yourself. |
| Unsloth           | `http://127.0.0.1:8888/v1`                  | Unsloth Studio, not OpenRouter. `default` uses the model loaded in Studio.                                                                                                 |

API keys typed in the selector stay in browser storage and are sent only with the chat request. Server env fallbacks are `OPENROUTER_*`, `BYOM_OPENAI_*`, `OLLAMA_*`, `VLLM_*`, `HERMES_API_KEY` or `NOUS_API_KEY`, `HERMES_LOCAL_*`, and `UNSLOTH_*`.

`localhost` is the machine running the HackerAI server. It reaches Ollama, vLLM, Hermes Local, or Unsloth during local dev, or through a tunnel. A cloud Agent worker cannot open your laptop's loopback address. OpenRouter and Nous Portal are public APIs, so they work from cloud runs when the key is set.

BYOM token use is not billed at HackerAI hosted rates. You pay the endpoint you configured. Sandbox and other non-model costs still apply.

#### Hermes Agent calling HackerAI

Hermes Local above is only the model server. To let a local Hermes Agent use HackerAI, run HackerAI on this machine, sign in, and start the MCP server from this repo:

```bash
HACKERAI_BASE_URL=http://127.0.0.1:3000 \
HACKERAI_SESSION_COOKIE='<wos-session cookie value>' \
pnpm mcp
```

The server speaks MCP over stdio and refuses a non-loopback HackerAI URL unless `HACKERAI_MCP_ALLOW_REMOTE=1`. Add it to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  hackerai:
    command: pnpm
    args: ["mcp"]
    cwd: /path/to/hackerai-byom
    env:
      HACKERAI_BASE_URL: http://127.0.0.1:3000
      HACKERAI_SESSION_COOKIE: "<wos-session cookie value>"
```

The ten tools are `start_engagement`, `ask`, `get_run`, `continue_run`, `decide_approval`, `cancel_run`, `get_engagement`, `list_findings`, `get_finding`, and `get_transcript`. Engagements start on Hermes Local with ask-approval. They do not grant Hermes a raw shell inside HackerAI.

#### vLLM

Serve an OpenAI-compatible endpoint and point the vLLM connection at it:

```bash
vllm serve Qwen/Qwen3-8B --host 0.0.0.0 --port 8000 --enable-prefix-caching
```

The same `/v1` API is what these deployments expose:

- Docker image `vllm/vllm-openai`, publishing port 8000
- Kubernetes, or Ray Serve in front of the same server
- Runpod: expose port 8000 and use `https://{POD_ID}-8000.proxy.runpod.net/v1`
- Modal: a web endpoint that wraps `vllm serve` and returns the public `/v1` URL

Quantization is a server flag (`--quantization fp8`, `awq`, `gptq`, or `bitsandbytes`), not a chat setting. Prefix caching belongs on this connection. The model id in the selector must match the name vLLM loaded.

#### Unsloth inference

Unsloth Studio serves the loaded model as `default` on port 8888 through llama.cpp. Do not send a quant id as the Studio model id. Pick the weights when you load or export:

- Dynamic GGUF: `UD-Q4_K_XL` (fast), `UD-Q5_K_XL` (balance), `UD-Q8_K_XL` (higher quality)
- GPU: NVFP4 or FP8 builds when the card supports them
- Export: `save_pretrained_gguf(..., quantization_method="q4_k_m" | "q5_k_m" | "q8_0" | "f16")`

Use the vLLM connection, not Studio, when you want GPU prefix caching on those weights.

### Clone the repo

```bash
git clone https://github.com/skilfoy/hackerai-byom.git
```

### Navigate to the project directory

```bash
cd hackerai-byom
```

### Install dependencies

```bash
pnpm install
```

`pnpm build` generates Next.js route types and checks them with TypeScript 7
before compilation. TypeScript 6 remains installed as `typescript` for ESLint,
`ts-node`, Convex tooling, and `pnpm typecheck`. The native compiler is pinned
separately as `typescript-build`; build scripts resolve it explicitly rather
than relying on the shared `tsc` executable name. Use `pnpm typecheck` for the
TypeScript 6 check; package aliases can expose the same `tsc` command. Vercel
Preview retains its existing separate CI typecheck. Running `next build` directly retains Next's
built-in TypeScript 6 check.

### Run the setup script

```bash
pnpm run setup
```

To use the Inference.net security model for eligible security requests, set
`INFERENCE_API_KEY` in `.env.local`, Vercel, and Trigger.dev and enable the
`inference_cyber_v1` PostHog flag. Without both, those requests use the selected
model with HackerAI's usual authorization context. Every model provider must
use zero data retention.

### Start the development server

This runs both Next.js and Convex dev servers:

```bash
pnpm run dev
```

Or run them separately in two terminals:

```bash
pnpm run dev:next
pnpm run dev:convex
```

### Run the Trigger.dev worker

Agent mode runs the agent loop on a [Trigger.dev](https://trigger.dev/) task.
To use the agent locally:

1. Create a project at https://cloud.trigger.dev and copy your **dev** secret
   key (`tr_dev_…`) into `.env.local` as `TRIGGER_SECRET_KEY`.
2. In the Trigger.dev dashboard → your project → **Environment Variables**,
   add the env vars the task needs to run (these live on the worker, not on
   Vercel): `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_SERVICE_ROLE_KEY`,
   `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `AWS_S3_ACCESS_KEY_ID`,
   `AWS_S3_SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_S3_BUCKET_NAME`, and
   `E2B_API_KEY`. Cloud Agent execution uses E2B.
   Add any optional keys you use
   (`INFERENCE_API_KEY`, `PERPLEXITY_API_KEY`, `JINA_API_KEY`, etc.).
3. Start the worker in a third terminal:

   ```bash
   pnpm dev:trigger
   ```

   This starts the default Trigger.dev worker used by local Agent requests.
   To start an explicitly routed Trigger.dev branch instead, set a stable
   branch name with
   `TRIGGER_DEV_BRANCH=my-local-agent pnpm dev:trigger`. Only use that override
   when the request path is configured to target the same Trigger.dev branch.
