import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Thread } from "./Thread.js"
import { ThreadNotFoundError } from "./errors.js"
import {
  createMockClient,
  mockChatInvocation,
  mockSessionEventListResponse,
  mockSessionMessageEvent,
  mockThreadListResponse,
  mockThreadListItem,
  mockThreadMessageListResponse,
  mockThreadMessageItem,
  mockThreadNotFound,
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

  describe("sendMessage", () => {
    it("should send a message to the thread", async () => {
      const mockResponse = mockChatInvocation({
        agent_id: "agent_123",
        thread_id: "thread_456",
      })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("threads/thread_456/messages")
        expect(method).toBe("post")
        expect(body).toEqual({ message: "Follow up" })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const result = await thread.sendMessage({ message: "Follow up" })

      expect(result).toEqual(mockResponse)
    })

    it("should send attachments-only requests", async () => {
      const mockResponse = mockChatInvocation()

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("threads/thread_456/messages")
        expect(method).toBe("post")
        expect(body).toEqual({
          attachments: [
            {
              file_upload: { id: "upload_123" },
              name: "spec.pdf",
            },
          ],
        })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await thread.sendMessage({
        attachments: [{ fileUploadId: "upload_123", name: "spec.pdf" }],
      })
    })

    it("should forward metadata and promptContext in request body", async () => {
      const mockResponse = mockChatInvocation()

      const mockClient = createMockClient(async ({ body }) => {
        expect(body).toEqual({
          message: "Hello",
          metadata: { user_id: "external-user-1" },
          prompt_context: "Extra context.",
        })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await thread.sendMessage({
        message: "Hello",
        metadata: { user_id: "external-user-1" },
        promptContext: "Extra context.",
      })
    })

    it("should throw ThreadNotFoundError when thread doesn't exist", async () => {
      const mockClient = createMockClient(async () => {
        throw mockThreadNotFound("thread_456")
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await expect(
        thread.sendMessage({ message: "Hello" }),
      ).rejects.toBeInstanceOf(ThreadNotFoundError)
    })

    it("should validate missing message and attachments", async () => {
      const mockClient = createMockClient(async () => {
        throw new Error("Should not be called")
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await expect(
        thread.sendMessage({ message: "   " }),
      ).rejects.toMatchObject({
        code: "validation_error",
        message: "Either message or attachments is required.",
      })
    })

    it("should not swallow non-thread-not-found errors", async () => {
      const mockClient = createMockClient(async () => {
        throw mockValidationError("Bad request.")
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await expect(
        thread.sendMessage({ message: "Hello" }),
      ).rejects.toMatchObject({
        code: "validation_error",
        message: "Bad request.",
      })
    })
  })

  describe("queryEvents", () => {
    it("should query session events for the thread", async () => {
      const mockResponse = mockSessionEventListResponse({
        results: [
          mockSessionMessageEvent({
            id: "evt_1",
            sequence: 1,
            type: "user.message",
          }),
          mockSessionMessageEvent({
            id: "evt_2",
            sequence: 2,
            type: "agent.message",
          }),
        ],
      })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("sessions/thread_456/events/query")
        expect(method).toBe("post")
        expect(body).toEqual({})
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      const result = await thread.queryEvents()

      expect(result.results).toHaveLength(2)
      expect(result.type).toBe("session_event")
      expect(result.session_event).toEqual({})
    })

    it("should forward filter, sorts, and pagination in body", async () => {
      const mockResponse = mockSessionEventListResponse({
        results: [],
      })

      const mockClient = createMockClient(async ({ body }) => {
        expect(body).toEqual({
          filter: {
            or: [
              { property: "type", event_type: { equals: "user.message" } },
              { property: "type", event_type: { equals: "agent.message" } },
            ],
          },
          sorts: [{ property: "sequence", direction: "descending" }],
          start_cursor: "cursor_abc",
          page_size: 10,
        })
        return mockResponse
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await thread.queryEvents({
        filter: {
          or: [
            { property: "type", event_type: { equals: "user.message" } },
            { property: "type", event_type: { equals: "agent.message" } },
          ],
        },
        sorts: [{ property: "sequence", direction: "descending" }],
        start_cursor: "cursor_abc",
        page_size: 10,
      })
    })

    it("should throw ThreadNotFoundError when the thread does not exist", async () => {
      const mockClient = createMockClient(async () => {
        throw mockThreadNotFound("thread_456")
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await expect(thread.queryEvents()).rejects.toBeInstanceOf(
        ThreadNotFoundError,
      )
    })

    it("should not swallow other errors", async () => {
      const mockClient = createMockClient(async () => {
        throw mockValidationError("Invalid start_cursor.")
      })

      const thread = new Thread({
        client: mockClient,
        threadId: "thread_456",
        agentId: "agent_123",
      })

      await expect(thread.queryEvents()).rejects.toMatchObject({
        code: "validation_error",
        message: "Invalid start_cursor.",
      })
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
