# LATTICE — Agent Identity Graph Protocol

An autonomous AI agent that starts with **zero connections** and dynamically discovers, acquires, and orchestrates authenticated access to external services at runtime through **Auth0 Token Vault**.

## The Concept

Traditional AI agents are pre-configured with API keys and service connections. LATTICE flips this model: the agent starts with an empty identity graph and builds it in real-time as it works.

Give the agent a goal like _"Why did our deployment fail?"_ and watch it:

1. **Discover** it needs GitHub → requests Token Vault connection → user approves
2. **Read** CI logs → realizes it needs monitoring data → requests that token
3. **Correlate** with Slack conversations → requests Slack access
4. **Act** — files an issue, pings the team, updates the tracker

Each step dynamically acquires new identity edges. The agent's identity lattice grows as it works.

## Key Features

- **Dynamic Token Acquisition** — Agent discovers needed services at runtime, not configuration time
- **Real-Time Identity Graph** — Live canvas visualization of the expanding token lattice
- **Token Lifecycle Tracking** — Watch tokens being minted, used, refreshed, and revoked
- **Multi-Service Chaining** — Agent crosses service boundaries to complete complex goals
- **Consent-Driven** — Users approve each new connection; agent operates within granted boundaries

## Token Vault Features Demonstrated

| Feature | How LATTICE Uses It |
|---------|-------------------|
| **OAuth Token Exchange** | Every service connection uses Token Vault's federated token exchange |
| **Async Authentication** | Agent requests access; user approves when ready |
| **Consent Delegation** | Each connection is scoped — user controls what the agent can do |
| **Token Lifecycle** | Tokens acquired, cached, refreshed, and displayed in real-time |

## Supported Services

- **GitHub** — Repos, issues, PRs, CI/CD workflows
- **Google Calendar** — Events, availability, scheduling
- **Gmail** — Email search, communications context
- **Google Drive** — Documents, spreadsheets, shared files
- **Slack** — Channels, messages, team communications

## Tech Stack

- **Next.js 16** — App router, server components
- **Auth0 Token Vault** (`@auth0/ai`, `@auth0/ai-vercel`) — Identity layer
- **Vercel AI SDK** — Streaming chat with tool calling
- **OpenAI GPT-4o** — Agent reasoning
- **Framer Motion** — UI animations
- **Canvas API** — Real-time identity graph visualization

## Setup

### Prerequisites

- Node.js 18+
- Auth0 account with Token Vault enabled
- OpenAI API key
- Social connections configured in Auth0 (GitHub, Google, Slack)

### Environment Variables

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=a-random-32-byte-hex-string
APP_BASE_URL=http://localhost:3000
OPENAI_API_KEY=your-openai-key
```

### Auth0 Configuration

1. Create a Regular Web Application in Auth0
2. Enable Token Vault in your Auth0 tenant
3. Configure social connections:
   - **GitHub** — Enable with `repo`, `read:user`, `read:org` scopes
   - **Google** — Enable with Calendar, Gmail, Drive scopes
   - **Slack** — Enable with `channels:read`, `channels:history`, `chat:write` scopes
4. Set callback URLs:
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`

### Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and click **Launch Agent**.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │   Chat Interface  │  │ Identity Graph   │ │
│  │   (React + AI SDK)│  │ (Canvas + Motion)│ │
│  └────────┬─────────┘  └──────────────────┘ │
└───────────┼─────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────┐
│           │        Next.js Server            │
│  ┌────────▼─────────┐                       │
│  │  /api/chat        │                       │
│  │  (Stream + Tools) │                       │
│  └────────┬─────────┘                       │
│           │                                  │
│  ┌────────▼─────────────────────────────┐   │
│  │  Auth0 Token Vault Authorizers        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐   │   │
│  │  │ GitHub │ │ Google │ │ Slack  │   │   │
│  │  └───┬────┘ └───┬────┘ └───┬────┘   │   │
│  └──────┼──────────┼──────────┼─────────┘   │
└─────────┼──────────┼──────────┼─────────────┘
          │          │          │
    ┌─────▼──┐ ┌────▼───┐ ┌──▼─────┐
    │ GitHub │ │ Google │ │ Slack  │
    │  API   │ │  APIs  │ │  API   │
    └────────┘ └────────┘ └────────┘
```

## License

MIT
