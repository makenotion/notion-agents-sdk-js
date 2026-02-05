/**
 * Shared type definitions for the CLI tool.
 */

import type {
  AgentContentPart,
  ThreadMessageAttachment,
} from "@notionhq/agents-client"

export type Config = {
  apiToken: string
  baseUrl?: string
  lastAgentId?: string
  lastThreadId?: string
}

export type Message = {
  id?: string
  role: "user" | "agent"
  content: string
  attachments?: ThreadMessageAttachment[]
  contentParts?: AgentContentPart[]
  isPartial?: boolean
}

export type AppMode = "chat" | "agent-select" | "setup"

export type WorkspaceInfo = {
  botName: string
  workspaceName?: string
  botId: string
}
