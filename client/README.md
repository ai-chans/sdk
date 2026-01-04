# @chozzz/chans-sdk-js

Core JavaScript/TypeScript client for [chans.ai](https://chans.ai) voice AI.

## Installation

```bash
# Configure GitHub Packages registry
echo "@chozzz:registry=https://npm.pkg.github.com" >> .npmrc

# Install
npm install @chozzz/chans-sdk-js
```

## Quick Start

```typescript
import { ChansClient } from "@chozzz/chans-sdk-js"

const client = new ChansClient({
  agentToken: "agt_your_token"  // From chans.ai dashboard
})

// Listen for events
client.on("transcript", (text) => console.log("User:", text))
client.on("response", (text) => console.log("Agent:", text))
client.on("error", (err) => console.error("Error:", err))

// Connect (requests microphone permission in browsers)
await client.connect({ userId: "user-123" })

// Disconnect when done
await client.disconnect()
```

## API Reference

### Constructor

```typescript
new ChansClient(options: ChansClientOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agentToken` | `string` | *required* | Agent token from dashboard |
| `apiUrl` | `string` | `https://api.chans.ai` | API endpoint |
| `manualAudioHandling` | `boolean` | `false` | Handle audio manually (for Node.js) |

### Methods

#### `connect(options?)`

Connect to the voice agent. In browsers, this requests microphone permission.

```typescript
await client.connect({ userId: "user-123" })
```

#### `disconnect()`

End the voice session.

```typescript
await client.disconnect()
```

#### `getState()`

Get current connection state.

```typescript
const state = client.getState()
// "idle" | "connecting" | "connected" | "listening" | "speaking" | "error"
```

#### `isConnected()`

Check if currently connected.

```typescript
if (client.isConnected()) {
  // Handle connected state
}
```

#### `on(event, callback)`

Subscribe to events. Returns an unsubscribe function.

```typescript
const unsubscribe = client.on("transcript", (text) => {
  console.log("User said:", text)
})

// Later: stop listening
unsubscribe()
```

#### `off(event, callback)`

Unsubscribe from events.

```typescript
client.off("transcript", myHandler)
```

### Events

| Event | Callback | Description |
|-------|----------|-------------|
| `stateChange` | `(state: ChansState) => void` | Connection state changed |
| `transcript` | `(text: string) => void` | User speech transcribed |
| `response` | `(text: string) => void` | Agent response text |
| `error` | `(error: Error) => void` | Error occurred |
| `connected` | `() => void` | Successfully connected |
| `disconnected` | `() => void` | Disconnected |
| `audioTrack` | `(track: RemoteTrack) => void` | Agent audio available |
| `audioTrackEnded` | `() => void` | Agent audio ended |

### States

| State | Description |
|-------|-------------|
| `idle` | Not connected |
| `connecting` | Connection in progress |
| `connected` | Connected, initializing |
| `listening` | Listening for user speech |
| `speaking` | Agent is speaking |
| `error` | Error occurred |

## Node.js Usage

In Node.js, there's no DOM for audio playback. Enable manual audio handling:

```typescript
import { ChansClient } from "@chozzz/chans-sdk-js"

const client = new ChansClient({
  agentToken: "agt_xxx",
  manualAudioHandling: true
})

client.on("audioTrack", (track) => {
  // Handle audio track (LiveKit RemoteTrack)
})

client.on("audioTrackEnded", () => {
  // Agent stopped speaking
})

await client.connect()
```

## Testing

The SDK provides utilities for mocking in tests.

### Basic Test Setup

```typescript
import { ChansClient } from "@chozzz/chans-sdk-js"
import { createMockClientOptions } from "@chozzz/chans-sdk-js/testing"

test("client connects", async () => {
  const { getRoom, ...options } = createMockClientOptions()
  const client = new ChansClient(options)

  await client.connect()

  expect(client.getState()).toBe("listening")
})
```

### Simulating Agent Responses

```typescript
test("receives agent response", async () => {
  const { getRoom, ...options } = createMockClientOptions()
  const client = new ChansClient(options)
  const responses: string[] = []

  client.on("response", (text) => responses.push(text))
  await client.connect()

  // Simulate agent speaking
  getRoom()?.simulateAgentResponse("Hello!")

  expect(responses).toContain("Hello!")
})
```

### Testing Errors

```typescript
test("handles auth error", async () => {
  const { getRoom, ...options } = createMockClientOptions({
    fetchError: { status: 401, detail: "Invalid token" }
  })
  const client = new ChansClient(options)

  await expect(client.connect()).rejects.toThrow("Invalid token")
  expect(client.getState()).toBe("error")
})
```

## Self-Hosted

Point to your own chans.ai instance:

```typescript
const client = new ChansClient({
  agentToken: "agt_xxx",
  apiUrl: "https://your-instance.com"
})
```

Your instance must implement the `POST /v1/session` endpoint.

## License

Apache 2.0
