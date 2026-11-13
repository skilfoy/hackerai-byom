<p align="center">
  <a href="https://hackerai.co/">
    <img src="public/icon-512x512.png" width="150" alt="HackerAI Logo">
  </a>
</p>

<h1 align="center">HackerAI</h1>

<h2 align="center">Your AI-Powered Penetration Testing Assistant</h2>

<p align="center">
  <strong>BYOM fork:</strong> hosted HackerAI tiers, plus any OpenAI-compatible endpoint, local Ollama, and direct Hermes and Unsloth routing.
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
- [OpenAI](https://platform.openai.com/) - Identifies security requests that should use [abliteration.ai](https://abliteration.ai/) models
- [E2B](https://e2b.dev/) - Isolated cloud execution in Agent mode
- [Convex](https://www.convex.dev/) - Database and backend
- [Amazon S3](https://aws.amazon.com/s3/) - File storage
- [WorkOS](https://workos.com/) - Authentication and user management
- [Trigger.dev](https://trigger.dev/) - Required durable runtime for agent tasks

**Optional:**

- [abliteration.ai](https://abliteration.ai/) - AI models for security requests that standard models may refuse
- [Perplexity](https://perplexity.ai/) - Web search functionality
- [Jina AI](https://jina.ai/reader) - Web URL content retrieval
- [Redis](https://redis.io/) - Stream resumption
- [Upstash Redis](https://upstash.com/) - Rate limiting
- [PostHog](https://posthog.com/) - Analytics
- [Stripe](https://stripe.com/) - Payment processing

### Bring your own model

The model selector can send Ask, Agent, and delegated subagents to an endpoint you control. Hosted Auto, Standard, Pro, and Max stay on OpenRouter.

| Route             | Default endpoint                            | What it calls                                                                                                            |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| OpenAI-compatible | The base URL you enter                      | `POST {base}/chat/completions`                                                                                           |
| Ollama            | `http://127.0.0.1:11434/v1`                 | Local Ollama's OpenAI shim                                                                                               |
| Hermes            | `https://inference-api.nousresearch.com/v1` | Nous Portal directly. Defaults include Hermes 4.3 36B, Hermes 4 70B, and Hermes 4 405B. Other Portal model ids work too. |
| Unsloth           | `http://127.0.0.1:8888/v1`                  | Unsloth Studio, not OpenRouter. `default` uses the model loaded in Studio.                                               |

API keys typed in the selector stay in browser storage and are sent only with the chat request. Server env fallbacks are `BYOM_OPENAI_*`, `OLLAMA_*`, `HERMES_API_KEY` or `NOUS_API_KEY`, and `UNSLOTH_*`.

`localhost` is the machine running the HackerAI server. It reaches Ollama or Unsloth during local dev, or through a tunnel. A cloud Agent worker cannot open your laptop's loopback address. Hermes is a public API, so it works from cloud runs when the key is set.

BYOM token use is not billed at HackerAI hosted rates. You pay the endpoint you configured. Sandbox and other non-model costs still apply.

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

To use abliteration.ai for eligible security requests, create an API key in the
[abliteration.ai console](https://abliteration.ai/console) and set
`ABLITERATION_API_KEY` in `.env.local`, Vercel, and Trigger.dev. Without this
optional key, HackerAI continues using its standard models.

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
   (`ABLITERATION_API_KEY`, `PERPLEXITY_API_KEY`, `JINA_API_KEY`, etc.).
3. Start the worker in a third terminal:

   ```bash
   pnpm dev:trigger
   ```

   This starts the default Trigger.dev worker used by local Agent requests.
   To start an explicitly routed Trigger.dev branch instead, set a stable
   branch name with
   `TRIGGER_DEV_BRANCH=my-local-agent pnpm dev:trigger`. Only use that override
   when the request path is configured to target the same Trigger.dev branch.
