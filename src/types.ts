export type ThreadStatus =
  | "pending"
  | "requires_action"
  | "canceled"
  | "completed"
  | "failed"

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
  object: "user"
  type: "user"
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
  status: AgentStatus
  created_by: AgentCreatedBy | null
  created_time: string | null
  last_edited_time: string | null
  last_run_at: string | null
}

export type ThreadMessage = {
  role: "user" | "agent"
  content: string
}

export type SessionCancelParams = {
  eventId?: string
}

export type SessionCancelResponse = {
  object: "session"
  id: string
  agent_id: string
  title: string
  status: SessionStatus
  created_at: string
  updated_at: string
  required_actions?: SessionRequiredAction[]
  error?: SessionError
}

export type ChatAttachmentInput = {
  fileUploadId: string
  name?: string
}

export type ChatLifecycleMetadata = {
  user_id?: string
}

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

export type ContinueThreadArgs =
  | { actionId: string; optionId: "approve" | "reject" }
  | {
      actionId: string
      optionId: "use_connection"
      input: { connectionId: string }
    }

export type PendingUserActionRequirement =
  | { type: "general" }
  | {
      type: "url_safety"
      urls: string[]
      required_by_workspace_policy?: boolean
    }
  | {
      type: "permission_escalation"
      destination_title?: string
      source_titles?: string[]
    }
  | { type: "manage_workers" }
  | {
      type: "delete_content"
      page_count: number
      database_count: number
      meeting_notes_block_count?: number
    }
  | {
      type: "connect_integration"
      integration_type: string
      integration_name: string
      handoff_url: string
    }
  | { type: "admin_mode"; explanation?: string }

export type PendingUserActionOption =
  | { id: "approve"; label: string }
  | { id: "reject"; label: string }
  | {
      id: "use_connection"
      label: string
      input: { type: "connection_id"; required: true }
    }

export type PendingUserAction = {
  id: string
  type: "tool_confirmation"
  title: string
  requirements: PendingUserActionRequirement[]
  options: PendingUserActionOption[]
}

export type ThreadData = {
  object: "thread"
  agent_id: string
  thread_id: string
  status: ThreadStatus
  messages: Array<ThreadMessage>
  error?: string
  pending_user_actions?: PendingUserAction[]
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
      status: "completed" | "requires_action" | "canceled"
      invocation_id: string
      thread_id: string
      model: string
      usage: ChatStreamUsage
      duration_ms: number
      connections_used: string[]
      artifacts: ChatStreamArtifact[]
      metadata?: ChatLifecycleMetadata
      pending_user_actions?: PendingUserAction[]
    }
  | {
      type: "waiting_for_user"
      invocation_id: string
      pending_user_actions: PendingUserAction[]
    }
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

export type SessionCreatedBy = {
  id: string
  type: "user" | "bot"
}

export type SessionModels =
  | { type: "auto" }
  | { type: "pinned"; ids: Array<string | null> }

export type Session = {
  object: "session"
  id: string
  agent_id: string
  title: string
  status: SessionStatus
  created_by: SessionCreatedBy
  agent_version: AgentVersion | null
  models: SessionModels
  created_at: string
  updated_at: string
  required_actions?: SessionRequiredAction[]
  error?: SessionError
  trigger_type?: string
  type_labels?: string[] | null
  chat_user_emails?: string[] | null
  tool_types?: string[] | null
  tool_call_count?: number | null
  credits_used?: number | null
  runs_completed?: number | null
  message_count?: number | null
}

export type SessionTimestampCondition = {
  before?: string
  after?: string
  on_or_before?: string
  on_or_after?: string
} & (
  | { before: string }
  | { after: string }
  | { on_or_before: string }
  | { on_or_after: string }
)

export type SessionFilter =
  | { property: "id"; string: { equals: string } }
  | { property: "agent_id"; string: { equals: string } }
  | {
      property: "status"
      status:
        | { equals: SessionStatus; in?: SessionStatus[] }
        | { equals?: SessionStatus; in: [SessionStatus, ...SessionStatus[]] }
    }
  | {
      property: "created_at" | "updated_at"
      timestamp: SessionTimestampCondition
    }
  | { and: SessionFilter[] }
  | { or: SessionFilter[] }

export type SessionSortProperty = "created_at" | "updated_at"

export type SessionSort = {
  property: SessionSortProperty
  direction: "ascending" | "descending"
}

export type SessionQueryParams = PaginationParams & {
  query?: string
  filter?: SessionFilter
  sorts?: SessionSort[]
}

export type SessionListResponse = PaginatedResponse<Session> & {
  type: "session"
  session: Record<string, never>
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
  pending_user_actions?: PendingUserAction[]
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

export type SessionStatus =
  | "queued"
  | "in_progress"
  | "requires_action"
  | "completed"
  | "failed"
  | "canceled"
  | "terminated"

export type SessionRequiredActionOption = {
  id: "approve" | "reject"
  label: string
}

export type SessionRequiredAction = {
  action_id: string
  title: string
  options: SessionRequiredActionOption[]
}

export type SessionError = {
  code: string
  message: string
  retryable: boolean
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
  pending_user_actions?: PendingUserAction[]
}

export type ThreadMessageListResponse = PaginatedResponse<ThreadMessageItem> & {
  type: "thread_message"
}

export type ThreadMessageListParams = PaginationParams & {
  verbose?: boolean
  role?: "user" | "agent"
}

export type SessionEventType =
  | "user.message"
  | "agent.message"
  | "agent.thinking"
  | "agent.tool_use"
  | "agent.tool_result"
  | "session.status"

export type SessionEventCreatedBy = {
  id: string
  type: "user" | "bot"
} | null

export type SessionEventContentBlock =
  | { type: "text"; text: string }
  | {
      type: "file"
      name: string
      content_type: string
      url: string
      expiry_time?: string
    }

type SessionEventBase = {
  object: "session_event"
  id: string
  session_id: string
  sequence: number
  created_at: string
}

export type SessionMessageEvent = SessionEventBase & {
  type: "user.message" | "agent.message"
  content: SessionEventContentBlock[]
  created_by: SessionEventCreatedBy
  metadata: Record<string, string> | null
}

export type SessionThinkingEvent = SessionEventBase & {
  type: "agent.thinking"
  content: Array<{ type: "text"; text: string }>
}

export type SessionToolUseEvent = SessionEventBase & {
  type: "agent.tool_use"
  tool_name: string
}

export type SessionToolResultEvent = SessionEventBase & {
  type: "agent.tool_result"
  tool_use_id: string
  tool_name: string
  is_error: boolean
}

export type SessionStatusRequiredAction = {
  action_id: string
  title: string
  options: Array<{ id: "approve" | "reject"; label: string }>
}

export type SessionStatusError = {
  code: string
  message: string
  retryable: boolean
}

export type SessionEventStatus =
  | "requires_action"
  | "completed"
  | "failed"
  | "canceled"
  | "terminated"

export type SessionStatusEvent = SessionEventBase & {
  type: "session.status"
  status: SessionEventStatus
  required_actions?: SessionStatusRequiredAction[]
  error?: SessionStatusError
}

export type SessionEvent =
  | SessionMessageEvent
  | SessionThinkingEvent
  | SessionToolUseEvent
  | SessionToolResultEvent
  | SessionStatusEvent

export type SessionEventFilter =
  | { property: "id"; string: { equals: string } }
  | {
      property: "type"
      event_type: { equals?: SessionEventType; in?: SessionEventType[] }
    }
  | {
      property: "sequence"
      number: {
        greater_than?: number
        greater_than_or_equal_to?: number
        less_than?: number
        less_than_or_equal_to?: number
      }
    }
  | {
      property: "created_at"
      timestamp: {
        equals?: string
        before?: string
        after?: string
        on_or_before?: string
        on_or_after?: string
      }
    }
  | { and: SessionEventFilter[] }
  | { or: SessionEventFilter[] }

export type SessionEventSortProperty = "sequence" | "created_at"

export type SessionEventSort = {
  property: SessionEventSortProperty
  direction: "ascending" | "descending"
}

export type SessionEventQueryParams = PaginationParams & {
  filter?: SessionEventFilter
  sorts?: SessionEventSort[]
}

export type SessionEventListResponse = PaginatedResponse<SessionEvent> & {
  type: "session_event"
  session_event: Record<string, never>
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
}
