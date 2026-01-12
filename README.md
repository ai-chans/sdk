<div align="center">

# Chans SDK

**Add real-time voice AI to your applications**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[Documentation](https://docs.chans.ai) · [Dashboard](https://chans.ai)

</div>

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@ai-chans/sdk-js`](./sdk-js) | [![npm](https://img.shields.io/npm/v/@ai-chans/sdk-js.svg)](https://www.npmjs.com/package/@ai-chans/sdk-js) | Core JavaScript/TypeScript client |
| [`@ai-chans/sdk-react`](./sdk-react) | [![npm](https://img.shields.io/npm/v/@ai-chans/sdk-react.svg)](https://www.npmjs.com/package/@ai-chans/sdk-react) | React hooks and components |

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
  agentToken: "agt_your_token"
})

client.on("transcript", (text) => console.log("User:", text))
client.on("response", (text) => console.log("Agent:", text))

await client.connect()
```

### React

```tsx
import { useVoiceAgent } from "@ai-chans/sdk-react"

function App() {
  const { state, connect, disconnect } = useVoiceAgent({
    agentToken: "agt_your_token",
    onTranscript: (text) => console.log("User:", text),
    onResponse: (text) => console.log("Agent:", text),
  })

  return (
    <button onClick={state === "idle" ? connect : disconnect}>
      {state === "idle" ? "Start" : "Stop"}
    </button>
  )
}
```

## Documentation

For API reference, guides, and examples, visit [docs.chans.ai](https://docs.chans.ai).

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

Apache 2.0
