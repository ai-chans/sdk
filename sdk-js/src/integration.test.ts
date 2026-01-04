/**
 * Integration tests for SDK <-> API contract.
 *
 * Prerequisites:
 * - Core API running at http://localhost:8080
 * - Test agent token configured in database
 *
 * Run with:
 *   CHANS_TEST_AGENT_TOKEN=agt_xxx pnpm test:integration
 *
 * These tests verify the API contract is correct.
 * Note: Full WebRTC/LiveKit tests require a browser environment.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { ChansClient } from "./index.js"

// Skip integration tests if no token provided
const TEST_AGENT_TOKEN = process.env.CHANS_TEST_AGENT_TOKEN
const API_URL = process.env.CHANS_TEST_API_URL || "http://localhost:8080"

const describeIntegration = TEST_AGENT_TOKEN ? describe : describe.skip

describeIntegration("SDK <-> API Contract", () => {
  beforeAll(() => {
    if (!TEST_AGENT_TOKEN) {
      throw new Error("CHANS_TEST_AGENT_TOKEN environment variable required")
    }
  })

  describe("POST /v1/session", () => {
    it("should return valid session response with correct fields", async () => {
      const response = await fetch(`${API_URL}/v1/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_token: TEST_AGENT_TOKEN,
          user_id: "contract-test",
        }),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)

      const session = await response.json()

      // Verify required fields exist and have correct types
      expect(session).toHaveProperty("session_id")
      expect(session).toHaveProperty("connection_token")
      expect(session).toHaveProperty("connection_url")

      expect(typeof session.session_id).toBe("string")
      expect(typeof session.connection_token).toBe("string")
      expect(typeof session.connection_url).toBe("string")

      // Verify format conventions
      expect(session.session_id).toMatch(/^ses_[a-f0-9]+$/)
      expect(session.connection_url).toMatch(/^wss?:\/\//)
    })

    it("should reject invalid agent token with 401", async () => {
      const response = await fetch(`${API_URL}/v1/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_token: "agt_invalid_token_12345",
        }),
      })

      expect(response.status).toBe(401)
      const error = await response.json()
      expect(error.detail).toBe("Invalid agent token")
    })

    it("should accept optional user_id field", async () => {
      // Without user_id
      const res1 = await fetch(`${API_URL}/v1/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_token: TEST_AGENT_TOKEN,
        }),
      })
      expect(res1.ok).toBe(true)

      // With user_id
      const res2 = await fetch(`${API_URL}/v1/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_token: TEST_AGENT_TOKEN,
          user_id: "test-user-123",
        }),
      })
      expect(res2.ok).toBe(true)
    })

    it("should reject missing agent_token with 422", async () => {
      const response = await fetch(`${API_URL}/v1/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(422) // Validation error
    })
  })

  describe("ChansClient error handling", () => {
    it("should handle network errors gracefully", async () => {
      const client = new ChansClient({
        agentToken: TEST_AGENT_TOKEN!,
        apiUrl: "http://localhost:99999", // Invalid port
        manualAudioHandling: true,
      })

      await expect(client.connect()).rejects.toThrow()
      expect(client.getState()).toBe("error")
    })

    it("should handle malformed API URL", async () => {
      const client = new ChansClient({
        agentToken: TEST_AGENT_TOKEN!,
        apiUrl: "not-a-valid-url",
        manualAudioHandling: true,
      })

      await expect(client.connect()).rejects.toThrow()
      expect(client.getState()).toBe("error")
    })

    it("should set error state on invalid token", async () => {
      const client = new ChansClient({
        agentToken: "agt_invalid_token_12345",
        apiUrl: API_URL,
        manualAudioHandling: true,
      })

      const errors: Error[] = []
      client.on("error", (err) => errors.push(err))

      await expect(client.connect()).rejects.toThrow("Invalid agent token")

      expect(client.getState()).toBe("error")
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain("Invalid agent token")
    })
  })
})
