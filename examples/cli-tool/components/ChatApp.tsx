import React, { useState, useEffect, useCallback } from "react"
import { Box, Text, useInput, useApp } from "ink"
import TextInput from "ink-text-input"
import { NotionAgentsClient, stripLangTags } from "@notionhq/agents-client"
import { Client } from "@notionhq/client"
import type { AgentData } from "@notionhq/agents-client"
import type { Config, Message, AppMode, WorkspaceInfo } from "../types.js"
import { saveConfig } from "../utils/config.js"
import { AgentSelector } from "./AgentSelector.js"

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
          role: msg.role,
          content: stripLangTags(msg.content),
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
              const nextMessage = {
                id: chunk.id,
                role: "agent" as const,
                content: cleanContent,
                isPartial: true,
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
        </Box>
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
        {messages.map((msg, idx) => (
          <Box key={idx} flexDirection="column" marginBottom={1}>
            <Text bold color={msg.role === "user" ? "green" : "blue"}>
              {msg.role === "user" ? "You" : currentAgent?.name}:
            </Text>
            <Text>{msg.content}</Text>
          </Box>
        ))}
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
