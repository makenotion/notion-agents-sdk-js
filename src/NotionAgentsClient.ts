import { Client } from "@notionhq/client"
import { AgentOperations } from "./AgentOperations.js"
import { SessionOperations } from "./SessionOperations.js"
import type { ClientOptions } from "./types.js"

export class NotionAgentsClient extends Client {
  public readonly agents: AgentOperations
  public readonly sessions: SessionOperations

  constructor(options: ClientOptions) {
    if (!options.auth || options.auth.trim() === "") {
      throw new Error(
        "Notion API token is required. Pass it via the 'auth' option.",
      )
    }

    const baseUrl = options.baseUrl ?? "https://api.notion.com"
    const notionVersion = options.notionVersion ?? "2025-09-03"

    super({
      auth: options.auth,
      baseUrl,
      notionVersion,
    })

    this.agents = new AgentOperations({
      client: this,
      auth: options.auth,
      baseUrl,
      notionVersion,
    })

    this.sessions = new SessionOperations({
      client: this,
    })
  }
}
