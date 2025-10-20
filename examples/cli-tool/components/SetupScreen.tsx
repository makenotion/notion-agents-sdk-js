import React, { useState, useCallback } from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"
import { Client } from "@notionhq/client"
import type { Config, WorkspaceInfo } from "../types.js"
import { saveConfig, loadEnvDefaults } from "../utils/config.js"

type SetupStep = "token" | "url" | "verifying" | "confirm"

/**
 * First-run setup wizard that collects and verifies Notion API credentials.
 * Walks the user through entering their API token and base URL, validates
 * the credentials by calling the Notion API, and displays workspace info
 * before saving the configuration.
 */
export function SetupScreen({
  onComplete,
}: {
  onComplete: (config: Config) => void
}) {
  const envDefaults = loadEnvDefaults()
  const [step, setStep] = useState<SetupStep>("token")
  const [token, setToken] = useState("")
  const [url, setUrl] = useState(
    envDefaults.baseUrl || "https://api.notion.com",
  )
  const [input, setInput] = useState(envDefaults.apiToken || "")
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verifyCredentials = useCallback(
    async (apiToken: string, baseUrl: string) => {
      setStep("verifying")
      setError(null)

      try {
        const client = new Client({
          auth: apiToken,
          ...(baseUrl && { baseUrl }),
        })

        const botUser = await client.users.me({})

        const info: WorkspaceInfo = {
          botName: botUser.name || "Unknown Bot",
          botId: botUser.id,
        }

        if (botUser.type === "bot" && botUser.bot?.workspace_name) {
          info.workspaceName = botUser.bot.workspace_name
        }

        setWorkspaceInfo(info)
        setStep("confirm")
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to verify credentials"
        setError(`Verification failed: ${errorMessage}`)
        setStep("url")
      }
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    if (step === "token") {
      setToken(input)
      setInput(url)
      setStep("url")
    } else if (step === "url") {
      const finalUrl = input || "https://api.notion.com"
      setUrl(finalUrl)
      verifyCredentials(token, finalUrl)
    } else if (step === "confirm") {
      const config: Config = {
        apiToken: token,
        baseUrl: url !== "https://api.notion.com" ? url : undefined,
      }
      saveConfig(config)
      onComplete(config)
    }
  }, [step, input, token, url, onComplete, verifyCredentials])

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Welcome to Notion Agents CLI
      </Text>
      <Text dimColor>First-time setup required</Text>
      <Box marginTop={1} />

      {step === "token" && (
        <>
          <Text>Enter your Notion API token:</Text>
          <Box marginTop={1}>
            <Text color="white">Token: </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
            />
          </Box>
        </>
      )}

      {step === "url" && (
        <>
          <Text>Enter Notion API base URL (press Enter for default):</Text>
          {error && (
            <Box marginTop={1}>
              <Text color="red">{error}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color="white">URL: </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="https://api.notion.com"
            />
          </Box>
        </>
      )}

      {step === "verifying" && (
        <Box flexDirection="column">
          <Text>Verifying credentials...</Text>
        </Box>
      )}

      {step === "confirm" && workspaceInfo && (
        <>
          <Text color="green">✓ Credentials verified successfully!</Text>
          <Box marginTop={1} />
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
            <Text dimColor>Bot ID: {workspaceInfo.botId}</Text>
          </Box>
          <Box marginTop={1} />
          <Text>Press Enter to continue</Text>
          <Box marginTop={1}>
            <TextInput
              value=""
              onChange={() => {}}
              onSubmit={handleSubmit}
              showCursor={false}
            />
          </Box>
        </>
      )}
    </Box>
  )
}
