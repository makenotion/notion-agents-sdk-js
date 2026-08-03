import type {
  AgentData,
  AgentListResponse,
  ChatInvocationResponse,
  ThreadData,
  ThreadListResponse,
  ThreadMessageListResponse,
  ThreadListItem,
  ThreadMessageItem,
} from "../types.js"

export class MockNotionAPIError extends Error {
  public readonly code: string
  public readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = "APIResponseError"
    this.code = code
    this.status = status
    Object.setPrototypeOf(this, MockNotionAPIError.prototype)
  }
}

export const mockAgentData = (overrides?: Partial<AgentData>): AgentData => ({
  object: "agent",
  id: "agent_123",
  agent_type: "custom",
  name: "Test Agent",
  description: null,
  instructions_page_id: null,
  icon: null,
  agent_version: null,
  model: null,
  model_mode: null,
  connections: [],
  tools: [],
  permissions: [],
  status: "active",
  pause_reason: null,
  created_by: null,
  created_time: "2025-01-01T00:00:00.000Z",
  last_edited_time: "2025-01-01T00:00:00.000Z",
  last_run_at: null,
  credit_limit: null,
  triggers: [],
  ...overrides,
})

export const mockAgentListResponse = (
  overrides?: Partial<AgentListResponse>,
): AgentListResponse => ({
  object: "list",
  type: "agent",
  results: [mockAgentData()],
  has_more: false,
  next_cursor: null,
  ...overrides,
})

export const mockChatInvocation = (
  overrides?: Partial<ChatInvocationResponse>,
): ChatInvocationResponse => ({
  object: "chat.invocation",
  agent_id: "agent_123",
  thread_id: "thread_456",
  status: "pending",
  ...overrides,
})

export const mockThreadData = (
  overrides?: Partial<ThreadData>,
): ThreadData => ({
  object: "thread",
  agent_id: "agent_123",
  thread_id: "thread_456",
  status: "completed",
  messages: [
    { role: "user", content: "Hello" },
    { role: "agent", content: "Hi there!" },
  ],
  ...overrides,
})

export const mockThreadListItem = (
  overrides?: Partial<ThreadListItem>,
): ThreadListItem => ({
  object: "thread",
  id: "thread_456",
  title: "Test Thread",
  status: "completed",
  created_time: "2025-01-01T00:00:00.000Z",
  last_edited_time: "2025-01-01T00:00:00.000Z",
  created_by: {
    id: "user_789",
    type: "bot",
  },
  agent_version: null,
  ...overrides,
})

export const mockThreadListResponse = (
  overrides?: Partial<ThreadListResponse>,
): ThreadListResponse => ({
  object: "list",
  type: "thread",
  results: [mockThreadListItem()],
  has_more: false,
  next_cursor: null,
  ...overrides,
})

export const mockThreadMessageItem = (
  overrides?: Partial<ThreadMessageItem>,
): ThreadMessageItem => ({
  object: "thread_message",
  id: "msg_123",
  role: "user",
  content: "Hello",
  created_time: "2025-01-01T00:00:00.000Z",
  parent: {
    type: "thread",
    id: "thread_456",
  },
  ...overrides,
})

export const mockThreadMessageListResponse = (
  overrides?: Partial<ThreadMessageListResponse>,
): ThreadMessageListResponse => ({
  object: "list",
  type: "thread_message",
  results: [mockThreadMessageItem()],
  has_more: false,
  next_cursor: null,
  ...overrides,
})

export function mockNotionAPIError(
  code: string,
  message: string,
  status: number,
): MockNotionAPIError {
  return new MockNotionAPIError(code, message, status)
}

export function mockAgentNotFound(agentId: string): MockNotionAPIError {
  return mockNotionAPIError(
    "object_not_found",
    `Could not find agent with ID: ${agentId}.`,
    404,
  )
}

export function mockThreadNotFound(threadId: string): MockNotionAPIError {
  return mockNotionAPIError(
    "object_not_found",
    `Could not find thread with ID: ${threadId}.`,
    404,
  )
}

export function mockValidationError(message: string): MockNotionAPIError {
  return mockNotionAPIError("validation_error", message, 400)
}

export function mockRateLimitError(): MockNotionAPIError {
  return mockNotionAPIError(
    "rate_limited",
    "Rate limit exceeded. Please try again later.",
    429,
  )
}

export function mockUnauthorizedError(): MockNotionAPIError {
  return mockNotionAPIError(
    "unauthorized",
    "The bearer token is not valid.",
    401,
  )
}
