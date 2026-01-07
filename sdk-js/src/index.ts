import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  TranscriptionSegment,
  type RoomOptions,
} from "livekit-client"

export type ChansState =
  | "idle"        // Not connected
  | "connecting"  // API call + room connecting
  | "waiting"     // Room connected, waiting for agent to join
  | "ready"       // Agent joined, user can speak
  | "processing"  // User spoke, waiting for agent response
  | "speaking"    // Agent audio playing
  | "error"

/**
 * Interface for Room-like objects (for dependency injection in tests)
 */
export interface RoomLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): void
  connect(url: string, token: string): Promise<void>
  disconnect(): Promise<void>
  localParticipant: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMicrophoneEnabled(enabled: boolean): Promise<any>
  }
}

/**
 * Factory function for creating Room instances
 */
export type RoomFactory = (options?: RoomOptions) => RoomLike

/**
 * Fetch function type for dependency injection
 */
export type FetchFn = typeof fetch

export interface ChansClientOptions {
  /**
   * Agent token from chans.ai dashboard
   */
  agentToken: string

  /**
   * API URL (defaults to https://api.chans.ai)
   */
  apiUrl?: string

  /**
   * Handle audio playback manually. When true, SDK emits 'audioTrack' event
   * instead of auto-attaching to DOM. Required for Node.js environments.
   * Default: false (auto-attach in browser)
   */
  manualAudioHandling?: boolean

  /**
   * Custom fetch function for testing or custom HTTP handling.
   * Defaults to global fetch.
   */
  fetch?: FetchFn

  /**
   * Custom Room factory for testing.
   * Defaults to creating livekit-client Room instances.
   */
  createRoom?: RoomFactory
}

export interface ConnectOptions {
  /**
   * Optional end-user ID for conversation segmentation
   */
  userId?: string
}

export type ChansEventType =
  | "stateChange"
  | "transcript"
  | "response"
  | "error"
  | "connected"
  | "disconnected"
  | "audioTrack"
  | "audioTrackEnded"
  | "agentConnected"
  | "agentDisconnected"
  | "userTurnComplete"
  | "sessionCreated"

export interface AgentInfo {
  identity: string
  metadata?: string
}

export interface SessionInfo {
  sessionId: string
  agentId?: string
}

export interface ChansEvents {
  stateChange: (state: ChansState) => void
  transcript: (text: string) => void
  response: (text: string) => void
  error: (error: Error) => void
  connected: () => void
  disconnected: () => void
  /** Emitted when agent audio track is available (for manual audio handling) */
  audioTrack: (track: RemoteTrack) => void
  /** Emitted when agent audio track ends */
  audioTrackEnded: () => void
  /** Emitted when agent participant joins the room */
  agentConnected: (agent: AgentInfo) => void
  /** Emitted when agent participant leaves the room */
  agentDisconnected: () => void
  /** Emitted when user finishes speaking (final transcript) */
  userTurnComplete: (transcript: string) => void
  /** Emitted when session is created with API */
  sessionCreated: (session: SessionInfo) => void
}

interface SessionResponse {
  session_id: string
  connection_token: string
  connection_url: string
}

/**
 * ChansClient - JavaScript client for chans.ai voice AI
 *
 * @example
 * ```ts
 * const chans = new ChansClient({ agentToken: "agt_xxx" })
 * await chans.connect({ userId: "user-123" })
 *
 * chans.on("transcript", (text) => console.log("User:", text))
 * chans.on("response", (text) => console.log("Agent:", text))
 *
 * // Later...
 * await chans.disconnect()
 * ```
 */
/**
 * Default Room factory using livekit-client
 */
const defaultCreateRoom: RoomFactory = (options) => new Room(options)

export class ChansClient {
  private agentToken: string
  private apiUrl: string
  private manualAudioHandling: boolean
  private fetchFn: FetchFn
  private createRoom: RoomFactory
  private room: RoomLike | null = null
  private audioElement: HTMLAudioElement | null = null
  private state: ChansState = "idle"
  private listeners: Map<ChansEventType, Set<ChansEvents[ChansEventType]>> =
    new Map()

  constructor(options: ChansClientOptions) {
    this.agentToken = options.agentToken
    this.apiUrl = options.apiUrl || "https://api.chans.ai"
    this.manualAudioHandling = options.manualAudioHandling ?? false
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.createRoom = options.createRoom ?? defaultCreateRoom
  }

  /**
   * Current connection state
   */
  getState(): ChansState {
    return this.state
  }

  /**
   * Whether the client is connected
   */
  isConnected(): boolean {
    return this.state !== "idle" && this.state !== "error"
  }

  /**
   * Subscribe to events
   */
  on<T extends ChansEventType>(event: T, callback: ChansEvents[T]): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as ChansEvents[ChansEventType])

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as ChansEvents[ChansEventType])
    }
  }

  /**
   * Unsubscribe from events
   */
  off<T extends ChansEventType>(event: T, callback: ChansEvents[T]): void {
    this.listeners.get(event)?.delete(callback as ChansEvents[ChansEventType])
  }

  private emit<T extends ChansEventType>(
    event: T,
    ...args: Parameters<ChansEvents[T]>
  ): void {
    this.listeners.get(event)?.forEach((callback) => {
      ;(callback as (...args: Parameters<ChansEvents[T]>) => void)(...args)
    })
  }

  private setState(newState: ChansState): void {
    if (this.state !== newState) {
      this.state = newState
      this.emit("stateChange", newState)
    }
  }

  /**
   * Connect to the voice agent
   */
  async connect(options: ConnectOptions = {}): Promise<void> {
    if (this.room) {
      throw new Error("Already connected. Call disconnect() first.")
    }

    this.setState("connecting")

    try {
      // Get session from API
      const res = await this.fetchFn(`${this.apiUrl}/api/v1/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_token: this.agentToken,
          user_id: options.userId,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.detail || `Failed to create session: ${res.status}`)
      }

      const session: SessionResponse = await res.json()

      // Emit session created event
      this.emit("sessionCreated", {
        sessionId: session.session_id,
      })

      // Create and connect room
      const room = this.createRoom({
        adaptiveStream: true,
        dynacast: true,
      })

      this.room = room

      // Set up event handlers
      room.on(RoomEvent.Connected, () => {
        this.emit("connected")
        // Wait for agent to join before user can speak
        this.setState("waiting")
      })

      room.on(RoomEvent.Disconnected, () => {
        this.setState("idle")
        this.emit("disconnected")
        this.cleanup()
      })

      // Agent participant joined - now ready for conversation
      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        if (participant.identity.includes("agent")) {
          this.setState("ready")
          this.emit("agentConnected", {
            identity: participant.identity,
            metadata: participant.metadata,
          })
        }
      })

      // Agent participant left
      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        if (participant.identity.includes("agent")) {
          this.emit("agentDisconnected")
          this.setState("waiting")
        }
      })

      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
          // Agent is speaking
          if (
            track.kind === Track.Kind.Audio &&
            participant.identity.includes("agent")
          ) {
            this.setState("speaking")
            this.emit("audioTrack", track)

            // Auto-attach audio element in browser (unless manual handling)
            if (!this.manualAudioHandling && typeof document !== "undefined") {
              this.audioElement = track.attach() as HTMLAudioElement
              this.audioElement.id = "chans-agent-audio"
              document.body.appendChild(this.audioElement)
            }
          }
        }
      )

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          this.emit("audioTrackEnded")

          // Cleanup audio element if we created it
          if (this.audioElement) {
            this.audioElement.remove()
            this.audioElement = null
          }

          // Back to ready for next user input
          this.setState("ready")
        }
      })

      room.on(
        RoomEvent.TranscriptionReceived,
        (segments: TranscriptionSegment[], participant: { identity: string } | undefined) => {
          const text = segments.map((s) => s.text).join(" ")
          const isFinal = segments.some((s) => s.final)

          if (participant?.identity.includes("agent")) {
            // Agent is responding - transition to speaking if we were processing
            if (this.state === "processing" || this.state === "ready") {
              this.setState("speaking")
            }
            this.emit("response", text)
            // Agent finished speaking - transition back to ready
            if (isFinal && text.trim()) {
              this.setState("ready")
            }
          } else {
            this.emit("transcript", text)
            // User finished speaking - transition to processing
            if (isFinal && text.trim()) {
              this.setState("processing")
              this.emit("userTurnComplete", text)
            }
          }
        }
      )

      // Connect to LiveKit
      await room.connect(session.connection_url, session.connection_token)

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true)
    } catch (err) {
      this.setState("error")
      const error = err instanceof Error ? err : new Error(String(err))
      this.emit("error", error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Disconnect from the voice agent
   */
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect()
    }
    this.cleanup()
    this.setState("idle")
  }

  private cleanup(): void {
    if (this.audioElement) {
      this.audioElement.remove()
      this.audioElement = null
    }
    this.room = null
  }
}

export default ChansClient
