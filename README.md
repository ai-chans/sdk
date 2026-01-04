<div align="center">

# Chans SDK

**Add real-time voice AI to your applications**

[![npm version](https://img.shields.io/npm/v/@ai-chans/sdk-js.svg)](https://www.npmjs.com/package/@ai-chans/sdk-js)
[![GitHub Actions](https://github.com/ai-chans/sdk/actions/workflows/publish.yml/badge.svg)](https://github.com/ai-chans/sdk/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[Documentation](https://docs.chans.ai) · [Dashboard](https://chans.ai) · [Examples](#examples)

</div>

---

## Overview

The Chans SDK enables real-time voice conversations with AI agents in your web applications. Connect users to voice-powered AI with just a few lines of code.

**Packages:**

| Package | Description |
|---------|-------------|
| [`@ai-chans/sdk-js`](./sdk-js) | Core JavaScript/TypeScript client |
| [`@ai-chans/sdk-react`](./sdk-react) | React components and hooks |

## Installation

```bash
# JavaScript/TypeScript
npm install @ai-chans/sdk-js

# React
npm install @ai-chans/sdk-react
```

## Quick Start

### JavaScript/TypeScript

```typescript
import { ChansClient } from "@ai-chans/sdk-js"

const client = new ChansClient({
  agentToken: "agt_your_token"  // From chans.ai dashboard
})

client.on("transcript", (text) => console.log("User:", text))
client.on("response", (text) => console.log("Agent:", text))

await client.connect()
```

### React

```tsx
import { ChansVoice } from "@ai-chans/sdk-react"

function App() {
  return (
    <ChansVoice
      agentToken="agt_your_token"
      onTranscript={(text) => console.log("User:", text)}
      onResponse={(text) => console.log("Agent:", text)}
    />
  )
}
```

Or build your own UI:

```tsx
<ChansVoice agentToken="agt_xxx" autoConnect={false}>
  {({ state, connect, disconnect, isConnected }) => (
    <button onClick={isConnected ? disconnect : connect}>
      {state === "listening" ? "Listening..." : "Start"}
    </button>
  )}
</ChansVoice>
```

## Features

- **Real-time voice** — Bidirectional audio streaming with AI agents
- **Transcription events** — Get user speech as text in real-time
- **Response events** — Receive agent responses as they're spoken
- **State management** — Track connection and conversation states
- **TypeScript** — Full type definitions included
- **Framework agnostic** — Core client works anywhere, React wrapper for convenience

## Connection States

| State | Description |
|-------|-------------|
| `idle` | Not connected |
| `connecting` | Establishing connection |
| `connected` | Connected, ready |
| `listening` | Actively listening to user |
| `speaking` | Agent is speaking |
| `error` | Connection error |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `stateChange` | `ChansState` | Connection state changed |
| `transcript` | `string` | User speech transcribed |
| `response` | `string` | Agent response text |
| `connected` | — | Successfully connected |
| `disconnected` | — | Disconnected |
| `error` | `Error` | An error occurred |

## Examples

See the [sdk-js README](./sdk-js/README.md) and [sdk-react README](./sdk-react/README.md) for detailed API documentation and more examples.

## Requirements

- Browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone access permission
- Agent token from [chans.ai](https://chans.ai) dashboard

## Self-Hosted

Point to your own chans.ai instance:

```typescript
const client = new ChansClient({
  agentToken: "agt_xxx",
  apiUrl: "https://your-instance.com"
})
```

## Development

```bash
pnpm install
pnpm build
pnpm test              # Unit tests (mocked, no external deps)
pnpm test:coverage     # With coverage report
```

### Integration Tests

Tests SDK against a running API instance to verify the contract:

```bash
# Requires core API at localhost:8080
CHANS_TEST_AGENT_TOKEN=agt_xxx pnpm test:integration
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 — see [LICENSE](./LICENSE)
