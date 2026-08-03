import { Client } from "@notionhq/client"
import { Agent } from "./Agent.js"
import type { AgentListResponse, AgentListParams } from "./types.js"
import { PERSONAL_AGENT_ID } from "./types.js"

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

  async list(args?: AgentListParams): Promise<AgentListResponse> {
    const query: Record<string, string | number | string[]> = {}
    if (args?.name) query.name = args.name
    if (args?.agent_type && args.agent_type.length > 0) {
      query.agent_type = args.agent_type
    }
    if (args?.agent_ids && args.agent_ids.length > 0) {
      query.agent_ids = args.agent_ids
    }
    if (args?.created_by && args.created_by.length > 0) {
      query.created_by = args.created_by
    }
    if (args?.created_after) query.created_after = args.created_after
    if (args?.created_before) query.created_before = args.created_before
    if (args?.sort_by) query.sort_by = args.sort_by
    if (args?.sort_direction) query.sort_direction = args.sort_direction
    if (args?.favorited !== undefined) query.favorited = String(args.favorited)
    if (args?.has_mcp_connections !== undefined) {
      query.has_mcp_connections = String(args.has_mcp_connections)
    }
    if (args?.start_cursor) query.start_cursor = args.start_cursor
    if (args?.page_size) query.page_size = args.page_size

    const response = await this.client.request<AgentListResponse>({
      path: "agents",
      method: "get",
      query,
    })

    return response
  }

  agent(agentId: string): Agent {
    return new Agent({
      client: this.client,
      id: agentId,
      auth: this.auth,
      baseUrl: this.baseUrl,
      notionVersion: this.notionVersion,
    })
  }

  /**
   * @deprecated Personal agent access is unsupported and should not be
   * used for new integrations.
   */
  personal(): Agent {
    return this.agent(PERSONAL_AGENT_ID)
  }
}
