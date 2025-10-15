import { Client } from "@notionhq/client"
import { Thread } from "./Thread.js"
import type {
  ChatInvocationResponse,
  ThreadData,
  PollThreadOptions,
  StreamChunk,
  ThreadInfo,
} from "./types.js"

export class Agent {
  public readonly id: string
  public readonly name: string
  public readonly instruction: string | null
  private readonly client: Client
  private readonly baseUrl: string
  private readonly auth: string
  private readonly notionVersion: string

  constructor(args: {
    client: Client
    id: string
    name: string
    instruction: string | null
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
    return this.client.request<ChatInvocationResponse>({
      path: `agents/${this.id}/chat`,
      method: "post",
      body: {
        message: args.message,
        ...(args.threadId ? { thread_id: args.threadId } : {}),
      },
    })
  }

  thread(threadId: string): Thread {
    return new Thread({
      client: this.client,
      threadId,
      agentId: this.id,
    })
  }

  async getThread(threadId: string): Promise<ThreadData> {
    const thread = this.thread(threadId)
    return thread.get()
  }

  async pollThread(
    threadId: string,
    options?: PollThreadOptions,
  ): Promise<ThreadData> {
    const thread = this.thread(threadId)
    return thread.poll(options)
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error("No response body")
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

          const chunk = JSON.parse(line) as StreamChunk
          yield chunk

          if (chunk.type === "started") {
            threadId = chunk.thread_id
            agentId = chunk.agent_id
          } else if (chunk.type === "message") {
            messagesByRole.set(chunk.role, chunk.content)
            args.onMessage?.({ role: chunk.role, content: chunk.content })
          } else if (chunk.type === "error") {
            throw new Error(`[${chunk.code}] ${chunk.message}`)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!threadId || !agentId) {
      throw new Error("Stream did not provide thread_id")
    }

    const messages: Array<{ role: "user" | "agent"; content: string }> = []
    if (messagesByRole.has("user")) {
      messages.push({
        role: "user",
        content: messagesByRole.get("user") as string,
      })
    }
    if (messagesByRole.has("agent")) {
      messages.push({
        role: "agent",
        content: messagesByRole.get("agent") as string,
      })
    }

    return {
      thread_id: threadId,
      agent_id: agentId,
      messages,
    }
  }
}
