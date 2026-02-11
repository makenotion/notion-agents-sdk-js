import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Thread } from "./Thread.js"
import {
  createMockClient,
  mockThreadListResponse,
  mockThreadListItem,
  mockThreadMessageListResponse,
  mockThreadMessageItem,
  mockValidationError,
} from "./test-utils/index.js"

describe("Thread", () => {
  describe("get", () => {
    it("should get thread using listThreads with id filter", async () => {
      const mockResponse = mockThreadListResponse({
        results: [
          mockThreadListItem({
            id: "thread_456",
            status: "completed",
            title: "My Thread",
          }),
        ],
      })

      const mockClient = createMockClient(async ({ path, method, query }) => {
        expect(path).toBe("agents/agent_123/threads")
        expect(method).toBe("get")
        expect(query).toEqual({ id: "thread_456" })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const result = await thread.get()

      expect(result).toEqual(mockResponse.results[0])
      expect(result.status).toBe("completed")
      expect(result.title).toBe("My Thread")
    })

    it("should throw error if thread not found", async () => {
      const mockResponse = mockThreadListResponse({
        results: [],
      })

      const mockClient = createMockClient(async () => mockResponse)

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await expect(thread.get()).rejects.toThrow("Thread thread_456 not found")
    })
  })

  describe("listMessages", () => {
    it("should list messages with pagination", async () => {
      const mockResponse = mockThreadMessageListResponse({
        results: [
          mockThreadMessageItem({
            id: "msg_1",
            role: "user",
            content: "Hello",
          }),
          mockThreadMessageItem({
            id: "msg_2",
            role: "agent",
            content: "Hi!",
          }),
        ],
        has_more: true,
        next_cursor: "cursor_123",
      })

      const mockClient = createMockClient(async ({ path, method, query }) => {
        expect(path).toBe("threads/thread_456/messages")
        expect(method).toBe("get")
        expect(query).toEqual({
          page_size: 20,
          start_cursor: "prev_cursor",
        })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const result = await thread.listMessages({
        page_size: 20,
        start_cursor: "prev_cursor",
      })

      expect(result.results).toHaveLength(2)
      expect(result.has_more).toBe(true)
      expect(result.next_cursor).toBe("cursor_123")
    })

    it("should filter messages by role", async () => {
      const mockResponse = mockThreadMessageListResponse({
        results: [mockThreadMessageItem({ role: "agent" })],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({ role: "agent" })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const result = await thread.listMessages({ role: "agent" })

      expect(result.results[0].role).toBe("agent")
    })

    it("should include verbose param", async () => {
      const mockResponse = mockThreadMessageListResponse()

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({ verbose: "false" })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await thread.listMessages({ verbose: false })
    })
  })

  describe("poll", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("should poll until thread completes", async () => {
      let callCount = 0

      const mockClient = createMockClient(async () => {
        callCount++
        return mockThreadListResponse({
          results: [
            mockThreadListItem({
              id: "thread_456",
              status: callCount < 3 ? "pending" : "completed",
            }),
          ],
        })
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const onPending = vi.fn()

      const pollPromise = thread.poll({
        maxAttempts: 10,
        initialDelayMs: 0,
        onPending,
      })

      await vi.runAllTimersAsync()

      const result = await pollPromise

      expect(result.status).toBe("completed")
      expect(callCount).toBe(3)
      expect(onPending).toHaveBeenCalledTimes(2)
    })

    it("should throw error when max attempts reached", async () => {
      const mockClient = createMockClient(async () => {
        return mockThreadListResponse({
          results: [mockThreadListItem({ status: "pending" })],
        })
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const pollPromise = thread.poll({
        maxAttempts: 2,
        initialDelayMs: 0,
      })

      const timersPromise = vi.runAllTimersAsync()

      await expect(pollPromise).rejects.toThrow(
        "Thread polling timed out after 2 attempts",
      )

      await timersPromise
    })

    it("should handle thread not found errors", async () => {
      let callCount = 0
      const mockClient = createMockClient(async () => {
        callCount++
        if (callCount < 3) {
          return mockThreadListResponse({ results: [] })
        }
        return mockThreadListResponse({
          results: [mockThreadListItem({ status: "completed" })],
        })
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const onThreadNotFound = vi.fn()

      const pollPromise = thread.poll({
        maxAttempts: 10,
        initialDelayMs: 0,
        onThreadNotFound,
      })

      await vi.runAllTimersAsync()

      const result = await pollPromise

      expect(result.status).toBe("completed")
      expect(onThreadNotFound).toHaveBeenCalledTimes(2)
    })

    it("should not treat validation_error as thread not found", async () => {
      const mockClient = createMockClient(async () => {
        throw mockValidationError("Thread does not belong to this agent")
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const onThreadNotFound = vi.fn()

      await expect(
        thread.poll({
          maxAttempts: 10,
          initialDelayMs: 0,
          onThreadNotFound,
        }),
      ).rejects.toMatchObject({
        code: "validation_error",
        message: "Thread does not belong to this agent",
      })

      expect(onThreadNotFound).not.toHaveBeenCalled()
    })
  })
})
