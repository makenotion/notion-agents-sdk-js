import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"
import type { Config } from "../types.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CONFIG_PATH = join(__dirname, "..", "config.json")

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

export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

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
