# @chans/react

React component and hooks for [chans.ai](https://chans.ai) voice AI.

## Installation

```bash
npm install @chans/react
```

Requires React 18 or 19.

## Usage

### Basic (Default UI)

```tsx
import { ChansVoice } from "@chans/react"

function App() {
  return (
    <ChansVoice
      agentToken="agt_xxx"
      onTranscript={(text) => console.log("User:", text)}
      onResponse={(text) => console.log("Agent:", text)}
    />
  )
}
```

### Custom UI (Render Props)

```tsx
import { ChansVoice } from "@chans/react"

function App() {
  return (
    <ChansVoice agentToken="agt_xxx" autoConnect={false}>
      {({ state, isConnected, connect, disconnect, error }) => (
        <div>
          <p>Status: {state}</p>

          <button
            onClick={isConnected ? disconnect : connect}
            disabled={state === "connecting"}
          >
            {isConnected ? "Stop" : "Start"}
          </button>

          {error && <p className="error">{error.message}</p>}
        </div>
      )}
    </ChansVoice>
  )
}
```

### useChans Hook

Access voice state from child components:

```tsx
import { ChansVoice, useChans } from "@chans/react"

function VoiceButton() {
  const { state, connect, disconnect, isConnected } = useChans()

  return (
    <button onClick={isConnected ? disconnect : connect}>
      {state === "listening" ? "Listening..." :
       state === "speaking" ? "Agent speaking" :
       "Start"}
    </button>
  )
}

function App() {
  return (
    <ChansVoice agentToken="agt_xxx" autoConnect={false}>
      {() => (
        <div>
          <h1>Voice Assistant</h1>
          <VoiceButton />
        </div>
      )}
    </ChansVoice>
  )
}
```

## API

### ChansVoice Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `agentToken` | `string` | required | Agent token from dashboard |
| `userId` | `string` | - | End-user ID for conversation segmentation |
| `apiUrl` | `string` | `https://api.chans.ai` | API endpoint |
| `autoConnect` | `boolean` | `true` | Auto-connect on mount |
| `onTranscript` | `(text: string) => void` | - | User speech transcribed |
| `onResponse` | `(text: string) => void` | - | Agent response received |
| `onStateChange` | `(state: ChansState) => void` | - | State changed |
| `onError` | `(error: Error) => void` | - | Error occurred |
| `onConnected` | `() => void` | - | Connected to agent |
| `onDisconnected` | `() => void` | - | Disconnected |
| `children` | `(props: RenderProps) => ReactNode` | - | Custom render function |
| `className` | `string` | - | CSS class for wrapper |

### Render Props

When using children as a function:

```ts
interface ChansVoiceRenderProps {
  state: ChansState
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  error: Error | null
}
```

### useChans Hook

Returns the same props as render props. Must be used inside a `ChansVoice` component.

```ts
const { state, isConnected, connect, disconnect, error } = useChans()
```

### ChansState

```ts
type ChansState =
  | "idle"        // Not connected
  | "connecting"  // Connecting
  | "connected"   // Connected, initializing
  | "listening"   // Listening for speech
  | "speaking"    // Agent speaking
  | "error"       // Error occurred
```

## Examples

### With Transcript Display

```tsx
import { useState } from "react"
import { ChansVoice } from "@chans/react"

function App() {
  const [messages, setMessages] = useState<Array<{role: string, text: string}>>([])

  return (
    <div>
      <div className="messages">
        {messages.map((m, i) => (
          <p key={i}><b>{m.role}:</b> {m.text}</p>
        ))}
      </div>

      <ChansVoice
        agentToken="agt_xxx"
        onTranscript={(text) =>
          setMessages(prev => [...prev, { role: "You", text }])
        }
        onResponse={(text) =>
          setMessages(prev => [...prev, { role: "Agent", text }])
        }
      />
    </div>
  )
}
```

### Controlled Connect/Disconnect

```tsx
import { ChansVoice } from "@chans/react"

function App() {
  return (
    <ChansVoice agentToken="agt_xxx" autoConnect={false}>
      {({ state, connect, disconnect }) => (
        <div>
          {state === "idle" ? (
            <button onClick={connect}>Start Conversation</button>
          ) : (
            <>
              <p>State: {state}</p>
              <button onClick={disconnect}>End Conversation</button>
            </>
          )}
        </div>
      )}
    </ChansVoice>
  )
}
```

## Self-Hosted

```tsx
<ChansVoice
  agentToken="agt_xxx"
  apiUrl="https://your-instance.com"
/>
```

## License

MIT
