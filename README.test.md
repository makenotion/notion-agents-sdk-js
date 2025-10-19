# Testing guide

This SDK includes a lightweight testing setup using Vitest and custom mock utilities.

## Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test utilities

The SDK provides test utilities to make mocking API responses easy:

### Mock client factory

Create a mock Notion client with custom request handlers:

```typescript
import { createMockClient, mockAgentListResponse } from "./test-utils"

const mockClient = createMockClient(async ({ path, method, query, body }) => {
  // Return mock data based on the request
  if (path === "agents" && method === "get") {
    return mockAgentListResponse()
  }
})
```

### Response factories

Pre-built factory functions for common response types:

```typescript
import {
  mockAgentData,
  mockAgentListResponse,
  mockChatInvocation,
  mockThreadListResponse,
  mockThreadMessageListResponse,
} from "./test-utils"

// Create mock agent data
const agent = mockAgentData({ id: "custom_id", name: "Custom Agent" })

// Create paginated response
const response = mockAgentListResponse({
  results: [agent],
  has_more: true,
  next_cursor: "cursor_123",
})
```

### Error mocking

Use realistic Notion API error mocks that match the actual SDK error format:

```typescript
import {
  mockAgentNotFound,
  mockThreadNotFound,
  mockValidationError,
  mockRateLimitError,
  mockUnauthorizedError,
} from "./test-utils"

it("should handle agent not found", async () => {
  const mockClient = createMockClient(async () => {
    throw mockAgentNotFound("invalid_agent")
  })

  const agent = new Agent({
    client: mockClient,
    id: "invalid_agent",
    // ...
  })

  await expect(agent.chat({ message: "Hello" })).rejects.toThrow(
    "Agent invalid_agent not found",
  )
})

it("should handle rate limiting", async () => {
  const mockClient = createMockClient(async () => {
    throw mockRateLimitError()
  })

  // Test rate limit handling...
})
```

These mocks include the proper error shape with `code`, `status`, and `message` fields that match the Notion SDK's actual error format.

### Mock streaming responses

Test streaming functionality with mock fetch responses:

```typescript
import { mockStreamResponse, mockHTTPErrorResponse } from "./test-utils"
import { vi } from "vitest"

// Mock successful stream
const chunks = [
  '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
  '{"type":"message","role":"user","content":"Hello"}\n',
  '{"type":"done","thread_id":"thread_123"}\n',
]

global.fetch = vi.fn().mockResolvedValue(mockStreamResponse(chunks))

// Mock HTTP-level errors (404, 401, etc.)
global.fetch = vi.fn().mockResolvedValue(
  mockHTTPErrorResponse(404, "Not Found", {
    code: "object_not_found",
    message: "Agent not found",
  }),
)

// Mock stream-level errors (errors in the stream chunks)
const errorChunks = [
  '{"type":"started","thread_id":"thread_123","agent_id":"agent_123"}\n',
  '{"type":"error","code":"rate_limited","message":"Too many requests"}\n',
]

global.fetch = vi.fn().mockResolvedValue(mockStreamResponse(errorChunks))
```

## Example test

Here's a complete example testing agent listing with pagination:

```typescript
import { describe, it, expect } from "vitest"
import { AgentOperations } from "./AgentOperations"
import { createMockClient, mockAgentListResponse } from "./test-utils"

describe("AgentOperations", () => {
  it("should list agents with pagination", async () => {
    const mockResponse = mockAgentListResponse({
      has_more: true,
      next_cursor: "cursor_123",
    })

    const mockClient = createMockClient(async ({ path, method, query }) => {
      expect(path).toBe("agents")
      expect(method).toBe("get")
      expect(query).toEqual({
        page_size: 10,
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
      page_size: 10,
      start_cursor: "prev_cursor",
    })

    expect(result.has_more).toBe(true)
    expect(result.next_cursor).toBe("cursor_123")
  })
})
```

## Testing with timers

For tests involving polling or delayed operations, use Vitest's fake timers:

```typescript
import { describe, it, beforeEach, afterEach, vi } from "vitest"

describe("Polling tests", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should poll until completion", async () => {
    const pollPromise = thread.poll({ initialDelayMs: 0 })

    // Run all pending timers until completion
    await vi.runAllTimersAsync()

    const result = await pollPromise
    expect(result.status).toBe("completed")
  })

  it("should handle polling timeout", async () => {
    const pollPromise = thread.poll({ maxAttempts: 2, initialDelayMs: 0 })

    // Start timer advancement (don't await yet)
    const timersPromise = vi.runAllTimersAsync()

    // Expect the rejection while timers are advancing
    await expect(pollPromise).rejects.toThrow("timed out")

    // Clean up the timer promise
    await timersPromise
  })
})
```

**Tip**: Use `vi.runAllTimersAsync()` instead of `vi.advanceTimersByTimeAsync(10000)` - it automatically runs all pending timers without needing to specify a duration.

## Architecture

The testing setup consists of just 3 files in `src/test-utils/`:

1. **`MockNotionClient.ts`**: Core mocking mechanism
   - Mock client that implements the Notion client interface
   - Stream response helpers for testing `chatStream()`
2. **`factories.ts`**: All factory functions in one place
   - Response data factories (`mockAgentListResponse`, `mockThreadData`, etc.)
   - Error factories (`mockAgentNotFound`, `mockRateLimitError`, etc.)
3. **`index.ts`**: Clean re-exports of everything

Plus **Vitest fake timers** for testing polling and delays.

This approach allows you to:

- Test SDK logic without making real API calls
- Easily customize responses for different test scenarios
- Mock realistic Notion API errors with proper error shapes
- Verify request parameters are correctly formatted
- Test error handling and edge cases
- Test time-dependent operations without actual delays

## Writing new tests

When adding new features:

1. Add factory functions for new response types in `test-utils/factories.ts`
2. Write tests using the mock client pattern
3. Verify both success and error cases
4. Test pagination and filtering logic

Example pattern:

```typescript
describe("YourFeature", () => {
  it("should handle the happy path", async () => {
    const mockClient = createMockClient(async (params) => {
      // Verify request params
      expect(params).toMatchObject({ ... })
      // Return mock response
      return mockResponse
    })

    // Test your feature
    const result = await yourFeature(mockClient)

    // Assert results
    expect(result).toEqual(expectedResult)
  })

  it("should handle errors", async () => {
    const mockClient = createMockClient(async () => {
      throw new Error("API error")
    })

    await expect(yourFeature(mockClient)).rejects.toThrow("API error")
  })
})
```
