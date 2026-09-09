import { iteratePaginatedAPI, collectPaginatedAPI } from "@notionhq/client"
import type { NotionAgentsClient } from "./NotionAgentsClient.js"
import type { Agent } from "./Agent.js"
import type { Thread } from "./Thread.js"
import type {
  AgentListParams,
  AgentData,
  SessionEvent,
  SessionEventQueryParams,
  ThreadListParams,
  ThreadListItem,
  ThreadMessageListParams,
  ThreadMessageItem,
} from "./types.js"

/**
 * Returns an async iterator over all agents.
 *
 * Automatically handles pagination, yielding agents one at a time.
 *
 * @param client - Notion agents client instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * for await (const agent of iterateAgents(client, { name: "Sales" })) {
 *   console.log(agent.name)
 * }
 * ```
 */
export function iterateAgents(
  client: NotionAgentsClient,
  params?: Omit<AgentListParams, "start_cursor">,
): AsyncIterableIterator<AgentData> {
  return iteratePaginatedAPI(
    (args: AgentListParams) => client.agents.list(args),
    params || {},
  )
}

/**
 * Collects all agents into an in-memory array.
 *
 * Automatically handles pagination, returning all results at once.
 *
 * @param client - Notion agents client instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const allAgents = await collectAgents(client)
 * console.log(`Found ${allAgents.length} agents`)
 * ```
 */
export function collectAgents(
  client: NotionAgentsClient,
  params?: Omit<AgentListParams, "start_cursor">,
): Promise<AgentData[]> {
  return collectPaginatedAPI(
    (args: AgentListParams) => client.agents.list(args),
    params || {},
  )
}

/**
 * Returns an async iterator over all threads for an agent.
 *
 * Automatically handles pagination, yielding threads one at a time.
 *
 * @param agent - Agent instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const agent = client.agents.agent(agentId)
 * for await (const thread of iterateThreads(agent, { status: "completed" })) {
 *   console.log(thread.title)
 * }
 * ```
 */
export function iterateThreads(
  agent: Agent,
  params?: Omit<ThreadListParams, "start_cursor">,
): AsyncIterableIterator<ThreadListItem> {
  return iteratePaginatedAPI(
    (args: ThreadListParams) => agent.listThreads(args),
    params || {},
  )
}

/**
 * Collects all threads for an agent into an in-memory array.
 *
 * Automatically handles pagination, returning all results at once.
 *
 * @param agent - Agent instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const agent = client.agents.agent(agentId)
 * const allThreads = await collectThreads(agent, { status: "completed" })
 * console.log(`Found ${allThreads.length} completed threads`)
 * ```
 */
export function collectThreads(
  agent: Agent,
  params?: Omit<ThreadListParams, "start_cursor">,
): Promise<ThreadListItem[]> {
  return collectPaginatedAPI(
    (args: ThreadListParams) => agent.listThreads(args),
    params || {},
  )
}

/**
 * Returns an async iterator over all messages in a thread.
 *
 * Automatically handles pagination, yielding messages one at a time.
 *
 * @param thread - Thread instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const thread = agent.thread(threadId)
 * for await (const message of iterateMessages(thread, { role: "agent" })) {
 *   console.log(`${message.role}: ${message.content}`)
 * }
 * ```
 */
export function iterateMessages(
  thread: Thread,
  params?: Omit<ThreadMessageListParams, "start_cursor">,
): AsyncIterableIterator<ThreadMessageItem> {
  return iteratePaginatedAPI(
    (args: ThreadMessageListParams) => thread.listMessages(args),
    params || {},
  )
}

/**
 * Collects all messages in a thread into an in-memory array.
 *
 * Automatically handles pagination, returning all results at once.
 *
 * @param thread - Thread instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const thread = agent.thread(threadId)
 * const allMessages = await collectMessages(thread)
 * console.log(`Thread has ${allMessages.length} messages`)
 * ```
 */
export function collectMessages(
  thread: Thread,
  params?: Omit<ThreadMessageListParams, "start_cursor">,
): Promise<ThreadMessageItem[]> {
  return collectPaginatedAPI(
    (args: ThreadMessageListParams) => thread.listMessages(args),
    params || {},
  )
}

/**
 * Returns an async iterator over all session events for a thread.
 *
 * Automatically handles pagination, yielding events one at a time.
 *
 * @param thread - Thread instance
 * @param params - Optional filter, sort, and pagination parameters
 *   (start_cursor will be managed automatically)
 *
 * @example
 * ```typescript
 * const thread = agent.thread(threadId)
 * for await (const event of iterateSessionEvents(thread)) {
 *   console.log(event.type, event.sequence)
 * }
 * ```
 */
export function iterateSessionEvents(
  thread: Thread,
  params?: Omit<SessionEventQueryParams, "start_cursor">,
): AsyncIterableIterator<SessionEvent> {
  return iteratePaginatedAPI(
    (args: SessionEventQueryParams) => thread.queryEvents(args),
    params || {},
  )
}

/**
 * Collects all session events for a thread into an in-memory array.
 *
 * Automatically handles pagination, returning all results at once.
 *
 * @param thread - Thread instance
 * @param params - Optional filter, sort, and pagination parameters
 *   (start_cursor will be managed automatically)
 *
 * @example
 * ```typescript
 * const thread = agent.thread(threadId)
 * const allEvents = await collectSessionEvents(thread)
 * console.log(`Session has ${allEvents.length} events`)
 * ```
 */
export function collectSessionEvents(
  thread: Thread,
  params?: Omit<SessionEventQueryParams, "start_cursor">,
): Promise<SessionEvent[]> {
  return collectPaginatedAPI(
    (args: SessionEventQueryParams) => thread.queryEvents(args),
    params || {},
  )
}
