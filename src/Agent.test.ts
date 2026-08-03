import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Agent } from "./Agent.js"
import {
  createMockClient,
  mockChatInvocation,
  mockThreadListResponse,
  mockThreadListItem,
  mockStreamResponse,
  mockHTTPErrorResponse,
  mockAgentNotFound,
  mockThreadNotFound,
  mockValidationError,
} from "./test-utils/index.js"
import { StreamChunk, StreamMessage, ThreadInfo } from "./types.js"
import { AgentNotFoundError, StreamError, ThreadNotFoundError } from "./errors.js"

describe("Agent", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("chat", () => {
    it("should start a new chat", async () => {
      const mockResponse = mockChatInvocation({
        agent_id: "agent_123",
        thread_id: "thread_456",
      })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("agents/agent_123/chat")
        expect(method).toBe("post")
        expect(body).toEqual({ message: "Hello" })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        name: "Test Agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.chat({ message: "Hello" })

      expect(result).toEqual(mockResponse)
    })

    it("should throw AgentNotFoundError when agent doesn't exist", async () => {
      const mockClient = createMockClient(async () => {
        throw mockAgentNotFound("invalid_agent")
      })

      const agent = new Agent({
        client: mockClient,
        id: "invalid_agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await expect(agent.chat({ message: "Hello" })).rejects.toThrow(
        "Agent invalid_agent not found",
      )
    })

    it("should not throw AgentNotFoundError for validation_error", async () => {
      const mockClient = createMockClient(async () => {
        throw mockValidationError("Agent is not published or configured.")
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      try {
        await agent.chat({ message: "Hello" })
        throw new Error("Should have thrown")
      } catch (error) {
        expect(error).not.toBeInstanceOf(AgentNotFoundError)
        expect(error).toMatchObject({
          code: "validation_error",
          message: "Agent is not published or configured.",
        })
      }
    })

    it("should throw ThreadNotFoundError when threadId doesn't exist", async () => {
      const mockClient = createMockClient(async () => {
        throw mockThreadNotFound("thread_456")
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await expect(
        agent.chat({ message: "Hello", threadId: "thread_456" }),
      ).rejects.toBeInstanceOf(ThreadNotFoundError)
    })

    it("should continue an existing chat with threadId", async () => {
      const mockResponse = mockChatInvocation()

      const mockClient = createMockClient(async ({ body }) => {
        expect(body).toEqual({
          message: "Follow up",
          thread_id: "thread_456",
        })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        name: "Test Agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await agent.chat({ message: "Follow up", threadId: "thread_456" })
    })

    it("should start a new chat with attachments", async () => {
      const mockResponse = mockChatInvocation({
        agent_id: "agent_123",
        thread_id: "thread_attachments",
      })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("agents/agent_123/chat")
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

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.chat({
        attachments: [{ fileUploadId: "upload_123", name: "spec.pdf" }],
      })

      expect(result).toEqual(mockResponse)
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

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await agent.chat({
        message: "Hello",
        metadata: { user_id: "external-user-1" },
        promptContext: "Extra context.",
      })
    })

    it("should validate missing message and attachments", async () => {
      const mockClient = createMockClient(async () => {
        throw new Error("Should not be called")
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await expect(agent.chat({ message: "   " })).rejects.toMatchObject({
        code: "validation_error",
        message: "Either message or attachments is required.",
      })
    })
  })

  describe("listThreads", () => {
    it("should list threads with pagination", async () => {
      const mockResponse = mockThreadListResponse({
        results: [
          mockThreadListItem({ id: "thread_1", title: "Thread 1" }),
          mockThreadListItem({ id: "thread_2", title: "Thread 2" }),
        ],
        has_more: true,
        next_cursor: "cursor_123",
      })

      const mockClient = createMockClient(async ({ path, method, query }) => {
        expect(path).toBe("agents/agent_123/threads")
        expect(method).toBe("get")
        expect(query).toEqual({
          page_size: 10,
          start_cursor: "prev_cursor",
        })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        name: "Test Agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.listThreads({
        page_size: 10,
        start_cursor: "prev_cursor",
      })

      expect(result.results).toHaveLength(2)
      expect(result.has_more).toBe(true)
      expect(result.next_cursor).toBe("cursor_123")
    })

    it("should filter threads by status", async () => {
      const mockResponse = mockThreadListResponse({
        results: [mockThreadListItem({ status: "completed" })],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({ status: "completed" })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        name: "Test Agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.listThreads({ status: "completed" })

      expect(result.results[0].status).toBe("completed")
    })

    it("should filter threads by id", async () => {
      const mockResponse = mockThreadListResponse({
        results: [mockThreadListItem({ id: "thread_specific" })],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({ id: "thread_specific" })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.listThreads({ id: "thread_specific" })

      expect(result.results[0].id).toBe("thread_specific")
    })

    it("should throw AgentNotFoundError when agent doesn't exist", async () => {
      const mockClient = createMockClient(async () => {
        throw mockAgentNotFound("invalid_agent")
      })

      const agent = new Agent({
        client: mockClient,
        id: "invalid_agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await expect(agent.listThreads()).rejects.toThrow(
        "Agent invalid_agent not found",
      )
    })
  })

  describe("continueThread", () => {
    it("should post to the thread continue endpoint", async () => {
      const mockResponse = mockChatInvocation({
        agent_id: "agent_123",
        thread_id: "thread_456",
      })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("threads/thread_456/continue")
        expect(method).toBe("post")
        expect(body).toEqual({
          action_id: "action_1",
          option_id: "reject",
        })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.continueThread("thread_456", {
        actionId: "action_1",
        optionId: "reject",
      })

      expect(result).toEqual(mockResponse)
    })
  })

  describe("getThread", () => {
    it("should get thread", async () => {
      const mockResponse = mockThreadListResponse({
        results: [
          mockThreadListItem({
            id: "thread_456",
            status: "pending",
            title: "Test Thread",
          }),
        ],
      })

      const mockClient = createMockClient(async ({ path, query }) => {
        expect(path).toBe("agents/agent_123/threads")
        expect(query).toEqual({ id: "thread_456" })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.getThread("thread_456")

      expect(result.status).toBe("pending")
      expect(result.title).toBe("Test Thread")
    })
  })

  describe("chatStream", () => {
    it("should stream chat responses", async () => {
      const chunks = [
        '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
        '{"type":"message","id":"msg_user_1","role":"user","content":"Hello"}\n',
        '{"type":"message","id":"msg_agent_1","role":"agent","content":"Hi there!"}\n',
        '{"type":"done","thread_id":"thread_123"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        name: "Test Agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const messages: StreamMessage[] = []

      const generator = agent.chatStream({
        message: "Hello",
        onMessage: (msg) => messages.push(msg),
      })

      const receivedChunks: StreamChunk[] = []
      let threadInfo: ThreadInfo | undefined = undefined
      while (true) {
        const { value, done } = await generator.next()
        if (done) {
          threadInfo = value
          break
        }
        receivedChunks.push(value)
      }

      expect(receivedChunks).toHaveLength(4)
      expect(receivedChunks[0]).toEqual({
        type: "started",
        thread_id: "thread_123",
        agent_id: "agent_123",
      })
      expect(messages).toHaveLength(2)
      expect(messages[0]).toMatchObject({
        id: "msg_user_1",
        role: "user",
        content: "Hello",
      })
      expect(messages[1]).toMatchObject({
        id: "msg_agent_1",
        role: "agent",
        content: "Hi there!",
      })

      expect(threadInfo).toMatchObject({
        thread_id: "thread_123",
        agent_id: "agent_123",
        messages: expect.any(Array),
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/agents/agent_123/chatStream",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test_token",
          }),
        }),
      )
    })

    it("should include verbose=false query param when requested", async () => {
      const chunks = [
        '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
        '{"type":"message","id":"msg_user_1","role":"user","content":"Hello"}\n',
        '{"type":"done","thread_id":"thread_123"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())
      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const generator = agent.chatStream({ message: "Hello", verbose: false })
      while (true) {
        const { done } = await generator.next()
        if (done) break
      }

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/agents/agent_123/chatStream?verbose=false",
        expect.any(Object),
      )
    })

    it("should send attachments-only requests", async () => {
      const chunks = [
        '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
        '{"type":"message","id":"msg_user_1","role":"user","content":"","attachments":[{"name":"spec.pdf","content_type":"application/pdf","url":"https://example.com/spec.pdf"}]}\n',
        '{"type":"done","thread_id":"thread_123"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())
      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const generator = agent.chatStream({
        attachments: [{ fileUploadId: "upload_123", name: "spec.pdf" }],
      })
      while (true) {
        const { done } = await generator.next()
        if (done) break
      }

      const fetchInit = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined
      expect(fetchInit?.body).toBe(
        JSON.stringify({
          attachments: [
            {
              file_upload: { id: "upload_123" },
              name: "spec.pdf",
            },
          ],
        }),
      )
    })

    it("should forward metadata and promptContext in stream request body", async () => {
      const chunks = [
        '{"type":"started","thread_id":"thread_123","agent_id":"agent_123","metadata":{"user_id":"external-user-1"}}\n',
        '{"type":"done","thread_id":"thread_123","metadata":{"user_id":"external-user-1"}}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())
      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const received: StreamChunk[] = []
      const generator = agent.chatStream({
        message: "Hello",
        metadata: { user_id: "external-user-1" },
        promptContext: "Extra context.",
      })
      while (true) {
        const { value, done } = await generator.next()
        if (done) break
        received.push(value)
      }

      const fetchInit = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined
      expect(fetchInit?.body).toBe(
        JSON.stringify({
          message: "Hello",
          metadata: { user_id: "external-user-1" },
          prompt_context: "Extra context.",
        }),
      )

      expect(received[0]).toEqual({
        type: "started",
        thread_id: "thread_123",
        agent_id: "agent_123",
        metadata: { user_id: "external-user-1" },
      })
      expect(received[received.length - 1]).toEqual({
        type: "done",
        thread_id: "thread_123",
        metadata: { user_id: "external-user-1" },
      })
    })

    it("should upsert cumulative agent messages by id", async () => {
      const chunks = [
        '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
        '{"type":"message","id":"msg_user_1","role":"user","content":"Hello"}\n',
        '{"type":"message","id":"msg_agent_1","role":"agent","content":"Hi"}\n',
        '{"type":"message","id":"msg_agent_1","role":"agent","content":"Hi there!"}\n',
        '{"type":"done","thread_id":"thread_123"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())
      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const generator = agent.chatStream({ message: "Hello" })
      const received: StreamChunk[] = []
      let threadInfo: ThreadInfo | undefined = undefined
      while (true) {
        const { value, done } = await generator.next()
        if (done) {
          threadInfo = value
          break
        }
        received.push(value)
      }

      expect(received).toHaveLength(5)
      expect(threadInfo).toMatchObject({
        thread_id: "thread_123",
        agent_id: "agent_123",
        messages: [
          { id: "msg_user_1", role: "user", content: "Hello" },
          { id: "msg_agent_1", role: "agent", content: "Hi there!" },
        ],
      })
    })

    it("should throw stream errors without yielding them", async () => {
      const chunks = [
        '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
        '{"type":"error","code":"internal_server_error","message":"Something went wrong"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        name: "Test Agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const generator = agent.chatStream({ message: "Hello" })
      await expect(generator.next()).resolves.toMatchObject({
        done: false,
        value: { type: "started" },
      })
      await expect(generator.next()).rejects.toMatchObject({
        name: "StreamError",
        code: "internal_server_error",
        message: "Something went wrong",
      })
    })

    it("should throw AgentNotFoundError for an agent-not-found stream error", async () => {
      const chunks = [
        '{"type":"error","code":"object_not_found","message":"Could not find agent with ID: invalid_agent"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())
      const agent = new Agent({
        client: mockClient,
        id: "invalid_agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await expect(
        agent.chatStream({ message: "Hello" }).next(),
      ).rejects.toMatchObject({
        name: "AgentNotFoundError",
        code: "agent_not_found",
        agentId: "invalid_agent",
      })
    })

    it("should throw ThreadNotFoundError for a thread-not-found stream error", async () => {
      const chunks = [
        '{"type":"error","code":"object_not_found","message":"Could not find thread with ID: invalid_thread"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())
      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await expect(
        agent
          .chatStream({ message: "Hello", threadId: "invalid_thread" })
          .next(),
      ).rejects.toMatchObject({
        name: "ThreadNotFoundError",
        code: "thread_not_found",
        threadId: "invalid_thread",
      })
    })

    it("should handle HTTP 404 errors", async () => {
      mockFetch.mockResolvedValue(
        mockHTTPErrorResponse(404, "Not Found", {
          code: "object_not_found",
          message: "Agent not found",
        }),
      )

      const mockClient = createMockClient(vi.fn())

      const agent = new Agent({
        client: mockClient,
        id: "invalid_agent",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      try {
        const generator = agent.chatStream({ message: "Hello" })
        for await (const chunk of generator) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          chunk
        }
        throw new Error("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(StreamError)
        expect((error as StreamError).code).toBe("http_error")
        expect((error as StreamError).message).toBe("HTTP 404: Not Found")
      }
    })

    it("should handle HTTP 401 unauthorized errors", async () => {
      mockFetch.mockResolvedValue(
        mockHTTPErrorResponse(401, "Unauthorized", {
          code: "unauthorized",
          message: "Invalid token",
        }),
      )

      const mockClient = createMockClient(vi.fn())

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "bad_token",
      })

      try {
        const generator = agent.chatStream({ message: "Hello" })
        for await (const chunk of generator) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          chunk
        }
        throw new Error("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(StreamError)
        expect((error as StreamError).code).toBe("http_error")
        expect((error as StreamError).message).toBe("HTTP 401: Unauthorized")
      }
    })

    it("should throw StreamError when response body is missing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: null,
        status: 200,
        statusText: "OK",
      })

      const mockClient = createMockClient(vi.fn())

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      try {
        const generator = agent.chatStream({ message: "Hello" })
        for await (const chunk of generator) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          chunk
        }
        throw new Error("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(StreamError)
        expect((error as StreamError).code).toBe("missing_response_body")
        expect((error as StreamError).message).toBe("No response body")
      }
    })

    it("should throw StreamError when stream doesn't provide thread_id", async () => {
      const chunks = [
        '{"type":"message","id":"msg_user_1","role":"user","content":"Hello"}\n',
        '{"type":"done","thread_id":"thread_123"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      try {
        const generator = agent.chatStream({ message: "Hello" })
        for await (const chunk of generator) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          chunk
        }
        throw new Error("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(StreamError)
        expect((error as StreamError).code).toBe("invalid_stream_response")
        expect((error as StreamError).message).toBe(
          "Stream did not provide required thread_id or agent_id",
        )
      }
    })
  })
})
