import { Client } from "@notionhq/client"
import type {
  ChatInvocationResponse,
  ContinueThreadArgs,
  ThreadData,
  PollThreadOptions,
  ThreadMessageListParams,
  ThreadMessageListResponse,
  ThreadListResponse,
  ThreadListItem,
} from "./types.js"
import {
  ThreadNotFoundError,
  PollingTimeoutError,
  isObjectNotFoundErrorForType,
} from "./errors.js"

export class Thread {
  public readonly threadId: string
  public readonly agentId: string
  private readonly client: Client

  constructor(args: { client: Client; threadId: string; agentId: string }) {
    this.client = args.client
    this.threadId = args.threadId
    this.agentId = args.agentId
  }

  async get(): Promise<ThreadListItem> {
    const response = await this.client.request<ThreadListResponse>({
      path: `agents/${this.agentId}/threads`,
      method: "get",
      query: { id: this.threadId },
    })

    if (response.results.length === 0) {
      throw new ThreadNotFoundError(this.threadId)
    }

    return response.results[0]
  }

  async listMessages(
    params?: ThreadMessageListParams,
  ): Promise<ThreadMessageListResponse> {
    const query: Record<string, string | number> = {}
    if (params?.verbose !== undefined) query.verbose = String(params.verbose)
    if (params?.role) query.role = params.role
    if (params?.start_cursor) query.start_cursor = params.start_cursor
    if (params?.page_size) query.page_size = params.page_size

    return this.client.request<ThreadMessageListResponse>({
      path: `threads/${this.threadId}/messages`,
      method: "get",
      query,
    })
  }

  async continue(args: ContinueThreadArgs): Promise<ChatInvocationResponse> {
    const body: Record<string, unknown> = {
      action_id: args.actionId,
      option_id: args.optionId,
    }
    if (args.optionId === "use_connection") {
      body.input = { connection_id: args.input.connectionId }
    }

    try {
      return await this.client.request<ChatInvocationResponse>({
        path: `threads/${this.threadId}/continue`,
        method: "post",
        body,
      })
    } catch (error) {
      if (isObjectNotFoundErrorForType(error, "thread")) {
        throw new ThreadNotFoundError(this.threadId)
      }
      throw error
    }
  }

  async poll(options: PollThreadOptions = {}): Promise<ThreadListItem> {
    const {
      maxAttempts = 60,
      baseDelayMs = 1000,
      maxDelayMs = 10000,
      initialDelayMs = 1000,
      onPending,
      onThreadNotFound,
    } = options

    if (initialDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, initialDelayMs))
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const thread = await this.get()

        if (
          thread.status === "completed" ||
          thread.status === "failed" ||
          thread.status === "requires_action"
        ) {
          return thread
        }

        onPending?.(thread, attempt)
      } catch (error) {
        if (
          error instanceof ThreadNotFoundError ||
          isObjectNotFoundErrorForType(error, "thread")
        ) {
          onThreadNotFound?.(attempt)
        } else {
          throw error
        }
      }

      const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * baseDelayMs
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    throw new PollingTimeoutError(maxAttempts)
  }
}
