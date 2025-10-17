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

export const mockAgentData = (overrides?: Partial<AgentData>): AgentData => ({
  object: "agent",
  id: "agent_123",
  name: "Test Agent",
  instruction: "Test instructions",
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
  created_by: {
    id: "user_789",
    type: "bot",
  },
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
