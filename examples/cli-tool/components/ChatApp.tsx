import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useInput, useApp } from "ink"
import TextInput from "ink-text-input"
import {
  NotionAgentsClient,
  stripLangTags,
  isPersonalAgent,
} from "@notionhq/agents-client"
import { Client } from "@notionhq/client"
import type {
  AgentContentPart,
  AgentData,
  ToolResult,
} from "@notionhq/agents-client"
import type { Config, Message, AppMode, WorkspaceInfo } from "../types.js"
import { saveConfig } from "../utils/config.js"
import { AgentSelector } from "./AgentSelector.js"

function safeJsonStringify(value: unknown): string {
  if (value === undefined) return "undefined"
  if (value === null) return "null"
  if (typeof value === "string") return value

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function formatMaybeJson(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length === 0) return ""

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return input
  }
}

function formatMaybeJsonValue(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value === "string") return formatMaybeJson(value)
  return safeJsonStringify(value)
}

function formatToolResultSummary(result: ToolResult): string {
  const duration =
    typeof result.duration_ms === "number" ? `${result.duration_ms}ms` : null
  const parts = [result.state, duration].filter(Boolean)
  return parts.length > 0 ? `(${parts.join(", ")})` : ""
}

function toTimestamp(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function getLatestToolResult(results: ToolResult[]): ToolResult | null {
  let latestResult: ToolResult | null = null
  let latestTime = -Infinity

  for (const result of results) {
    const time =
      toTimestamp(result.finished_at) ?? toTimestamp(result.started_at)
    if (time !== null && time > latestTime) {
      latestTime = time
      latestResult = result
    }
  }

  return latestResult ?? (results.length > 0 ? results[0] : null)
}

function getToolResultColor(
  result: ToolResult,
): "red" | "green" | "yellow" | undefined {
  if (result.error) return "red"

  const state = result.state.toLowerCase()
  if (state.includes("fail") || state.includes("error")) return "red"
  if (result.finished_at != null) return "green"
  if (
    state.includes("complete") ||
    state.includes("success") ||
    state.includes("succeed") ||
    state.includes("finish") ||
    state.includes("done")
  ) {
    return "green"
  }
  if (
    state.includes("pending") ||
    state.includes("running") ||
    state.includes("progress")
  ) {
    return "yellow"
  }

  return undefined
}

type MessageGroup = {
  role: Message["role"]
  messages: Message[]
}

function groupConsecutiveAgentMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []

  for (const message of messages) {
    const lastGroup = groups[groups.length - 1]
    if (message.role === "agent" && lastGroup?.role === "agent") {
      lastGroup.messages.push(message)
      continue
    }

    groups.push({ role: message.role, messages: [message] })
  }

  return groups
}

function AgentMessageContent({
  content,
  contentParts,
}: {
  content: string
  contentParts?: AgentContentPart[]
}) {
  const parts = contentParts ?? []
  const hasTextPart = parts.some((part) => part.type === "text")

  return (
    <Box flexDirection="column">
      {parts.map((part, idx) => {
        const marginTop = idx === 0 ? 0 : 1

        if (part.type === "thinking") {
          const text = stripLangTags(part.text)
          return (
            <Box
              key={`thinking-${idx}`}
              flexDirection="column"
              marginTop={marginTop}
            >
              <Text dimColor italic>
                Thinking
              </Text>
              <Text dimColor>{text}</Text>
            </Box>
          )
        }

        if (part.type === "tool_call") {
          const prettyInput = formatMaybeJson(part.input)
          const results = part.results ?? []
          const latestResult = getLatestToolResult(results)
          const headerSummary = latestResult
            ? ` ${formatToolResultSummary(latestResult)}`
            : ""
          const headerColor =
            latestResult !== null
              ? (getToolResultColor(latestResult) ?? "yellow")
              : "yellow"
          const prettyOutput =
            latestResult?.output !== null && latestResult?.output !== undefined
              ? formatMaybeJsonValue(latestResult.output)
              : ""

          return (
            <Box
              key={`tool-${idx}`}
              flexDirection="column"
              marginTop={marginTop}
              marginLeft={2}
            >
              <Text color={headerColor}>
                Tool: {part.tool_name}
                {headerSummary}
              </Text>
              {part.tool_call_id && (
                <Text dimColor>id: {part.tool_call_id}</Text>
              )}
              {prettyInput.length > 0 && (
                <Box flexDirection="column" marginLeft={2} marginTop={1}>
                  <Text dimColor>input</Text>
                  <Text dimColor>{prettyInput}</Text>
                </Box>
              )}
              {latestResult && (
                <Box flexDirection="column" marginLeft={2} marginTop={1}>
                  <Text dimColor>output</Text>
                  {latestResult.error && (
                    <Text color="red">error: {latestResult.error}</Text>
                  )}
                  {prettyOutput.length > 0 && (
                    <Text dimColor>{prettyOutput}</Text>
                  )}
                </Box>
              )}
            </Box>
          )
        }

        if (part.type === "text") {
          const text = stripLangTags(part.text)
          return (
            <Box
              key={`text-${idx}`}
              flexDirection="column"
              marginTop={marginTop}
            >
              <Text>{text}</Text>
            </Box>
          )
        }

        if (part.type === "follow_ups") {
          return (
            <Box
              key={`follow-ups-${idx}`}
              flexDirection="column"
              marginTop={marginTop}
            >
              <Text dimColor>Follow ups</Text>
              {part.follow_ups.map((followUp) => (
                <Text key={followUp.label} dimColor>
                  - {followUp.label}: {followUp.message}
                </Text>
              ))}
            </Box>
          )
        }

        if (part.type === "custom_agent_template_picker") {
          return (
            <Box
              key={`template-picker-${idx}`}
              flexDirection="column"
              marginTop={marginTop}
            >
              <Text dimColor>[Template picker]</Text>
            </Box>
          )
        }

        return null
      })}

      {!hasTextPart && content.trim().length > 0 && (
        <Box flexDirection="column" marginTop={parts.length > 0 ? 1 : 0}>
          <Text>{content}</Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Main chat interface component that provides a ChatGPT-like experience
 * for conversing with Notion agents. Handles agent selection, message
 * streaming, conversation persistence, and workspace display.
 */
export function ChatApp({
  config,
  onReconfigure,
}: {
  config: Config
  onReconfigure: () => void
}) {
  const { exit } = useApp()
  const [mode, setMode] = useState<AppMode>("chat")
  const [client, setClient] = useState<NotionAgentsClient | null>(null)
  const [agents, setAgents] = useState<AgentData[]>([])
  const [currentAgent, setCurrentAgent] = useState<AgentData | null>(null)
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [threadId, setThreadId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [continuePrompt, setContinuePrompt] = useState(false)
  const [continueInput, setContinueInput] = useState("")
  const [initError, setInitError] = useState<string | null>(null)
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)

  const messageGroups = groupConsecutiveAgentMessages(messages)

  useEffect(() => {
    async function init() {
      const notionClient = new NotionAgentsClient({
        auth: config.apiToken,
        ...(config.baseUrl && { baseUrl: config.baseUrl }),
      })
      setClient(notionClient)

      try {
        const basicClient = new Client({
          auth: config.apiToken,
          ...(config.baseUrl && { baseUrl: config.baseUrl }),
        })

        const [agentsResponse, botUser] = await Promise.all([
          notionClient.agents.list(),
          basicClient.users.me({}),
        ])

        const info: WorkspaceInfo = {
          botName: botUser.name || "Unknown Bot",
          botId: botUser.id,
        }

        if (botUser.type === "bot" && botUser.bot?.workspace_name) {
          info.workspaceName = botUser.bot.workspace_name
        }

        setWorkspaceInfo(info)

        if (agentsResponse.results.length === 0) {
          setInitError("No agents found. Create one in Notion first!")
          setLoading(false)
          return
        }

        setAgents(agentsResponse.results)

        let selectedAgentIndex = 0
        if (config.lastAgentId) {
          const foundIndex = agentsResponse.results.findIndex(
            (a) => a.id === config.lastAgentId,
          )
          if (foundIndex >= 0) {
            selectedAgentIndex = foundIndex
          }
        }

        setCurrentAgentIndex(selectedAgentIndex)
        setCurrentAgent(agentsResponse.results[selectedAgentIndex])

        if (config.lastThreadId) {
          setContinuePrompt(true)
        } else {
          setLoading(false)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load agents"
        setInitError(
          `Failed to connect to Notion API: ${errorMessage}\n\nPlease check your API token and base URL.`,
        )
        setLoading(false)
      }
    }

    init()
  }, [config])

  const loadPreviousThread = useCallback(async () => {
    if (!client || !currentAgent || !config.lastThreadId) return

    try {
      const thread = client.agents
        .agent(currentAgent.id)
        .thread(config.lastThreadId)
      const messagesResponse = await thread.listMessages({ page_size: 50 })

      const loadedMessages: Message[] = messagesResponse.results
        .reverse()
        .map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: stripLangTags(msg.content),
          ...(msg.attachments ? { attachments: msg.attachments } : {}),
          ...(msg.content_parts ? { contentParts: msg.content_parts } : {}),
        }))

      setMessages(loadedMessages)
      setThreadId(config.lastThreadId)
    } catch (err) {
      setError("Failed to load previous thread")
    }
    setLoading(false)
    setContinuePrompt(false)
  }, [client, currentAgent, config.lastThreadId])

  const handleContinueResponse = useCallback(() => {
    const response = continueInput.toLowerCase().trim()
    if (response === "y" || response === "yes") {
      loadPreviousThread()
    } else {
      setLoading(false)
      setContinuePrompt(false)
    }
  }, [continueInput, loadPreviousThread])

  const switchAgent = useCallback(
    (index: number) => {
      setCurrentAgent(agents[index])
      setCurrentAgentIndex(index)
      setMessages([])
      setThreadId(undefined)
      setMode("chat")

      const updatedConfig = {
        ...config,
        lastAgentId: agents[index].id,
        lastThreadId: undefined,
      }
      saveConfig(updatedConfig)
    },
    [agents, config],
  )

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!client || !currentAgent || isStreaming) return

      setMessages((prev) => [...prev, { role: "user", content: userMessage }])
      setIsStreaming(true)
      setError(null)

      const agent = client.agents.agent(currentAgent.id)
      const partialAgentMessageIds = new Set<string>()

      try {
        for await (const chunk of agent.chatStream({
          message: userMessage,
          threadId,
        })) {
          if (chunk.type === "started") {
            setThreadId(chunk.thread_id)
            const updatedConfig = {
              ...config,
              lastThreadId: chunk.thread_id,
            }
            saveConfig(updatedConfig)
          } else if (chunk.type === "message" && chunk.role === "agent") {
            const cleanContent = stripLangTags(chunk.content)
            partialAgentMessageIds.add(chunk.id)
            setMessages((prev) => {
              const newMessages = [...prev]
              const existingIndex = newMessages.findIndex(
                (message) => message.id === chunk.id,
              )
              const existingMessage =
                existingIndex !== -1 ? newMessages[existingIndex] : undefined
              const nextMessage: Message = {
                ...(existingMessage ?? {}),
                id: chunk.id,
                role: "agent" as const,
                content: cleanContent,
                isPartial: true,
                ...(chunk.content_parts ? { contentParts: chunk.content_parts } : {}),
              }
              if (existingIndex !== -1) {
                newMessages[existingIndex] = nextMessage
              } else {
                newMessages.push(nextMessage)
              }
              return newMessages
            })
          } else if (chunk.type === "error") {
            setError(`Error: ${chunk.message}`)
          }
        }

        setMessages((prev) => {
          return prev.map((message) => {
            if (message.id && partialAgentMessageIds.has(message.id)) {
              return {
                ...message,
                isPartial: undefined,
              }
            }
            return message
          })
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message")
      }

      setIsStreaming(false)
    },
    [client, currentAgent, isStreaming, threadId, config],
  )

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return

    if (trimmed === "/exit" || trimmed === "/quit") {
      exit()
      return
    }

    if (trimmed === "/switch") {
      setMode("agent-select")
      setInput("")
      return
    }

    if (trimmed === "/reconfigure" || trimmed === "/config") {
      onReconfigure()
      return
    }

    sendMessage(trimmed)
    setInput("")
  }, [input, sendMessage, exit, onReconfigure])

  useInput(
    (input, key) => {
      if (mode === "agent-select" && key.return) {
        switchAgent(currentAgentIndex)
      }
    },
    { isActive: mode === "agent-select" },
  )

  useInput(
    (input, key) => {
      if (input === "r" || input === "R") {
        onReconfigure()
      } else if (input === "q" || input === "Q") {
        exit()
      }
    },
    { isActive: !!initError },
  )

  if (continuePrompt) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Previous conversation found
        </Text>
        <Text>
          Would you like to continue from your last conversation? (y/n)
        </Text>
        <Box marginTop={1}>
          <Text color="white">&gt; </Text>
          <TextInput
            value={continueInput}
            onChange={setContinueInput}
            onSubmit={handleContinueResponse}
          />
        </Box>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading...</Text>
      </Box>
    )
  }

  if (initError) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          Initialization Error
        </Text>
        <Box marginTop={1}>
          <Text>{initError}</Text>
        </Box>
        <Box
          marginTop={1}
          paddingX={1}
          paddingY={1}
          borderStyle="single"
          borderColor="white"
        >
          <Text>Press 'r' to reconfigure settings, or 'q' to quit</Text>
        </Box>
      </Box>
    )
  }

  if (mode === "agent-select") {
    return (
      <AgentSelector
        agents={agents}
        selectedIndex={currentAgentIndex}
        onSelect={setCurrentAgentIndex}
      />
    )
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box
        flexDirection="column"
        paddingX={1}
        paddingY={1}
        borderStyle="single"
        borderColor="cyan"
      >
        <Box>
          <Text bold color="cyan">
            {currentAgent?.name || "Agent"}
          </Text>
          {currentAgent && isPersonalAgent(currentAgent.id) && (
            <Text color="blue" dimColor>
              {" "}
              (Notion AI)
            </Text>
          )}
        </Box>
        {currentAgent?.instruction && (
          <Text dimColor>{currentAgent.instruction}</Text>
        )}
      </Box>

      {workspaceInfo && (
        <Box
          flexDirection="column"
          paddingX={1}
          paddingY={1}
          borderStyle="single"
          borderColor="gray"
        >
          <Text dimColor>Bot: {workspaceInfo.botName}</Text>
          {workspaceInfo.workspaceName && (
            <Text dimColor>Workspace: {workspaceInfo.workspaceName}</Text>
          )}
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        {messageGroups.map((group, groupIdx) => {
          const firstMessage = group.messages[0]

          if (group.role === "user") {
            return (
              <Box
                key={firstMessage?.id ?? `user-${groupIdx}`}
                flexDirection="column"
                marginBottom={1}
              >
                <Text bold color="green">
                  You:
                </Text>
                <Text>{firstMessage?.content ?? ""}</Text>
              </Box>
            )
          }

          return (
            <Box
              key={firstMessage?.id ?? `agent-${groupIdx}`}
              flexDirection="column"
              marginBottom={1}
            >
              <Text bold color="blue">
                {currentAgent?.name || "Agent"}:
              </Text>
              {group.messages.map((message, messageIdx) => (
                <Box
                  key={message.id ?? `${groupIdx}-${messageIdx}`}
                  flexDirection="column"
                  marginTop={messageIdx === 0 ? 0 : 1}
                >
                  <AgentMessageContent
                    content={message.content}
                    contentParts={message.contentParts}
                  />
                </Box>
              ))}
            </Box>
          )
        })}
        {isStreaming && (
          <Text dimColor italic>
            Agent is typing...
          </Text>
        )}
      </Box>

      {error && (
        <Box paddingX={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box
        paddingX={1}
        paddingY={1}
        borderStyle="single"
        borderColor="white"
        flexDirection="column"
      >
        <Text dimColor>
          {isStreaming
            ? "Waiting for agent response..."
            : "Type a message (or /switch, /reconfigure, /exit)"}
        </Text>
        <Box>
          <Text color="white">&gt; </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            showCursor={!isStreaming}
          />
        </Box>
      </Box>
    </Box>
  )
}
