/**
 * Testing utilities for @chans/client
 *
 * Provides mock implementations for testing applications that use ChansClient.
 */

import type { RoomLike, RoomFactory, FetchFn, ChansState } from "./index.js"

/**
 * Mock session response for testing
 */
export interface MockSessionResponse {
  session_id: string
  connection_token: string
  connection_url: string
}

/**
 * Creates a mock fetch function that returns a session response
 */
export function createMockFetch(
  response: MockSessionResponse = {
    session_id: "mock-session-id",
    connection_token: "mock-token",
    connection_url: "wss://mock-livekit.example.com",
  }
): FetchFn {
  return async () => {
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * Creates a mock fetch that returns an error
 */
export function createMockFetchError(
  status: number = 401,
  detail: string = "Invalid agent token"
): FetchFn {
  return async () => {
    return new Response(JSON.stringify({ detail }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }
}

/**
 * Event handler storage for MockRoom
 */
type EventHandlers = Map<string, Set<(...args: unknown[]) => void>>

/**
 * Mock Room implementation for testing
 */
export class MockRoom implements RoomLike {
  private handlers: EventHandlers = new Map()
  private connected = false

  localParticipant = {
    setMicrophoneEnabled: async (_enabled: boolean) => {
      // No-op for testing
    },
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  async connect(_url: string, _token: string): Promise<void> {
    this.connected = true
    // Emit connected event on next tick
    setTimeout(() => {
      this.emit("connected")
    }, 0)
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.emit("disconnected")
  }

  /**
   * Emit an event to all registered handlers (for testing)
   */
  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((handler) => handler(...args))
  }

  /**
   * Check if room is connected (for testing assertions)
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Simulate receiving a transcription from user
   */
  simulateUserTranscript(text: string): void {
    this.emit("transcriptionReceived", [{ text }], { identity: "user-123" })
  }

  /**
   * Simulate receiving a response from agent
   */
  simulateAgentResponse(text: string): void {
    this.emit("transcriptionReceived", [{ text }], { identity: "agent-xxx" })
  }

  /**
   * Simulate agent audio track becoming available
   */
  simulateAgentSpeaking(): void {
    const mockTrack = {
      kind: "audio",
      attach: () => {
        const audio = {} as HTMLAudioElement
        return audio
      },
    }
    const mockParticipant = { identity: "agent-xxx" }
    this.emit("trackSubscribed", mockTrack, {}, mockParticipant)
  }

  /**
   * Simulate agent audio track ending
   */
  simulateAgentStoppedSpeaking(): void {
    const mockTrack = { kind: "audio" }
    this.emit("trackUnsubscribed", mockTrack)
  }
}

/**
 * Creates a MockRoom factory for dependency injection
 */
export function createMockRoomFactory(): {
  factory: RoomFactory
  getRoom: () => MockRoom | null
} {
  let room: MockRoom | null = null

  const factory: RoomFactory = () => {
    room = new MockRoom()
    return room
  }

  return {
    factory,
    getRoom: () => room,
  }
}

/**
 * Test helper: create a fully mocked ChansClient options object
 */
export function createMockClientOptions(overrides?: {
  sessionResponse?: MockSessionResponse
  fetchError?: { status: number; detail: string }
}) {
  const { factory, getRoom } = createMockRoomFactory()

  const fetch = overrides?.fetchError
    ? createMockFetchError(overrides.fetchError.status, overrides.fetchError.detail)
    : createMockFetch(overrides?.sessionResponse)

  return {
    agentToken: "agt_test_token",
    fetch,
    createRoom: factory,
    getRoom,
    manualAudioHandling: true,
  }
}

/**
 * Collect state changes from a client for assertions
 */
export function collectStateChanges(
  client: { on: (event: "stateChange", cb: (state: ChansState) => void) => () => void }
): {
  states: ChansState[]
  unsubscribe: () => void
} {
  const states: ChansState[] = []
  const unsubscribe = client.on("stateChange", (state) => {
    states.push(state)
  })
  return { states, unsubscribe }
}
