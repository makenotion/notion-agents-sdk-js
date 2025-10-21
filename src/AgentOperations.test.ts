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

    it("should create personal agent instance", () => {
      const mockClient = createMockClient(vi.fn())

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const agent = operations.agent("personal")

      expect(agent.id).toBe("personal")
    })
  })

  describe("personal", () => {
    it("should create personal agent instance", () => {
      const mockClient = createMockClient(vi.fn())

      const operations = new AgentOperations({
        client: mockClient,
        auth: "test_token",
        baseUrl: "https://api.notion.com",
      })

      const agent = operations.personal()

      expect(agent.id).toBe("personal")
    })
  })
})
