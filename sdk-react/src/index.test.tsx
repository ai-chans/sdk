import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { ChansVoice, useChans } from "./index.js"

// Helper to create a mock ChansClient instance
function createMockClient() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()

  const mockClient = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(callback)
      return () => listeners.get(event)?.delete(callback)
    }),
    off: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockReturnValue("idle"),
    isConnected: vi.fn().mockReturnValue(false),
    // Helper to emit events in tests
    _emit: (event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((cb) => cb(...args))
    },
    _listeners: listeners,
  }

  return mockClient
}

// Store the mock client for test access
let currentMockClient: ReturnType<typeof createMockClient>
// Track constructor calls for verification
let lastConstructorArgs: unknown[] = []

// Mock the sdk-js module with a proper class constructor
vi.mock("@ai-chans/sdk-js", async () => {
  const actual = await vi.importActual("@ai-chans/sdk-js")
  return {
    ...actual,
    ChansClient: class MockChansClient {
      constructor(...args: unknown[]) {
        lastConstructorArgs = args
        // Copy all methods from currentMockClient to this instance
        Object.assign(this, currentMockClient)
      }
    },
  }
})

describe("ChansVoice", () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mockClient = createMockClient()
    currentMockClient = mockClient
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("should render default UI", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      expect(screen.getByRole("button")).toBeInTheDocument()
      expect(screen.getByText("Click to start")).toBeInTheDocument()
    })

    it("should render custom children", () => {
      render(
        <ChansVoice agentToken="agt_test" autoConnect={false}>
          {({ state }) => <div data-testid="custom">State: {state}</div>}
        </ChansVoice>
      )

      expect(screen.getByTestId("custom")).toHaveTextContent("State: idle")
    })

    it("should apply className to wrapper", () => {
      const { container } = render(
        <ChansVoice agentToken="agt_test" autoConnect={false} className="custom-class" />
      )

      expect(container.querySelector(".custom-class")).toBeInTheDocument()
    })
  })

  describe("client initialization", () => {
    it("should create ChansClient with agentToken", () => {
      render(<ChansVoice agentToken="agt_test_token" autoConnect={false} />)

      expect(lastConstructorArgs[0]).toEqual({
        agentToken: "agt_test_token",
        apiUrl: undefined,
      })
    })

    it("should create ChansClient with custom apiUrl", () => {
      render(
        <ChansVoice
          agentToken="agt_test"
          apiUrl="https://custom.api.com"
          autoConnect={false}
        />
      )

      expect(lastConstructorArgs[0]).toEqual({
        agentToken: "agt_test",
        apiUrl: "https://custom.api.com",
      })
    })

    it("should set up event listeners on mount", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      expect(mockClient.on).toHaveBeenCalledWith("stateChange", expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith("transcript", expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith("response", expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith("connected", expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith("disconnected", expect.any(Function))
    })

    it("should disconnect on unmount", () => {
      const { unmount } = render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      unmount()

      expect(mockClient.disconnect).toHaveBeenCalled()
    })
  })

  describe("auto-connect", () => {
    it("should auto-connect by default", async () => {
      render(<ChansVoice agentToken="agt_test" />)

      await waitFor(() => {
        expect(mockClient.connect).toHaveBeenCalledWith({ userId: undefined })
      })
    })

    it("should not auto-connect when autoConnect=false", async () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      // Give it a moment to potentially call connect
      await new Promise((r) => setTimeout(r, 50))

      expect(mockClient.connect).not.toHaveBeenCalled()
    })

    it("should pass userId to connect", async () => {
      render(<ChansVoice agentToken="agt_test" userId="user-123" />)

      await waitFor(() => {
        expect(mockClient.connect).toHaveBeenCalledWith({ userId: "user-123" })
      })
    })
  })

  describe("state management", () => {
    it("should update state on stateChange event", async () => {
      render(
        <ChansVoice agentToken="agt_test" autoConnect={false}>
          {({ state }) => <div data-testid="state">{state}</div>}
        </ChansVoice>
      )

      expect(screen.getByTestId("state")).toHaveTextContent("idle")

      act(() => {
        mockClient._emit("stateChange", "connecting")
      })

      expect(screen.getByTestId("state")).toHaveTextContent("connecting")

      act(() => {
        mockClient._emit("stateChange", "listening")
      })

      expect(screen.getByTestId("state")).toHaveTextContent("listening")
    })

    it("should calculate isConnected correctly", () => {
      render(
        <ChansVoice agentToken="agt_test" autoConnect={false}>
          {({ isConnected }) => (
            <div data-testid="connected">{isConnected ? "yes" : "no"}</div>
          )}
        </ChansVoice>
      )

      expect(screen.getByTestId("connected")).toHaveTextContent("no")

      act(() => {
        mockClient._emit("stateChange", "listening")
      })

      expect(screen.getByTestId("connected")).toHaveTextContent("yes")

      act(() => {
        mockClient._emit("stateChange", "error")
      })

      expect(screen.getByTestId("connected")).toHaveTextContent("no")
    })

    it("should handle errors", async () => {
      const onError = vi.fn()
      render(
        <ChansVoice agentToken="agt_test" autoConnect={false} onError={onError}>
          {({ error }) => (
            <div data-testid="error">{error?.message || "no error"}</div>
          )}
        </ChansVoice>
      )

      expect(screen.getByTestId("error")).toHaveTextContent("no error")

      act(() => {
        mockClient._emit("error", new Error("Connection failed"))
      })

      expect(screen.getByTestId("error")).toHaveTextContent("Connection failed")
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it("should clear error on connected event", async () => {
      render(
        <ChansVoice agentToken="agt_test" autoConnect={false}>
          {({ error }) => (
            <div data-testid="error">{error?.message || "no error"}</div>
          )}
        </ChansVoice>
      )

      // Set an error
      act(() => {
        mockClient._emit("error", new Error("Some error"))
      })
      expect(screen.getByTestId("error")).toHaveTextContent("Some error")

      // Connect clears error
      act(() => {
        mockClient._emit("connected")
      })
      expect(screen.getByTestId("error")).toHaveTextContent("no error")
    })
  })

  describe("callbacks", () => {
    it("should call onStateChange", () => {
      const onStateChange = vi.fn()
      render(
        <ChansVoice
          agentToken="agt_test"
          autoConnect={false}
          onStateChange={onStateChange}
        />
      )

      act(() => {
        mockClient._emit("stateChange", "connecting")
      })

      expect(onStateChange).toHaveBeenCalledWith("connecting")
    })

    it("should call onTranscript", () => {
      const onTranscript = vi.fn()
      render(
        <ChansVoice
          agentToken="agt_test"
          autoConnect={false}
          onTranscript={onTranscript}
        />
      )

      act(() => {
        mockClient._emit("transcript", "Hello world")
      })

      expect(onTranscript).toHaveBeenCalledWith("Hello world")
    })

    it("should call onResponse", () => {
      const onResponse = vi.fn()
      render(
        <ChansVoice
          agentToken="agt_test"
          autoConnect={false}
          onResponse={onResponse}
        />
      )

      act(() => {
        mockClient._emit("response", "Hi there!")
      })

      expect(onResponse).toHaveBeenCalledWith("Hi there!")
    })

    it("should call onConnected", () => {
      const onConnected = vi.fn()
      render(
        <ChansVoice
          agentToken="agt_test"
          autoConnect={false}
          onConnected={onConnected}
        />
      )

      act(() => {
        mockClient._emit("connected")
      })

      expect(onConnected).toHaveBeenCalled()
    })

    it("should call onDisconnected", () => {
      const onDisconnected = vi.fn()
      render(
        <ChansVoice
          agentToken="agt_test"
          autoConnect={false}
          onDisconnected={onDisconnected}
        />
      )

      act(() => {
        mockClient._emit("disconnected")
      })

      expect(onDisconnected).toHaveBeenCalled()
    })
  })

  describe("connect/disconnect controls", () => {
    it("should call connect when clicking button in idle state", async () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      fireEvent.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(mockClient.connect).toHaveBeenCalled()
      })
    })

    it("should call disconnect when clicking button in connected state", async () => {
      render(
        <ChansVoice agentToken="agt_test" autoConnect={false}>
          {({ isConnected, connect, disconnect }) => (
            <button onClick={isConnected ? disconnect : connect}>
              {isConnected ? "Stop" : "Start"}
            </button>
          )}
        </ChansVoice>
      )

      // Simulate connected state
      act(() => {
        mockClient._emit("stateChange", "listening")
      })

      expect(screen.getByRole("button")).toHaveTextContent("Stop")

      fireEvent.click(screen.getByRole("button"))

      await waitFor(() => {
        expect(mockClient.disconnect).toHaveBeenCalled()
      })
    })

    it("should expose connect/disconnect in render props", () => {
      const connectFn = vi.fn()
      const disconnectFn = vi.fn()

      render(
        <ChansVoice agentToken="agt_test" autoConnect={false}>
          {({ connect, disconnect }) => (
            <>
              <button data-testid="connect" onClick={connect}>
                Connect
              </button>
              <button data-testid="disconnect" onClick={disconnect}>
                Disconnect
              </button>
            </>
          )}
        </ChansVoice>
      )

      fireEvent.click(screen.getByTestId("connect"))
      expect(mockClient.connect).toHaveBeenCalled()

      fireEvent.click(screen.getByTestId("disconnect"))
      expect(mockClient.disconnect).toHaveBeenCalled()
    })
  })

  describe("default UI states", () => {
    it("should show 'Click to start' in idle state", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)
      expect(screen.getByText("Click to start")).toBeInTheDocument()
    })

    it("should show 'Connecting...' in connecting state", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      act(() => {
        mockClient._emit("stateChange", "connecting")
      })

      expect(screen.getByText("Connecting...")).toBeInTheDocument()
    })

    it("should show 'Listening...' in listening state", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      act(() => {
        mockClient._emit("stateChange", "listening")
      })

      expect(screen.getByText("Listening...")).toBeInTheDocument()
    })

    it("should show 'Agent speaking' in speaking state", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      act(() => {
        mockClient._emit("stateChange", "speaking")
      })

      expect(screen.getByText("Agent speaking")).toBeInTheDocument()
    })

    it("should show error message when error occurs", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      act(() => {
        mockClient._emit("error", new Error("Connection failed"))
        mockClient._emit("stateChange", "error")
      })

      expect(screen.getByText("Connection failed")).toBeInTheDocument()
    })

    it("should disable button in connecting state", () => {
      render(<ChansVoice agentToken="agt_test" autoConnect={false} />)

      act(() => {
        mockClient._emit("stateChange", "connecting")
      })

      expect(screen.getByRole("button")).toBeDisabled()
    })
  })
})

describe("useChans", () => {
  let mockClient: ReturnType<typeof createMockClient>

  beforeEach(() => {
    mockClient = createMockClient()
    currentMockClient = mockClient
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should throw error when used outside ChansVoice", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    function TestComponent() {
      useChans()
      return null
    }

    expect(() => render(<TestComponent />)).toThrow(
      "useChans must be used within a ChansVoice component"
    )

    consoleSpy.mockRestore()
  })

  it("should provide context values when used inside ChansVoice", () => {
    function ChildComponent() {
      const { state, isConnected } = useChans()
      return (
        <div>
          <span data-testid="state">{state}</span>
          <span data-testid="connected">{isConnected ? "yes" : "no"}</span>
        </div>
      )
    }

    render(
      <ChansVoice agentToken="agt_test" autoConnect={false}>
        {() => <ChildComponent />}
      </ChansVoice>
    )

    expect(screen.getByTestId("state")).toHaveTextContent("idle")
    expect(screen.getByTestId("connected")).toHaveTextContent("no")
  })

  it("should update when state changes", () => {
    function ChildComponent() {
      const { state } = useChans()
      return <span data-testid="state">{state}</span>
    }

    render(
      <ChansVoice agentToken="agt_test" autoConnect={false}>
        {() => <ChildComponent />}
      </ChansVoice>
    )

    act(() => {
      mockClient._emit("stateChange", "listening")
    })

    expect(screen.getByTestId("state")).toHaveTextContent("listening")
  })
})
