export type Config = {
  apiToken: string
  baseUrl?: string
  lastAgentId?: string
  lastThreadId?: string
}

export type Message = {
  role: "user" | "agent"
  content: string
  isPartial?: boolean
}

export type AppMode = "chat" | "agent-select" | "setup"

export type WorkspaceInfo = {
  botName: string
  workspaceName?: string
  botId: string
}
