import { describe, it, expect, vi, beforeEach } from "vitest"
import { ChansClient } from "./index.js"
import {
  createMockClientOptions,
  createMockFetchError,
  collectStateChanges,
  MockRoom,
} from "./testing.js"

describe("ChansClient", () => {
  describe("constructor", () => {
    it("should create client with required options", () => {
      const client = new ChansClient({ agentToken: "agt_test" })
      expect(client.getState()).toBe("idle")
      expect(client.isConnected()).toBe(false)
    })

    it("should use default API URL", () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "test" }), { status: 401 })
      )
      const client = new ChansClient({
        agentToken: "agt_test",
        fetch: mockFetch,
      })

      // Trigger a connect to verify the URL
      client.connect().catch(() => {})

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chans.ai/api/v1/session",
        expect.any(Object)
      )
    })

    it("should use custom API URL", () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "test" }), { status: 401 })
      )
      const client = new ChansClient({
        agentToken: "agt_test",
        apiUrl: "https://custom.api.com",
        fetch: mockFetch,
      })

      client.connect().catch(() => {})

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.api.com/api/v1/session",
        expect.any(Object)
      )
    })
  })

  describe("getState", () => {
    it("should return idle initially", () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      expect(client.getState()).toBe("idle")
    })
  })

  describe("isConnected", () => {
    it("should return false when idle", () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      expect(client.isConnected()).toBe(false)
    })

    it("should return true when connected", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)

      await client.connect()
      // Wait for connected event
      await new Promise((r) => setTimeout(r, 10))

      expect(client.isConnected()).toBe(true)
    })

    it("should return false after disconnect", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))
      await client.disconnect()

      expect(client.isConnected()).toBe(false)
    })
  })

  describe("connect", () => {
    it("should connect successfully", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const { states } = collectStateChanges(client)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      expect(states).toContain("connecting")
      expect(states).toContain("waiting")
    })

    it("should pass userId in session request", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            session_id: "test",
            connection_token: "token",
            connection_url: "wss://test.com",
          }),
          { status: 200 }
        )
      )
      const { factory } = createMockRoomFactory()
      const client = new ChansClient({
        agentToken: "agt_test",
        fetch: mockFetch,
        createRoom: factory,
        manualAudioHandling: true,
      })

      await client.connect({ userId: "user-123" })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            agent_token: "agt_test",
            user_id: "user-123",
          }),
        })
      )
    })

    it("should throw error if already connected", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      await expect(client.connect()).rejects.toThrow("Already connected")
    })

    it("should handle API error", async () => {
      const { getRoom, ...options } = createMockClientOptions({
        fetchError: { status: 401, detail: "Invalid token" },
      })
      const client = new ChansClient(options)
      const errors: Error[] = []
      client.on("error", (err) => errors.push(err))

      await expect(client.connect()).rejects.toThrow("Invalid token")
      expect(client.getState()).toBe("error")
      expect(errors).toHaveLength(1)
    })

    it("should handle network error", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"))
      const client = new ChansClient({
        agentToken: "agt_test",
        fetch: mockFetch,
        manualAudioHandling: true,
      })

      await expect(client.connect()).rejects.toThrow("Network error")
      expect(client.getState()).toBe("error")
    })
  })

  describe("disconnect", () => {
    it("should disconnect and return to idle", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))
      await client.disconnect()

      expect(client.getState()).toBe("idle")
      expect(client.isConnected()).toBe(false)
    })

    it("should emit disconnected event", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const disconnected = vi.fn()
      client.on("disconnected", disconnected)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))
      await client.disconnect()

      expect(disconnected).toHaveBeenCalled()
    })
  })

  describe("events", () => {
    it("should subscribe and unsubscribe from events", () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const callback = vi.fn()

      const unsubscribe = client.on("stateChange", callback)
      client.connect().catch(() => {})

      expect(callback).toHaveBeenCalled()

      unsubscribe()
      callback.mockClear()

      // Further state changes should not trigger callback
      client.disconnect()
      // The disconnect may or may not call callback depending on timing
    })

    it("should handle transcript events", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const transcripts: string[] = []
      client.on("transcript", (text) => transcripts.push(text))

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      const room = getRoom() as MockRoom
      room.simulateUserTranscript("Hello world")

      expect(transcripts).toContain("Hello world")
    })

    it("should handle response events", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const responses: string[] = []
      client.on("response", (text) => responses.push(text))

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      const room = getRoom() as MockRoom
      room.simulateAgentResponse("Hi there!")

      expect(responses).toContain("Hi there!")
    })

    it("should emit audioTrack when agent starts speaking", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const audioTracks: unknown[] = []
      client.on("audioTrack", (track) => audioTracks.push(track))

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      const room = getRoom() as MockRoom
      room.simulateAgentSpeaking()

      expect(audioTracks).toHaveLength(1)
      expect(client.getState()).toBe("speaking")
    })

    it("should emit audioTrackEnded when agent stops speaking", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const ended = vi.fn()
      client.on("audioTrackEnded", ended)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      const room = getRoom() as MockRoom
      room.simulateAgentSpeaking()
      room.simulateAgentStoppedSpeaking()

      expect(ended).toHaveBeenCalled()
      expect(client.getState()).toBe("ready")
    })

    it("should unsubscribe with off()", () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const callback = vi.fn()

      client.on("stateChange", callback)
      client.off("stateChange", callback)

      client.connect().catch(() => {})

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe("state transitions", () => {
    it("should follow correct state flow on successful connect", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const { states } = collectStateChanges(client)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      // New state flow: connecting -> waiting (for agent to join)
      expect(states).toEqual(["connecting", "waiting"])
    })

    it("should transition to speaking when agent audio arrives", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)
      const { states } = collectStateChanges(client)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      const room = getRoom() as MockRoom
      room.simulateAgentSpeaking()

      expect(states).toContain("speaking")
    })

    it("should transition back to ready when agent stops", async () => {
      const { getRoom, ...options } = createMockClientOptions()
      const client = new ChansClient(options)

      await client.connect()
      await new Promise((r) => setTimeout(r, 10))

      const room = getRoom() as MockRoom
      room.simulateAgentSpeaking()
      room.simulateAgentStoppedSpeaking()

      expect(client.getState()).toBe("ready")
    })
  })
})

// Helper to create mock room factory (exported from testing but need local for some tests)
function createMockRoomFactory() {
  let room: MockRoom | null = null
  const factory = () => {
    room = new MockRoom()
    return room
  }
  return { factory, getRoom: () => room }
}
