import { Client } from "@notionhq/client"
import { Thread } from "./Thread.js"
import type {
  ChatInvocationResponse,
  PollThreadOptions,
  StreamChunk,
  ThreadInfo,
  ThreadListParams,
  ThreadListResponse,
  ThreadListItem,
} from "./types.js"
import { StreamError, AgentNotFoundError } from "./errors.js"

export class Agent {
  public readonly id: string
  public readonly name?: string
  public readonly instruction?: string | null
  private readonly client: Client
  private readonly baseUrl: string
  private readonly auth: string
  private readonly notionVersion: string

  constructor(args: {
    client: Client
    id: string
    name?: string
    instruction?: string | null
    baseUrl: string
    auth: string
    notionVersion?: string
  }) {
    this.client = args.client
    this.id = args.id
    this.name = args.name
    this.instruction = args.instruction
    this.baseUrl = args.baseUrl
    this.auth = args.auth
    this.notionVersion = args.notionVersion ?? "2025-09-03"
  }

  async chat(args: {
    message: string
    threadId?: string
  }): Promise<ChatInvocationResponse> {
    try {
      return await this.client.request<ChatInvocationResponse>({
        path: `agents/${this.id}/chat`,
        method: "post",
        body: {
          message: args.message,
          ...(args.threadId ? { thread_id: args.threadId } : {}),
        },
      })
    } catch (error) {
      if (this.isAgentNotFoundError(error)) {
        throw new AgentNotFoundError(this.id)
      }
      throw error
    }
  }

  thread(threadId: string): Thread {
    return new Thread({
      client: this.client,
      threadId,
      agentId: this.id,
    })
  }

  async getThread(threadId: string): Promise<ThreadListItem> {
    const thread = this.thread(threadId)
    return thread.get()
  }

  async pollThread(
    threadId: string,
    options?: PollThreadOptions,
  ): Promise<ThreadListItem> {
    const thread = this.thread(threadId)
    return thread.poll(options)
  }

  async listThreads(params?: ThreadListParams): Promise<ThreadListResponse> {
    const query: Record<string, string | number> = {}
    if (params?.id) query.id = params.id
    if (params?.title) query.title = params.title
    if (params?.status) query.status = params.status
    if (params?.created_by_type) query.created_by_type = params.created_by_type
    if (params?.created_by_id) query.created_by_id = params.created_by_id
    if (params?.start_cursor) query.start_cursor = params.start_cursor
    if (params?.page_size) query.page_size = params.page_size

    try {
      return await this.client.request<ThreadListResponse>({
        path: `agents/${this.id}/threads`,
        method: "get",
        query,
      })
    } catch (error) {
      if (this.isAgentNotFoundError(error)) {
        throw new AgentNotFoundError(this.id)
      }
      throw error
    }
  }

  private isAgentNotFoundError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "object_not_found" || error.code === "validation_error")
    )
  }

  async *chatStream(args: {
    message: string
    threadId?: string
    onMessage?: (message: { role: "user" | "agent"; content: string }) => void
  }): AsyncGenerator<StreamChunk, ThreadInfo, undefined> {
    const response = await fetch(
      `${this.baseUrl}/v1/agents/${this.id}/chatStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.auth}`,
          "Content-Type": "application/json",
          "Notion-Version": this.notionVersion,
        },
        body: JSON.stringify({
          message: args.message,
          ...(args.threadId ? { thread_id: args.threadId } : {}),
        }),
      },
    )

    if (!response.ok) {
      throw new StreamError(
        `HTTP ${response.status}: ${response.statusText}`,
        "http_error",
      )
    }

    if (!response.body) {
      throw new StreamError("No response body", "missing_response_body")
    }

    let threadId: string | undefined
    let agentId: string | undefined
    const messagesByRole: Map<"user" | "agent", string> = new Map()

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) {
            continue
          }

          const chunk: StreamChunk = JSON.parse(line)
          yield chunk

          if (chunk.type === "started") {
            threadId = chunk.thread_id
            agentId = chunk.agent_id
          } else if (chunk.type === "message") {
            messagesByRole.set(chunk.role, chunk.content)
            args.onMessage?.({ role: chunk.role, content: chunk.content })
          } else if (chunk.type === "error") {
            throw new StreamError(chunk.message, chunk.code)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!threadId || !agentId) {
      throw new StreamError(
        "Stream did not provide required thread_id or agent_id",
        "invalid_stream_response",
      )
    }

    const messages: Array<{ role: "user" | "agent"; content: string }> = []
    if (messagesByRole.has("user")) {
      messages.push({
        role: "user",
        // SAFETY: We checked the map key exists in the `if` statement above.
        content: messagesByRole.get("user")!,
      })
    }
    if (messagesByRole.has("agent")) {
      messages.push({
        role: "agent",
        // SAFETY: We checked the map key exists in the `if` statement above.
        content: messagesByRole.get("agent")!,
      })
    }

    return {
      thread_id: threadId,
      agent_id: agentId,
      messages,
    }
  }
}
