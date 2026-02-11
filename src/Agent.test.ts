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
import {
  StreamChunk,
  StreamMessage,
  ThreadInfo,
  PERSONAL_AGENT_ID,
} from "./types.js"
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
        instruction: null,
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.chat({ message: "Hello" })

      expect(result).toEqual(mockResponse)
    })

    it("should work with personal agent", async () => {
      const mockResponse = mockChatInvocation({
        agent_id: PERSONAL_AGENT_ID,
        thread_id: "thread_789",
      })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe(`agents/${PERSONAL_AGENT_ID}/chat`)
        expect(method).toBe("post")
        expect(body).toEqual({ message: "Hello Notion AI" })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: PERSONAL_AGENT_ID,
        name: "Notion AI",
        instruction: null,
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.chat({ message: "Hello Notion AI" })

      expect(result).toEqual(mockResponse)
      expect(result.agent_id).toBe(PERSONAL_AGENT_ID)
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
        instruction: null,
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
        instruction: null,
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

    it("should list threads for personal agent", async () => {
      const mockResponse = mockThreadListResponse({
        results: [mockThreadListItem({ id: "thread_personal", title: "Chat" })],
      })

      const mockClient = createMockClient(async ({ path, method }) => {
        expect(path).toBe(`agents/${PERSONAL_AGENT_ID}/threads`)
        expect(method).toBe("get")
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: PERSONAL_AGENT_ID,
        name: "Notion AI",
        instruction: null,
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.listThreads()

      expect(result.results).toHaveLength(1)
      expect(result.results[0].id).toBe("thread_personal")
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
        instruction: null,
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const result = await agent.listThreads({ status: "completed" })

      expect(result.results[0].status).toBe("completed")
    })

    it("should filter threads by creator", async () => {
      const mockResponse = mockThreadListResponse()

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({
          created_by_type: "bot",
          created_by_id: "bot_123",
        })
        return mockResponse
      })

      const agent = new Agent({
        client: mockClient,
        id: "agent_123",
        name: "Test Agent",
        instruction: null,
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      await agent.listThreads({
        created_by_type: "bot",
        created_by_id: "bot_123",
      })
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
        instruction: null,
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

    it("should stream chat responses for personal agent", async () => {
      const chunks = [
        `{"type":"started","thread_id":"thread_456","agent_id":"${PERSONAL_AGENT_ID}"}\n`,
        '{"type":"message","id":"msg_user_1","role":"user","content":"Hello Notion AI"}\n',
        '{"type":"message","id":"msg_agent_1","role":"agent","content":"Hello! How can I help?"}\n',
        '{"type":"done","thread_id":"thread_456"}\n',
      ]

      mockFetch.mockResolvedValue(mockStreamResponse(chunks))

      const mockClient = createMockClient(vi.fn())

      const agent = new Agent({
        client: mockClient,
        id: PERSONAL_AGENT_ID,
        name: "Notion AI",
        instruction: null,
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      const messages: StreamMessage[] = []

      const generator = agent.chatStream({
        message: "Hello Notion AI",
        onMessage: (msg) => messages.push(msg),
      })

      const receivedChunks: StreamChunk[] = []
      while (true) {
        const { value, done } = await generator.next()
        if (done) break
        receivedChunks.push(value)
      }

      expect(receivedChunks).toHaveLength(4)
      expect(receivedChunks[0]).toEqual({
        type: "started",
        thread_id: "thread_456",
        agent_id: PERSONAL_AGENT_ID,
      })
      expect(messages).toHaveLength(2)

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.notion.com/v1/agents/${PERSONAL_AGENT_ID}/chatStream`,
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

    it("should handle errors in stream", async () => {
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
        instruction: null,
        baseUrl: "https://api.notion.com",
        auth: "test_token",
      })

      try {
        for await (const chunk of agent.chatStream({ message: "Hello" })) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          chunk
        }
        throw new Error("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(StreamError)
        expect((error as StreamError).code).toBe("internal_server_error")
        expect((error as StreamError).message).toBe("Something went wrong")
      }
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
