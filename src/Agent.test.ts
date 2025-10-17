import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Agent } from "./Agent.js"
import {
  createMockClient,
  mockChatInvocation,
  mockThreadListResponse,
  mockThreadListItem,
  mockStreamResponse,
} from "./test-utils/index.js"
import { StreamChunk } from "./types.js"

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
  })

  describe("chatStream", () => {
    it("should stream chat responses", async () => {
      const chunks = [
        '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
        '{"type":"message","role":"user","content":"Hello"}\n',
        '{"type":"message","role":"agent","content":"Hi there!"}\n',
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

      const messages: Array<{ role: "user" | "agent"; content: string }> = []

      const generator = agent.chatStream({
        message: "Hello",
        onMessage: (msg) => messages.push(msg),
      })

      const receivedChunks: StreamChunk[] = []
      for await (const chunk of generator) {
        receivedChunks.push(chunk)
      }

      expect(receivedChunks).toHaveLength(4)
      expect(receivedChunks[0]).toEqual({
        type: "started",
        thread_id: "thread_123",
        agent_id: "agent_123",
      })
      expect(messages).toHaveLength(2)
      expect(messages[0]).toEqual({ role: "user", content: "Hello" })
      expect(messages[1]).toEqual({ role: "agent", content: "Hi there!" })

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

      const generator = agent.chatStream({ message: "Hello" })

      await expect(async () => {
        for await (const chunk of generator) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          chunk
        }
      }).rejects.toThrow("[internal_server_error] Something went wrong")
    })
  })
})
