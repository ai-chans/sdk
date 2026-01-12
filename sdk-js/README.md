# @ai-chans/sdk-js

JavaScript/TypeScript client for [chans.ai](https://chans.ai) voice AI.

## Installation

```bash
npm install @ai-chans/sdk-js
```

## Quick Start

```typescript
import { ChansClient } from "@ai-chans/sdk-js"

const client = new ChansClient({
  agentToken: "agt_your_token"  // From chans.ai dashboard
})

client.on("transcript", (text) => console.log("User:", text))
client.on("response", (text) => console.log("Agent:", text))

await client.connect()
```

## Documentation

For full API reference, examples, and guides, visit [docs.chans.ai](https://docs.chans.ai).

## License

Apache 2.0
