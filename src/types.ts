export type ThreadStatus = "pending" | "completed" | "failed"

/**
 * @deprecated Personal agent access is unsupported and should not be
 * used for new integrations.
 */
export const PERSONAL_AGENT_ID = "33333333-3333-3333-3333-333333333333" as const

/**
 * Stable alias for the personal agent, accepted anywhere an agent ID is
 * expected. Normalized to {@link PERSONAL_AGENT_ID} server-side.
 *
 * @deprecated Personal agent access is unsupported and should not be
 * used for new integrations.
 */
export const PERSONAL_AGENT_ALIAS = "notion_ai" as const

/**
 * @deprecated Personal agent access is unsupported and should not be
 * used for new integrations.
 */
export type PersonalAgentId =
  | typeof PERSONAL_AGENT_ID
  | typeof PERSONAL_AGENT_ALIAS

export type AgentVersion = {
  id: string
  number: number
  published_at: string
}

export type ExternalUrl = {
  url: string
}

export type FileUrl = {
  url: string
  expiry_time: string
}

export type CustomEmoji = {
  id: string
  name: string
  url: string
}

export type CustomAgentAvatar = {
  static_url: string
  animated_url: string
}

export type AgentIcon =
  | { type: "emoji"; emoji: string }
  | { type: "file"; file: FileUrl }
  | { type: "external"; external: ExternalUrl }
  | { type: "custom_emoji"; custom_emoji: CustomEmoji }
  | {
      type: "custom_agent_avatar"
      custom_agent_avatar: CustomAgentAvatar
    }

export type AgentType = "notion_ai" | "custom" | "database_autofill"

export type AgentModelMode = "auto" | "pinned"

export type AgentStatus = "active" | "disabled" | "deleted"

export type AgentCreatedBy = {
  id: string
  type: "user" | "bot"
}

export type AgentConnection = {
  type: string
  name: string
  status: "connected" | "needs_setup"
}

export type AgentTool = {
  type: "script"
  key: string
  name: string
}

export type AgentPermissionAccessLevel =
  | "read"
  | "comment"
  | "edit"
  | "full_access"

export type AgentPermission = {
  object: "space" | "page"
  id: string
  name: string | null
  access_level: AgentPermissionAccessLevel
  scope?: "shared_pages"
}

export type AgentPauseReason =
  | "run_limit"
  | "credit_limit"
  | "runaway_credit_usage"
  | "workspace_credit_limit"
  | "failure_limit"
  | "mark_session_failed_autopause"
  | "disabled_from_workspace_settings"
  | "disabled_from_api"
  | "disabled_from_agent_settings"
  | "disabled_due_to_no_members_with_access"
  | "disabled_due_to_lack_of_editors"
  | "disabled_by_notion"
  | "internal_error"
  | "needs_user_review"
  | "tool_unavailable"

export type AgentTrigger = {
  type: string
  enabled: boolean
  schedule: string | null
}

export type AgentData = {
  object: "agent"
  id: string
  agent_type: AgentType
  name: string
  description: string | null
  instructions_page_id: string | null
  icon: AgentIcon | null
  agent_version: AgentVersion | null
  model: string | null
  model_mode: AgentModelMode | null
  connections: AgentConnection[]
  tools: AgentTool[]
  permissions: AgentPermission[]
  status: AgentStatus
  pause_reason: AgentPauseReason | null
  created_by: AgentCreatedBy | null
  created_time: string
  last_edited_time: string
  last_run_at: string | null
  credit_limit: number | null
  triggers: AgentTrigger[]
  /**
   * The agent's inline instructions. Only present when the request was made
   * with `verbose: true`, and `null` when the instructions are stored on a
   * page (see `instructions_page_id`).
   */
  instructions?: string | null
}

export type ThreadMessage = {
  role: "user" | "agent"
  content: string
}

export type ChatAttachmentInput = {
  fileUploadId: string
  name?: string
}

/**
 * Caller-provided string metadata persisted with the user message. `user_id`
 * is used for lifecycle correlation and does not change authorization.
 */
export type ChatLifecycleMetadata = Record<string, string>

export type ThreadMessageAttachment = {
  name: string
  content_type: string
  url: string
  expiry_time?: string
}

export type ToolResult = {
  id: string
  agent_step_id: string | null
  tool_call_id: string | null
  tool_name: string
  tool_type: string
  state: string
  input: unknown | null
  output: unknown | null
  error: string | null
  started_at: number
  finished_at: number | null
  duration_ms: number | null
}

export type AgentContentPart =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | {
      type: "tool_call"
      tool_call_id: string | null
      tool_name: string
      input: string
      results?: ToolResult[]
    }
  | { type: "follow_ups"; follow_ups: Array<{ label: string; message: string }> }
  | { type: "custom_agent_template_picker" }

export type StreamMessage =
  | {
      id: string
      role: "user"
      content: string
      attachments?: ThreadMessageAttachment[]
    }
  | {
      id: string
      role: "agent"
      content: string
      content_parts?: AgentContentPart[]
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
  invocation_id: string
  status: "pending"
}

export type AgentListResponse = {
  object: "list"
  type: "agent"
  results: Array<AgentData>
  has_more: boolean
  next_cursor: string | null
}

export type ChatStreamUsage = {
  total_tokens: number
}

export type ChatStreamArtifact =
  | { type: "page"; url: string; title: string }
  | { type: "html_artifact"; url: string; page_url: string }

export type ChatStreamToolStatus =
  | "pending"
  | "running"
  | "waiting_for_user"
  | "completed"
  | "failed"

export type ChatStreamToolCategory =
  | "search"
  | "read"
  | "write"
  | "compute"
  | "other"

export type StreamChunk =
  | {
      type: "started"
      invocation_id: string
      thread_id: string
      agent_id: string
      model: string
      metadata?: ChatLifecycleMetadata
    }
  | ({ type: "message"; invocation_id: string; delta: string } & StreamMessage)
  | {
      type: "tool"
      invocation_id: string
      id: string
      category: ChatStreamToolCategory
      status: ChatStreamToolStatus
      agent_step_id?: string | null
      tool_call_id?: string | null
      tool_name?: string
      tool_type?: string
    }
  | {
      type: "done"
      invocation_id: string
      thread_id: string
      model: string
      usage: ChatStreamUsage
      duration_ms: number
      connections_used: string[]
      artifacts: ChatStreamArtifact[]
      metadata?: ChatLifecycleMetadata
    }
  | { type: "waiting_for_user"; invocation_id: string }
  | {
      type: "error"
      invocation_id?: string
      code:
        | "object_not_found"
        | "validation_error"
        | "internal_server_error"
        | "restricted_resource"
        | "unauthorized"
        | "rate_limited"
        | "service_unavailable"
        | string
      message: string
      usage?: ChatStreamUsage
    }

export type ThreadInfo = {
  thread_id: string
  agent_id: string
  messages: StreamMessage[]
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
  created_time: string
  last_edited_time: string
  error?: string
  created_by: {
    id: string
    type: "user" | "bot"
  }
  agent_version: AgentVersion | null
}

export type ThreadListResponse = PaginatedResponse<ThreadListItem> & {
  type: "thread"
}

export type ThreadActivity =
  | "all"
  | "pending"
  | "in_progress"
  | "failed"
  | "success"

export type ThreadActorFilter = string | "me"

export type ThreadSortBy = "created_time" | "last_used_time"

export type ThreadSortDirection = "ascending" | "descending"

export type ThreadListParams = PaginationParams & {
  id?: string
  title?: string
  status?: ThreadStatus
  activity?: ThreadActivity
  created_by?: ThreadActorFilter[]
  last_used_by?: ThreadActorFilter[]
  sort_by?: ThreadSortBy
  sort_direction?: ThreadSortDirection
}

export type ThreadMessageParent = {
  type: "thread"
  id: string
}

export type ThreadMessageItem = {
  object: "thread_message"
  id: string
  role: "user" | "agent"
  content: string
  created_time: string
  parent: ThreadMessageParent
  attachments?: ThreadMessageAttachment[]
  content_parts?: AgentContentPart[]
}

export type ThreadMessageListResponse = PaginatedResponse<ThreadMessageItem> & {
  type: "thread_message"
}

export type ThreadMessageListParams = PaginationParams & {
  verbose?: boolean
  role?: "user" | "agent"
}

export type AgentCreatedByFilter = string | "me"

export type AgentTypeFilter =
  | "notion_ai"
  | "custom_agent"
  | "autofill_custom_agent"
  | "external"

export type AgentListParams = PaginationParams & {
  name?: string
  agent_type?: AgentTypeFilter[]
  agent_ids?: string[]
  created_by?: AgentCreatedByFilter[]
  verbose?: boolean
}
