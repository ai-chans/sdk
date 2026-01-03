# Chans SDK

Official JavaScript/TypeScript SDK for [chans.ai](https://chans.ai) - add real-time voice AI to your applications.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [chans-sdk-js](./client) | Core JavaScript client | [![npm](https://img.shields.io/npm/v/chans-sdk-js)](https://www.npmjs.com/package/chans-sdk-js) |
| [chans-sdk-react](./react) | React components & hooks | [![npm](https://img.shields.io/npm/v/chans-sdk-react)](https://www.npmjs.com/package/chans-sdk-react) |

## Quick Start

### JavaScript/TypeScript

```bash
npm install chans-sdk-js
```

```typescript
import { ChansClient } from "chans-sdk-js"

const client = new ChansClient({
  agentToken: "agt_your_token_here"  // From chans.ai dashboard
})

// Listen for events
client.on("transcript", (text) => console.log("User:", text))
client.on("response", (text) => console.log("Agent:", text))

// Connect to start voice session
await client.connect({ userId: "user-123" })

// Later: disconnect
await client.disconnect()
```

### React

```bash
npm install chans-sdk-react
```

```tsx
import { ChansVoice } from "chans-sdk-react"

function App() {
  return (
    <ChansVoice
      agentToken="agt_your_token_here"
      userId="user-123"
      onTranscript={(text) => console.log("User:", text)}
      onResponse={(text) => console.log("Agent:", text)}
    />
  )
}
```

Or with custom UI:

```tsx
<ChansVoice agentToken="agt_xxx">
  {({ state, connect, disconnect, isConnected }) => (
    <button onClick={isConnected ? disconnect : connect}>
      {state === "listening" ? "Listening..." : "Start Voice"}
    </button>
  )}
</ChansVoice>
```

## Features

- Real-time voice conversations with AI agents
- Speech-to-text transcription events
- Agent response events
- Connection state management
- Works in browser and React environments
- TypeScript support

## States

The client emits state changes as you interact:

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
| `connected` | - | Successfully connected |
| `disconnected` | - | Disconnected |
| `error` | `Error` | An error occurred |

## Requirements

- Browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone access permission
- Agent token from [chans.ai](https://chans.ai) dashboard

## Documentation

Full documentation available at [docs.chans.ai](https://docs.chans.ai)

## License

MIT - see [LICENSE](./LICENSE)
