import { Client } from "@notionhq/client"
import { Agent } from "./Agent.js"
import type { AgentListResponse } from "./types.js"

export class AgentOperations {
  private readonly client: Client
  private readonly auth: string
  private readonly baseUrl: string
  private readonly notionVersion: string

  constructor(args: {
    client: Client
    auth: string
    baseUrl: string
    notionVersion?: string
  }) {
    this.client = args.client
    this.auth = args.auth
    this.baseUrl = args.baseUrl
    this.notionVersion = args.notionVersion ?? "2025-09-03"
  }

  async list(args?: { name?: string }): Promise<Array<Agent>> {
    const query = args?.name ? { name: args.name } : undefined
    const response = await this.client.request<AgentListResponse>({
      path: "agents",
      method: "get",
      ...(query ? { query } : {}),
    })
    return response.results.map(
      (agent) =>
        new Agent({
          client: this.client,
          id: agent.id,
          name: agent.name,
          instruction: agent.instruction,
          auth: this.auth,
          baseUrl: this.baseUrl,
          notionVersion: this.notionVersion,
        }),
    )
  }
}
