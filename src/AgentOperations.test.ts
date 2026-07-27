import { describe, it, expect, vi } from "vitest"
import { AgentOperations } from "./AgentOperations.js"
import {
  createMockClient,
  mockAgentListResponse,
  mockAgentData,
} from "./test-utils/index.js"

describe("AgentOperations", () => {
  describe("list", () => {
    it("should list all agents without parameters", async () => {
      const mockResponse = mockAgentListResponse({
        results: [
          mockAgentData({ id: "agent_1", name: "Agent 1" }),
          mockAgentData({ id: "agent_2", name: "Agent 2" }),
        ],
      })

      const mockClient = createMockClient(async ({ path, method }) => {
        expect(path).toBe("agents")
        expect(method).toBe("get")
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const result = await operations.list()

      expect(result).toEqual(mockResponse)
      expect(result.results).toHaveLength(2)
    })

    it("should support pagination parameters", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData()],
        has_more: true,
        next_cursor: "cursor_123",
      })

      const mockClient = createMockClient(async ({ path, method, query }) => {
        expect(path).toBe("agents")
        expect(method).toBe("get")
        expect(query).toEqual({
          page_size: 5,
          start_cursor: "prev_cursor",
        })
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const result = await operations.list({
        page_size: 5,
        start_cursor: "prev_cursor",
      })

      expect(result.has_more).toBe(true)
      expect(result.next_cursor).toBe("cursor_123")
    })

    it("should support name filtering", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData({ name: "Sales Agent" })],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({ name: "Sales" })
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const result = await operations.list({ name: "Sales" })

      expect(result.results[0].name).toBe("Sales Agent")
    })

    it("should support created_by filtering", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData()],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({ created_by: ["me", "user_123"] })
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const result = await operations.list({
        created_by: ["me", "user_123"],
      })

      expect(result.results).toHaveLength(1)
    })

    it("should omit created_by when the filter is empty", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData()],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({})
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      await operations.list({ created_by: [] })
    })

    it("should support agent_type filtering", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData()],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({
          agent_type: ["custom_agent", "external"],
        })
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const result = await operations.list({
        agent_type: ["custom_agent", "external"],
      })

      expect(result.results).toHaveLength(1)
    })

    it("should omit agent_type when the filter is empty", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData()],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({})
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      await operations.list({ agent_type: [] })
    })

    it("should support agent_ids filtering", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData()],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({
          agent_ids: [
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          ],
        })
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const result = await operations.list({
        agent_ids: [
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ],
      })

      expect(result.results).toHaveLength(1)
    })

    it("should omit agent_ids when the filter is empty", async () => {
      const mockResponse = mockAgentListResponse({
        results: [mockAgentData()],
      })

      const mockClient = createMockClient(async ({ query }) => {
        expect(query).toEqual({})
        return mockResponse
      })

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      await operations.list({ agent_ids: [] })
    })
  })

  describe("agent", () => {
    it("should create an agent instance", () => {
      const mockClient = createMockClient(vi.fn())

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const agent = operations.agent("agent_123")

      expect(agent.id).toBe("agent_123")
    })
  })
})
