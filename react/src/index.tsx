"use client"

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from "react"
import { ChansClient, ChansState } from "@chans/sdk-js"

// Re-export client types
export type { ChansState } from "@chans/sdk-js"

export interface ChansVoiceProps {
  /**
   * Agent token from chans.ai dashboard
   */
  agentToken: string

  /**
   * Optional end-user ID for conversation segmentation
   */
  userId?: string

  /**
   * API URL (defaults to https://api.chans.ai)
   */
  apiUrl?: string

  /**
   * Auto-connect on mount (default: true)
   */
  autoConnect?: boolean

  /**
   * Called when user's speech is transcribed
   */
  onTranscript?: (text: string) => void

  /**
   * Called when agent responds
   */
  onResponse?: (text: string) => void

  /**
   * Called when state changes
   */
  onStateChange?: (state: ChansState) => void

  /**
   * Called on error
   */
  onError?: (error: Error) => void

  /**
   * Called when connected
   */
  onConnected?: () => void

  /**
   * Called when disconnected
   */
  onDisconnected?: () => void

  /**
   * Custom render function for the voice UI
   */
  children?: (props: ChansVoiceRenderProps) => React.ReactNode

  /**
   * CSS class name
   */
  className?: string
}

export interface ChansVoiceRenderProps {
  state: ChansState
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  error: Error | null
}

// Context for accessing chans state from child components
type ChansContextValue = ChansVoiceRenderProps

const ChansContext = createContext<ChansContextValue | null>(null)

/**
 * Hook to access ChansVoice state from child components
 */
export function useChans(): ChansContextValue {
  const context = useContext(ChansContext)
  if (!context) {
    throw new Error("useChans must be used within a ChansVoice component")
  }
  return context
}

/**
 * ChansVoice - React component for chans.ai voice AI
 *
 * @example
 * ```tsx
 * <ChansVoice
 *   agentToken="agt_xxx"
 *   userId="user-123"
 *   onTranscript={(text) => console.log("User:", text)}
 *   onResponse={(text) => console.log("Agent:", text)}
 * />
 * ```
 *
 * @example Custom UI
 * ```tsx
 * <ChansVoice agentToken="agt_xxx">
 *   {({ state, connect, disconnect }) => (
 *     <button onClick={state === "idle" ? connect : disconnect}>
 *       {state === "idle" ? "Start" : "Stop"}
 *     </button>
 *   )}
 * </ChansVoice>
 * ```
 */
export function ChansVoice({
  agentToken,
  userId,
  apiUrl,
  autoConnect = true,
  onTranscript,
  onResponse,
  onStateChange,
  onError,
  onConnected,
  onDisconnected,
  children,
  className,
}: ChansVoiceProps) {
  const [state, setState] = useState<ChansState>("idle")
  const [error, setError] = useState<Error | null>(null)
  const clientRef = useRef<ChansClient | null>(null)

  // Create client on mount
  useEffect(() => {
    clientRef.current = new ChansClient({ agentToken, apiUrl })

    const client = clientRef.current

    // Set up event listeners
    const unsubState = client.on("stateChange", (newState) => {
      setState(newState)
      onStateChange?.(newState)
    })

    const unsubTranscript = client.on("transcript", (text) => {
      onTranscript?.(text)
    })

    const unsubResponse = client.on("response", (text) => {
      onResponse?.(text)
    })

    const unsubError = client.on("error", (err) => {
      setError(err)
      onError?.(err)
    })

    const unsubConnected = client.on("connected", () => {
      setError(null)
      onConnected?.()
    })

    const unsubDisconnected = client.on("disconnected", () => {
      onDisconnected?.()
    })

    return () => {
      unsubState()
      unsubTranscript()
      unsubResponse()
      unsubError()
      unsubConnected()
      unsubDisconnected()
      client.disconnect()
    }
  }, [agentToken, apiUrl, onStateChange, onTranscript, onResponse, onError, onConnected, onDisconnected])

  // Auto-connect
  useEffect(() => {
    if (autoConnect && clientRef.current && state === "idle") {
      clientRef.current.connect({ userId }).catch(() => {
        // Error handled by event listener
      })
    }
  }, [autoConnect, userId, state])

  const connect = useCallback(async () => {
    if (clientRef.current) {
      setError(null)
      await clientRef.current.connect({ userId })
    }
  }, [userId])

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect()
    }
  }, [])

  const isConnected = state !== "idle" && state !== "error"

  const contextValue: ChansContextValue = useMemo(
    () => ({
      state,
      isConnected,
      connect,
      disconnect,
      error,
    }),
    [state, isConnected, connect, disconnect, error]
  )

  // Custom render function
  if (children) {
    return (
      <ChansContext.Provider value={contextValue}>
        {children(contextValue)}
      </ChansContext.Provider>
    )
  }

  // Default UI
  return (
    <ChansContext.Provider value={contextValue}>
      <div className={className}>
        <DefaultVoiceUI
          state={state}
          isConnected={isConnected}
          connect={connect}
          disconnect={disconnect}
          error={error}
        />
      </div>
    </ChansContext.Provider>
  )
}

/**
 * Default voice UI component
 */
function DefaultVoiceUI({
  state,
  isConnected,
  connect,
  disconnect,
  error,
}: ChansVoiceRenderProps) {
  const handleClick = async () => {
    if (isConnected) {
      await disconnect()
    } else {
      await connect()
    }
  }

  return (
    <div style={{ textAlign: "center" }}>
      {error && (
        <div
          style={{
            color: "#ef4444",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {error.message}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={state === "connecting"}
        style={{
          width: "4rem",
          height: "4rem",
          borderRadius: "50%",
          border: "none",
          background:
            state === "idle"
              ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
              : state === "speaking"
                ? "#22c55e"
                : state === "error"
                  ? "#ef4444"
                  : "#6366f1",
          color: "white",
          cursor: state === "connecting" ? "wait" : "pointer",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label={isConnected ? "Stop voice" : "Start voice"}
      >
        {state === "connecting" ? (
          <LoadingSpinner />
        ) : state === "speaking" ? (
          <SpeakerIcon />
        ) : (
          <MicIcon />
        )}
      </button>

      <div
        style={{
          marginTop: "0.5rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
        }}
      >
        {state === "idle" && "Click to start"}
        {state === "connecting" && "Connecting..."}
        {state === "connected" && "Connected"}
        {state === "listening" && "Listening..."}
        {state === "speaking" && "Agent speaking"}
        {state === "error" && "Error"}
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      style={{ animation: "spin 1s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeDasharray="31.4 31.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default ChansVoice
