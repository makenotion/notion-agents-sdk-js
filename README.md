# Notion Agents SDK for JavaScript (Alpha)

A TypeScript/JavaScript SDK for interacting with Notion Agents via the Notion Agents Public API.

Status: **Alpha**

> **Notion Agents API reference**: [developers.notion.com/reference/internal/list-agents](https://developers.notion.com/reference/internal/list-agents)

This SDK is a thin, typed layer on top of the official Notion SDK (`@notionhq/client`). In addition to agent-specific helpers, you can call standard Notion API endpoints (pages, databases, blocks, …) through the same client instance.

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quickstart (async)](#quickstart-async)
- [Quickstart (streaming)](#quickstart-streaming)
- [Concepts](#concepts)
  - [Threads and messages](#threads-and-messages)
- [Verbose output: `content_parts`](#verbose-output-content_parts)
- [API reference (SDK)](#api-reference-sdk)
- [Errors](#errors)
- [Examples](#examples)

## Requirements

- **Node.js 18+** (the streaming API uses `fetch` and Web Streams)
- **ESM**: this package is ESM-only (`"type": "module"`)
- A Notion API token (internal integration secret)
  - Notion getting started guide: [developers.notion.com](https://developers.notion.com/guides/get-started/getting-started)
- Alpha access & Custom Agents access

This SDK supports custom agents via internal integrations. Personal agent and public integration access are not supported.

## Installation

### Clone + build + install from a local path

1. Clone the repository containing this SDK.
2. Build the SDK:

   ```bash
   cd notion-agents-sdk-js
   npm install
   npm run build
   ```

3. In your project, install from the local path:

   ```bash
   npm install /absolute/path/to/notion-agents-sdk-js
   ```

### Alternative: build a tarball (`.tgz`) and install that

If you want a single file you can share internally (e.g. attach to a GitHub Release), you can build a tarball:

```bash
cd notion-agents-sdk-js
npm install
npm run build
npm pack
```

That produces a file like `notionhq-agents-client-1.0.0.tgz`, which you can install from a path or URL:

```bash
npm install /absolute/path/to/notionhq-agents-client-1.0.0.tgz
# or: npm install https://host/path/notionhq-agents-client-1.0.0.tgz
```

### Environment variables

Most examples assume your token is set as:

```bash
export NOTION_API_TOKEN="secret_..."
```

## Quickstart (async)

The async flow returns immediately with a `thread_id`, then you poll for completion and fetch messages separately.

```ts
import { NotionAgentsClient } from "@notionhq/agents-client"

const client = new NotionAgentsClient({
  auth: process.env.NOTION_API_TOKEN!,
})

// Pick an agent
const agents = await client.agents.list({ page_size: 10 })
const agent = client.agents.agent(agents.results[0].id)

// Start a conversation (returns quickly with pending status)
const invocation = await agent.chat({ message: "Hello!" })

// Poll until the thread is completed or failed
const thread = agent.thread(invocation.thread_id)
const threadInfo = await thread.poll()
console.log(`Thread status: ${threadInfo.status}`)

// Fetch messages (separate endpoint)
const messages = await thread.listMessages({ page_size: 50, verbose: true })
for (const message of messages.results) {
  console.log(`${message.role}: ${message.content}`)
}
```

## Quickstart (streaming)

The streaming flow returns newline-delimited JSON (NDJSON) under the hood. The SDK exposes it as an async generator of parsed chunks.

```ts
import { NotionAgentsClient, stripLangTags } from "@notionhq/agents-client"

const client = new NotionAgentsClient({
  auth: process.env.NOTION_API_TOKEN!,
})

const agents = await client.agents.list({ page_size: 10 })
const agent = client.agents.agent(agents.results[0].id)

for await (const chunk of agent.chatStream({ message: "Summarize my week" })) {
  if (chunk.type === "message" && chunk.role === "agent") {
    process.stdout.write(stripLangTags(chunk.content))
  }

  if (chunk.type === "error") {
    throw new Error(`Stream error [${chunk.code}]: ${chunk.message}`)
  }
}
```

### Getting the final `ThreadInfo` from `chatStream()`

`chatStream()` yields chunks as they arrive, and also returns a final value (`ThreadInfo`) when the stream ends (thread id, agent id, and the ordered, upserted messages).

To capture that return value, you can iterate manually:

```ts
const stream = agent.chatStream({ message: "Hello" })

let threadInfo
while (true) {
  const { value, done } = await stream.next()
  if (done) {
    threadInfo = value
    break
  }
}

console.log(threadInfo.thread_id, threadInfo.messages.length)
```

## Concepts

### Threads and messages

A chat happens inside a **thread**:

- `agent.chat()` creates/continues a thread and returns `{ thread_id, status: "pending" }`.
- `thread.poll()` checks `GET /v1/agents/:agent_id/threads?id=<thread_id>` until the thread is `completed` or `failed`.
- `thread.listMessages()` fetches messages from `GET /v1/threads/:thread_id/messages`.

Important: polling returns **thread metadata** (status/title/creator/version). Messages are fetched separately via `listMessages()`.

## Verbose output: `content_parts`

When available, agent messages can include a structured representation of what the agent is doing, in `content_parts`.

- **Streaming**: `agent.chatStream()` includes `content_parts` by default. Pass `verbose: false` to omit it.
- **Message listing**: `thread.listMessages({ verbose: true })` may include `content_parts` for agent messages. Pass `verbose: false` to omit it.

`content_parts` is an ordered array. You can think of it as “UI-friendly structure”, while `content` remains plain text.

High-level part types you may encounter:

- `{ type: "text", text: string }` — model text
- `{ type: "thinking", text: string }` — model reasoning (encrypted thinking is not surfaced)
- `{ type: "tool_call", tool_call_id: string | null, tool_name: string, input: string, results?: ToolResult[] }` — tool invocation and any associated tool results
- `{ type: "follow_ups", follow_ups: Array<{ label: string, message: string }> }` — suggested follow-ups
- `{ type: "custom_agent_template_picker" }` — non-text UI state used by the agent runtime

If you don’t need this level of detail, prefer `verbose: false` and use `content` only.

## API reference (SDK)

### Exports

In addition to the core classes, the package exports:

- `stripLangTags(text: string): string` — removes `<lang ...>` tags from agent output
- Pagination helpers: `iterateAgents` / `collectAgents` / `iterateThreads` / `collectThreads` / `iterateMessages` / `collectMessages`
- TypeScript types for requests/responses/streaming chunks (see `dist/index.d.ts` once built)

### `NotionAgentsClient`

```ts
import { NotionAgentsClient } from "@notionhq/agents-client"

const client = new NotionAgentsClient({
  auth: string,                 // required
  baseUrl?: string,             // defaults to "https://api.notion.com"
  notionVersion?: string,       // defaults to "2025-09-03"
})
```

Notes:

- Extends `@notionhq/client`’s `Client`, so you can also call `client.pages`, `client.databases`, etc.
- Adds `client.agents` for agent-specific operations.

### `client.agents` (`AgentOperations`)

#### `list(params?)`

Lists all accessible agents.

```ts
await client.agents.list({
  name?: string,
  agent_type?: Array<"notion_ai" | "custom_agent" | "autofill_custom_agent" | "external">,
  agent_ids?: string[],
  created_by?: Array<string | "me">,
  page_size?: number,
  start_cursor?: string,
})
```

- `agent_type`: filter agents by one or more agent types.
- `agent_ids`: filter agents by one or more agent IDs.
- `created_by`: filter agents by one or more creator user IDs. Use `"me"` for the user associated with the API token.

Returns `Promise<AgentListResponse>`.

#### `agent(agentId)`

Creates an `Agent` instance:

```ts
const agent = client.agents.agent(agentId)
```

### `Agent`

An `Agent` represents a single custom agent.

#### `chat(args)`

Starts or continues a conversation (async invocation).

```ts
await agent.chat({
  message?: string,
  attachments?: Array<{ fileUploadId: string, name?: string }>,
  threadId?: string,
  metadata?: { user_id?: string },
  promptContext?: string,
})
```

You must provide either a non-empty `message` or at least one `attachment`.

Attachments must reference files uploaded via the Notion **File Upload API**. The agent runtime may surface attachments back to you as signed URLs (with an `expiry_time`) in user message chunks and in `listMessages()` responses.

- `metadata.user_id`: caller-provided external user identifier for lifecycle metadata and correlation. Does not change the Notion actor used for authorization.
- `promptContext`: additional caller-provided context for the agent to consider while responding.

Returns `Promise<ChatInvocationResponse>`.

#### `chatStream(args)`

Starts or continues a conversation (streaming). Yields `StreamChunk` objects as they arrive.

```ts
const stream = agent.chatStream({
  message?: string,
  attachments?: Array<{ fileUploadId: string, name?: string }>,
  threadId?: string,
  verbose?: boolean, // default true
  metadata?: { user_id?: string },
  promptContext?: string,
  onMessage?: (message: StreamMessage) => void,
})
```

Notes:

- Agent message chunks may be emitted multiple times for the same `id` as more information becomes available; treat them as **upserts keyed by `id`**.
- When `verbose: false`, agent message chunks omit `content_parts` and only return `content`.
- When `metadata` is provided on the request, it is echoed back on the `started` and `done` stream chunks as `metadata`.

Returns `AsyncGenerator<StreamChunk, ThreadInfo, undefined>`.

#### Threads

```ts
const thread = agent.thread(threadId)
await agent.getThread(threadId)      // == agent.thread(threadId).get()
await agent.pollThread(threadId)     // == agent.thread(threadId).poll()
await agent.continueThread(threadId, {...}) // == agent.thread(threadId).continue({...})
await agent.listThreads({...})       // list/paginate/filter threads
```

### `Thread`

#### `get()`

Fetches thread metadata:

```ts
const threadInfo = await thread.get()
```

Returns `Promise<ThreadListItem>`.

#### `poll(options?)`

Polls until the thread is `completed` or `failed`, with exponential backoff:

```ts
await thread.poll({
  maxAttempts?: number,      // default 60
  baseDelayMs?: number,      // default 1000
  maxDelayMs?: number,       // default 10000
  initialDelayMs?: number,   // default 1000
  onPending?: (thread, attempt) => void,
  onThreadNotFound?: (attempt) => void,
})
```

Returns `Promise<ThreadListItem>`. Throws `PollingTimeoutError` if attempts are exceeded. Polling also stops when the thread reaches the terminal `requires_action` status (see [Pending user actions](#pending-user-actions)).

#### `listMessages(params?)`

Lists messages in a thread:

```ts
await thread.listMessages({
  verbose?: boolean,               // default true
  role?: "user" | "agent",
  page_size?: number,
  start_cursor?: string,
})
```

Returns `Promise<ThreadMessageListResponse>`.

#### `continue(args)`

Responds to one pending user action on the thread (see [Pending user actions](#pending-user-actions)):

```ts
// Approve or reject the action.
await thread.continue({
  actionId: string,
  optionId: "approve" | "reject",
})

// Or provide a connection when the action requires one.
await thread.continue({
  actionId: string,
  optionId: "use_connection",
  input: { connectionId: string },
})
```

Returns `Promise<ChatInvocationResponse>` — the thread resumes as a new pending invocation, which you can `poll()` or observe via `listMessages()`.

### Pending user actions

Some agent tool calls require the caller to confirm before they run. When that happens, the thread finishes its current turn in the `requires_action` status and surfaces the blocking actions on `pending_user_actions`:

- `thread.get()` / `agent.listThreads()` — items include `status: "requires_action"` and a `pending_user_actions` array.
- `thread.listMessages()` — the blocking agent message includes `pending_user_actions`.
- `agent.chatStream()` — a terminal `waiting_for_user` chunk (and the final `done` chunk with `status: "requires_action"`) carries `pending_user_actions`.

Each pending action has an `id`, a human-readable `title`, one or more `requirements` describing why user input is needed (e.g. `delete_content`, `url_safety`, `connect_integration`), and the `options` the caller can respond with. Pass the action `id` and the chosen option to `thread.continue()` to resume the thread.

### Pagination helpers

The SDK exports pagination helpers that automatically manage `start_cursor`:

```ts
import {
  iterateAgents,
  collectAgents,
  iterateThreads,
  collectThreads,
  iterateMessages,
  collectMessages,
} from "@notionhq/agents-client"
```

## Errors

The SDK provides error classes for common scenarios:

```ts
import {
  NotionAgentsError,
  AgentNotFoundError,
  ThreadNotFoundError,
  PollingTimeoutError,
  StreamError,
} from "@notionhq/agents-client"
```

- `AgentNotFoundError`: thrown when an agent is missing/inaccessible for certain SDK calls.
- `ThreadNotFoundError`: thrown when a thread cannot be found via the thread listing endpoint.
- `PollingTimeoutError`: thrown when `poll()` exceeds `maxAttempts`.
- `StreamError`: thrown for streaming-specific failures (HTTP errors, missing body, malformed stream).

Streaming can also produce `chunk.type === "error"` with a machine-readable `code` and a message; handle both patterns.

## Examples

See `examples/README.md` for runnable scripts:

- `examples/basic-usage.ts` — async chat + polling + message fetch
- `examples/streaming.ts` — streaming chunks + incremental display
- `examples/pagination.ts` — iterators/collectors for pagination

To run examples from the SDK repo:

```bash
npm install
npm run build
npx tsx examples/basic-usage.ts
```
