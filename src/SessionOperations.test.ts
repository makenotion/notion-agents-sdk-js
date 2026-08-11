import { describe, it, expect } from "vitest"
import { SessionOperations } from "./SessionOperations.js"
import {
  createMockClient,
  mockSession,
  mockSessionListResponse,
} from "./test-utils/index.js"

describe("SessionOperations", () => {
  describe("query", () => {
    it("should query sessions without parameters", async () => {
      const mockResponse = mockSessionListResponse({
        results: [
          mockSession({ id: "session_1", title: "Session 1" }),
          mockSession({ id: "session_2", title: "Session 2" }),
        ],
      })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("sessions/query")
        expect(method).toBe("post")
        expect(body).toEqual({})
        return mockResponse
      })

      const operations = new SessionOperations({ client: mockClient })

      const result = await operations.query()

      expect(result).toEqual(mockResponse)
      expect(result.type).toBe("session")
      expect(result.session).toEqual({})
      expect(result.results).toHaveLength(2)
    })

    it("should forward query, filter, sorts, and pagination in body", async () => {
      const mockResponse = mockSessionListResponse({ results: [] })

      const mockClient = createMockClient(async ({ path, method, body }) => {
        expect(path).toBe("sessions/query")
        expect(method).toBe("post")
        expect(body).toEqual({
          query: "sales",
          filter: {
            and: [
              { property: "agent_id", string: { equals: "agent_123" } },
              {
                property: "status",
                status: { in: ["in_progress", "completed"] },
              },
            ],
          },
          sorts: [{ property: "updated_at", direction: "descending" }],
          start_cursor: "cursor_abc",
          page_size: 25,
        })
        return mockResponse
      })

      const operations = new SessionOperations({ client: mockClient })

      await operations.query({
        query: "sales",
        filter: {
          and: [
            { property: "agent_id", string: { equals: "agent_123" } },
            {
              property: "status",
              status: { in: ["in_progress", "completed"] },
            },
          ],
        },
        sorts: [{ property: "updated_at", direction: "descending" }],
        start_cursor: "cursor_abc",
        page_size: 25,
      })
    })

    it("should surface pagination fields on the response", async () => {
      const mockResponse = mockSessionListResponse({
        results: [mockSession()],
        has_more: true,
        next_cursor: "cursor_next",
      })

      const mockClient = createMockClient(async () => mockResponse)

      const operations = new SessionOperations({ client: mockClient })

      const result = await operations.query({ page_size: 1 })

      expect(result.has_more).toBe(true)
      expect(result.next_cursor).toBe("cursor_next")
    })
  })
})
