# @ai-chans/sdk-react

React hooks and components for [chans.ai](https://chans.ai) voice AI.

## Installation

```bash
npm install @ai-chans/sdk-react
```

Requires React 18+.

## Quick Start

### useVoiceAgent Hook

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

### ChansVoice Component

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

## Documentation

For full API reference, examples, and guides, visit [docs.chans.ai](https://docs.chans.ai).

## License

Apache 2.0
