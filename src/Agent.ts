import { Client } from "@notionhq/client"
import { Thread } from "./Thread.js"
import type {
  ChatAttachmentInput,
  ChatInvocationResponse,
  ChatLifecycleMetadata,
  PollThreadOptions,
  StreamChunk,
  StreamMessage,
  ThreadInfo,
  ThreadListParams,
  ThreadListResponse,
  ThreadListItem,
} from "./types.js"
import {
  StreamError,
  AgentNotFoundError,
  NotionAgentsError,
  ThreadNotFoundError,
  isObjectNotFoundErrorForType,
} from "./errors.js"

export class Agent {
  public readonly id: string
  public readonly name?: string
  private readonly client: Client
  private readonly baseUrl: string
  private readonly auth: string
  private readonly notionVersion: string

  constructor(args: {
    client: Client
    id: string
    name?: string
    baseUrl: string
    auth: string
    notionVersion?: string
  }) {
    this.client = args.client
    this.id = args.id
    this.name = args.name
    this.baseUrl = args.baseUrl
    this.auth = args.auth
    this.notionVersion = args.notionVersion ?? "2025-09-03"
  }

  private buildChatRequestBody(args: {
    message?: string
    attachments?: ChatAttachmentInput[]
    threadId?: string
    metadata?: ChatLifecycleMetadata
    promptContext?: string
  }): Record<string, unknown> {
    const message =
      typeof args.message === "string" && args.message.trim().length > 0
        ? args.message
        : undefined

    const attachments =
      args.attachments && args.attachments.length > 0
        ? args.attachments.map((attachment) => ({
            file_upload: { id: attachment.fileUploadId },
            ...(attachment.name ? { name: attachment.name } : {}),
          }))
        : undefined

    if (!message && !attachments) {
      throw new NotionAgentsError(
        "Either message or attachments is required.",
        "validation_error",
      )
    }

    return {
      ...(message ? { message } : {}),
      ...(args.threadId ? { thread_id: args.threadId } : {}),
      ...(attachments ? { attachments } : {}),
      ...(args.metadata ? { metadata: args.metadata } : {}),
      ...(args.promptContext ? { prompt_context: args.promptContext } : {}),
    }
  }

  /**
   * Start a new chat, or continue an existing one via `threadId`.
   *
   * Note: passing `threadId` to continue an existing thread is deprecated.
   * Prefer `client.agents.agent(agentId).thread(threadId).sendMessage(...)`
   * (which calls `POST /v1/threads/:thread_id/messages`) to append to an
   * existing thread.
   */
  async chat(
    args:
      | {
          message: string
          attachments?: ChatAttachmentInput[]
          /**
           * @deprecated Use `client.agents.agent(agentId).thread(threadId).sendMessage(...)`
           * to continue an existing thread.
           */
          threadId?: string
          metadata?: ChatLifecycleMetadata
          promptContext?: string
        }
      | {
          message?: string
          attachments: ChatAttachmentInput[]
          /**
           * @deprecated Use `client.agents.agent(agentId).thread(threadId).sendMessage(...)`
           * to continue an existing thread.
           */
          threadId?: string
          metadata?: ChatLifecycleMetadata
          promptContext?: string
        },
  ): Promise<ChatInvocationResponse> {
    try {
      return await this.client.request<ChatInvocationResponse>({
        path: `agents/${this.id}/chat`,
        method: "post",
        body: this.buildChatRequestBody(args),
      })
    } catch (error) {
      if (this.isAgentNotFoundError(error)) {
        throw new AgentNotFoundError(this.id)
      }
      if (args.threadId && isObjectNotFoundErrorForType(error, "thread")) {
        throw new ThreadNotFoundError(args.threadId)
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
    if (error instanceof NotionAgentsError) {
      return false
    }

    return isObjectNotFoundErrorForType(error, "agent")
  }

  chatStream(args: {
    message: string
    attachments?: ChatAttachmentInput[]
    threadId?: string
    verbose?: boolean
    metadata?: ChatLifecycleMetadata
    promptContext?: string
    onMessage?: (message: StreamMessage) => void
  }): AsyncGenerator<StreamChunk, ThreadInfo, undefined>
  chatStream(args: {
    message?: string
    attachments: ChatAttachmentInput[]
    threadId?: string
    verbose?: boolean
    metadata?: ChatLifecycleMetadata
    promptContext?: string
    onMessage?: (message: StreamMessage) => void
  }): AsyncGenerator<StreamChunk, ThreadInfo, undefined>
  async *chatStream(args: {
    message?: string
    attachments?: ChatAttachmentInput[]
    threadId?: string
    verbose?: boolean
    metadata?: ChatLifecycleMetadata
    promptContext?: string
    onMessage?: (message: StreamMessage) => void
  }): AsyncGenerator<StreamChunk, ThreadInfo, undefined> {
    const url = new URL(`${this.baseUrl}/v1/agents/${this.id}/chatStream`)
    if (args.verbose !== undefined) {
      url.searchParams.set("verbose", String(args.verbose))
    }

    const response = await fetch(
      url.toString(),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.auth}`,
          "Content-Type": "application/json",
          "Notion-Version": this.notionVersion,
        },
        body: JSON.stringify(this.buildChatRequestBody(args)),
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
    const messagesById: Map<string, StreamMessage> = new Map()
    const messageOrder: string[] = []

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

          if (chunk.type === "error") {
            if (isObjectNotFoundErrorForType(chunk, "agent")) {
              throw new AgentNotFoundError(this.id)
            }
            if (
              args.threadId &&
              isObjectNotFoundErrorForType(chunk, "thread")
            ) {
              throw new ThreadNotFoundError(args.threadId)
            }
            throw new StreamError(chunk.message, chunk.code)
          }

          yield chunk

          if (chunk.type === "started") {
            threadId = chunk.thread_id
            agentId = chunk.agent_id
          } else if (chunk.type === "message") {
            const message: StreamMessage =
              chunk.role === "user"
                ? {
                    id: chunk.id,
                    role: "user",
                    content: chunk.content,
                    ...(chunk.attachments ? { attachments: chunk.attachments } : {}),
                  }
                : {
                    id: chunk.id,
                    role: "agent",
                    content: chunk.content,
                    ...(chunk.content_parts
                      ? { content_parts: chunk.content_parts }
                      : {}),
                  }

            if (!messagesById.has(message.id)) {
              messageOrder.push(message.id)
            }
            messagesById.set(message.id, message)

            args.onMessage?.(message)
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

    const messages = messageOrder
      .map((id) => messagesById.get(id))
      .filter((message): message is StreamMessage => message !== undefined)

    return {
      thread_id: threadId,
      agent_id: agentId,
      messages,
    }
  }
}
