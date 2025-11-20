export type ThreadStatus = "pending" | "completed" | "failed"

export const PERSONAL_AGENT_ID = "33333333-3333-3333-3333-333333333333" as const
export type PersonalAgentId = typeof PERSONAL_AGENT_ID

export type AgentData = {
  object: "agent"
  id: string
  name: string
  instruction: string | null
}

export type ThreadMessage = {
  role: "user" | "agent"
  content: string
}

export type ThreadData = {
  object: "thread"
  agent_id: string
  thread_id: string
  status: ThreadStatus
  messages: Array<ThreadMessage>
  error?: string
}

export type ChatInvocationResponse = {
  object: "chat.invocation"
  agent_id: string
  thread_id: string
  status: "pending"
}

export type AgentListResponse = {
  object: "list"
  type: "agent"
  results: Array<AgentData>
  has_more: boolean
  next_cursor: string | null
}

export type StreamChunk =
  | { type: "started"; thread_id: string; agent_id: string }
  | { type: "message"; role: "user" | "agent"; content: string }
  | { type: "done"; thread_id: string }
  | {
      type: "error"
      code:
        | "object_not_found"
        | "validation_error"
        | "internal_server_error"
        | "restricted_resource"
        | "unauthorized"
        | "rate_limited"
        | string
      message: string
    }

export type ThreadInfo = {
  thread_id: string
  agent_id: string
  messages: Array<ThreadMessage>
}

export type PollThreadOptions = {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  initialDelayMs?: number
  onPending?: (thread: ThreadListItem, attempt: number) => void
  onThreadNotFound?: (attempt: number) => void
}

export type ClientOptions = {
  auth: string
  baseUrl?: string
  notionVersion?: string
}

export type PaginationParams = {
  start_cursor?: string
  page_size?: number
}

export type PaginatedResponse<T> = {
  object: "list"
  results: Array<T>
  has_more: boolean
  next_cursor: string | null
}

export type ThreadListItem = {
  object: "thread"
  id: string
  title: string
  status: ThreadStatus
  created_by: {
    id: string
    type: "user" | "bot"
  }
}

export type ThreadListResponse = PaginatedResponse<ThreadListItem> & {
  type: "thread"
}

export type ThreadListParams = PaginationParams & {
  id?: string
  title?: string
  status?: ThreadStatus
  created_by_type?: "user" | "bot"
  created_by_id?: string
}

export type ThreadMessageItem = {
  object: "thread_message"
  id: string
  role: "user" | "agent"
  content: string
}

export type ThreadMessageListResponse = PaginatedResponse<ThreadMessageItem> & {
  type: "thread_message"
}

export type ThreadMessageListParams = PaginationParams & {
  role?: "user" | "agent"
}

export type AgentListParams = PaginationParams & {
  name?: string
}
