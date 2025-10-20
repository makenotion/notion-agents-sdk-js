import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
import type { Config } from "../types.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CONFIG_PATH = join(__dirname, "..", "config.json")

/**
 * Loads the saved configuration from config.json.
 * Returns null if the file doesn't exist or cannot be parsed.
 */
export function loadConfig(): Config | null {
  if (!existsSync(CONFIG_PATH)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"))
  } catch {
    return null
  }
}

/**
 * Saves the configuration to config.json for future sessions.
 */
export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

/**
 * Attempts to load default values from the repository root's .env file.
 * This provides a convenient way to pre-populate the setup wizard with
 * values from an existing development environment configuration.
 */
export function loadEnvDefaults(): { apiToken?: string; baseUrl?: string } {
  const rootEnvPath = join(__dirname, "..", "..", "..", ".env")
  if (!existsSync(rootEnvPath)) {
    return {}
  }

  try {
    const envContent = readFileSync(rootEnvPath, "utf-8")
    const lines = envContent.split("\n")
    const env: { apiToken?: string; baseUrl?: string } = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith("NOTION_API_TOKEN=")) {
        env.apiToken = trimmed.substring("NOTION_API_TOKEN=".length).trim()
      } else if (trimmed.startsWith("NOTION_BASE_URL=")) {
        env.baseUrl = trimmed.substring("NOTION_BASE_URL=".length).trim()
      }
    }

    return env
  } catch {
    return {}
  }
}
