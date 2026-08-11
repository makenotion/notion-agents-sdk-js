import { Client } from "@notionhq/client"
import type { SessionListResponse, SessionQueryParams } from "./types.js"

export class SessionOperations {
  private readonly client: Client

  constructor(args: { client: Client }) {
    this.client = args.client
  }

  async query(params?: SessionQueryParams): Promise<SessionListResponse> {
    const body: Record<string, unknown> = {}
    if (params?.query !== undefined) body.query = params.query
    if (params?.filter !== undefined) body.filter = params.filter
    if (params?.sorts !== undefined) body.sorts = params.sorts
    if (params?.start_cursor !== undefined) {
      body.start_cursor = params.start_cursor
    }
    if (params?.page_size !== undefined) body.page_size = params.page_size

    return this.client.request<SessionListResponse>({
      path: "sessions/query",
      method: "post",
      body,
    })
  }
}
