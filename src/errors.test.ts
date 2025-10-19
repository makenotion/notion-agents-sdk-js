import { describe, it, expect } from "vitest"
import {
  NotionAgentsError,
  AgentNotFoundError,
  ThreadNotFoundError,
  PollingTimeoutError,
  StreamError,
} from "./errors.js"

describe("Error classes", () => {
  describe("NotionAgentsError", () => {
    it("should create a base error with code", () => {
      const error = new NotionAgentsError("Test error", "test_code")

      expect(error.message).toBe("Test error")
      expect(error.code).toBe("test_code")
      expect(error.name).toBe("NotionAgentsError")
      expect(error instanceof Error).toBe(true)
      expect(error instanceof NotionAgentsError).toBe(true)
    })

    it("should default to unknown_error code", () => {
      const error = new NotionAgentsError("Test error")

      expect(error.code).toBe("unknown_error")
    })
  })

  describe("AgentNotFoundError", () => {
    it("should create error with agent ID", () => {
      const error = new AgentNotFoundError("agent_123")

      expect(error.message).toBe("Agent agent_123 not found")
      expect(error.code).toBe("agent_not_found")
      expect(error.agentId).toBe("agent_123")
      expect(error.name).toBe("AgentNotFoundError")
      expect(error instanceof NotionAgentsError).toBe(true)
    })
  })

  describe("ThreadNotFoundError", () => {
    it("should create error with thread ID", () => {
      const error = new ThreadNotFoundError("thread_123")

      expect(error.message).toBe("Thread thread_123 not found")
      expect(error.code).toBe("thread_not_found")
      expect(error.threadId).toBe("thread_123")
      expect(error.name).toBe("ThreadNotFoundError")
      expect(error instanceof NotionAgentsError).toBe(true)
    })
  })

  describe("PollingTimeoutError", () => {
    it("should create error with attempt count", () => {
      const error = new PollingTimeoutError(60)

      expect(error.message).toBe("Thread polling timed out after 60 attempts")
      expect(error.code).toBe("polling_timeout")
      expect(error.attempts).toBe(60)
      expect(error.name).toBe("PollingTimeoutError")
      expect(error instanceof NotionAgentsError).toBe(true)
    })
  })

  describe("StreamError", () => {
    it("should create error with custom code", () => {
      const error = new StreamError("Rate limited", "rate_limited")

      expect(error.message).toBe("Rate limited")
      expect(error.code).toBe("rate_limited")
      expect(error.name).toBe("StreamError")
      expect(error instanceof NotionAgentsError).toBe(true)
    })
  })
})
