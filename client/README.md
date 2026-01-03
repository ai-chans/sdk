# @chans/client

Core JavaScript/TypeScript client for [chans.ai](https://chans.ai) voice AI.

Works in browsers and Node.js.

## Installation

```bash
npm install @chans/client
```

## Usage

### Browser

```ts
import { ChansClient } from "@chans/client"

const client = new ChansClient({ agentToken: "agt_xxx" })

// Subscribe to events
client.on("transcript", (text) => console.log("User said:", text))
client.on("response", (text) => console.log("Agent said:", text))
client.on("stateChange", (state) => console.log("State:", state))
client.on("error", (err) => console.error("Error:", err))

// Connect (requests microphone permission)
await client.connect({ userId: "user-123" })

// Later: disconnect
await client.disconnect()
```

### Node.js

In Node.js, you must handle audio manually since there's no DOM:

```ts
import { ChansClient } from "@chans/client"

const client = new ChansClient({
  agentToken: "agt_xxx",
  manualAudioHandling: true,
})

client.on("audioTrack", (track) => {
  // track is a livekit-client RemoteTrack
  // Handle audio playback manually
})

client.on("audioTrackEnded", () => {
  // Agent stopped speaking
})

await client.connect()
```

## API

### Constructor

```ts
new ChansClient(options: ChansClientOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agentToken` | `string` | required | Agent token from dashboard |
| `apiUrl` | `string` | `https://api.chans.ai` | API endpoint |
| `manualAudioHandling` | `boolean` | `false` | Handle audio manually (required for Node.js) |

### Methods

#### `connect(options?): Promise<void>`

Connect to the voice agent. Requests microphone permission in browsers.

```ts
await client.connect({ userId: "user-123" })
```

#### `disconnect(): Promise<void>`

Disconnect from the agent.

```ts
await client.disconnect()
```

#### `getState(): ChansState`

Get current connection state.

```ts
const state = client.getState() // "idle" | "connecting" | "connected" | ...
```

#### `isConnected(): boolean`

Check if currently connected.

```ts
if (client.isConnected()) {
  // ...
}
```

#### `on(event, callback): () => void`

Subscribe to events. Returns an unsubscribe function.

```ts
const unsubscribe = client.on("transcript", (text) => {
  console.log(text)
})

// Later: unsubscribe
unsubscribe()
```

#### `off(event, callback): void`

Unsubscribe from events.

```ts
client.off("transcript", myHandler)
```

### Events

| Event | Callback | Description |
|-------|----------|-------------|
| `stateChange` | `(state: ChansState) => void` | Connection state changed |
| `transcript` | `(text: string) => void` | User's speech transcribed |
| `response` | `(text: string) => void` | Agent's response text |
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

## Self-Hosted

Point to your own chans.ai instance:

```ts
const client = new ChansClient({
  agentToken: "agt_xxx",
  apiUrl: "https://your-instance.com",
})
```

Your instance must implement `POST /v1/session`. See main SDK README for details.

## Testing

The SDK provides testing utilities for mocking the client in your tests.

### Import Testing Utilities

```ts
import {
  createMockClientOptions,
  createMockFetch,
  createMockRoomFactory,
  MockRoom,
} from "@chans/client/testing"
```

### Basic Test Setup

```ts
import { ChansClient } from "@chans/client"
import { createMockClientOptions } from "@chans/client/testing"

test("client connects successfully", async () => {
  const { getRoom, ...options } = createMockClientOptions()
  const client = new ChansClient(options)

  await client.connect()

  expect(client.getState()).toBe("listening")
  expect(getRoom()?.isConnected()).toBe(true)
})
```

### Simulating Agent Responses

```ts
test("receives agent response", async () => {
  const { getRoom, ...options } = createMockClientOptions()
  const client = new ChansClient(options)
  const responses: string[] = []

  client.on("response", (text) => responses.push(text))
  await client.connect()

  // Wait for connection
  await new Promise((r) => setTimeout(r, 10))

  // Simulate agent speaking
  getRoom()?.simulateAgentResponse("Hello, how can I help?")

  expect(responses).toContain("Hello, how can I help?")
})
```

### Testing Error Handling

```ts
test("handles auth error", async () => {
  const { getRoom, ...options } = createMockClientOptions({
    fetchError: { status: 401, detail: "Invalid token" },
  })
  const client = new ChansClient(options)
  const errors: Error[] = []

  client.on("error", (err) => errors.push(err))

  await expect(client.connect()).rejects.toThrow("Invalid token")
  expect(client.getState()).toBe("error")
})
```

### Dependency Injection

For advanced testing, you can inject custom `fetch` and `createRoom`:

```ts
const client = new ChansClient({
  agentToken: "agt_xxx",
  fetch: myCustomFetch,
  createRoom: myCustomRoomFactory,
})
```

## License

MIT
