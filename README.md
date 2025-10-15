# @notionhq/agents-client

A TypeScript SDK for interacting with Notion Custom Agents via the public API.

## Features

- Clean, type-safe wrapper around the official Notion SDK
- `Agent` class for agent-specific operations
- `Thread` class for managing chat threads
- Streaming support for real-time responses
- Built-in polling with exponential backoff
- Full TypeScript support

## Installation

```bash
npm install @notionhq/agents-client
```

## Quick start

```typescript
import { NotionAgentsClient } from "@notionhq/agents-client"

const client = new NotionAgentsClient({
  auth: process.env.NOTION_API_TOKEN,
})

// List all agents
const agents = await client.agents.list()
const agent = agents[0]

// Start a chat
const invocation = await agent.chat({ message: "Hello!" })

// Get the thread and poll until completion
const thread = agent.thread(invocation.thread_id)
const result = await thread.poll()

console.log(result.messages)
```

## Usage

### Creating a client

```typescript
import { NotionAgentsClient } from "@notionhq/agents-client"

const client = new NotionAgentsClient({
  auth: "your_api_token",
  baseUrl: "https://api.notion.com", // optional, defaults to production
  notionVersion: "2025-09-03", // optional
})
```

### Listing agents

```typescript
// List all agents
const agents = await client.agents.list()

// Filter by name
const salesAgents = await client.agents.list({ name: "Sales" })
```

### Chatting with agents

#### Async mode

```typescript
const agent = agents[0]

// Start a new conversation
const invocation = await agent.chat({ message: "Hello!" })
console.log(invocation.thread_id) // Use this to continue the conversation

// Continue an existing conversation
await agent.chat({
  message: "Follow up question",
  threadId: invocation.thread_id,
})
```

#### Streaming mode

```typescript
// Stream responses in real-time
for await (const chunk of agent.chatStream({ message: "Hello!" })) {
  if (chunk.type === "message" && chunk.role === "agent") {
    process.stdout.write(chunk.content)
  }
}

// With message callback
const threadInfo = await agent.chatStream({
  message: "Hello!",
  onMessage: (message) => {
    console.log(`${message.role}: ${message.content}`)
  },
})
```

### Working with threads

The `Thread` class provides a clean API for managing chat threads:

```typescript
// Create a thread reference
const thread = agent.thread(threadId)

// Get the current thread state
const threadData = await thread.get()
console.log(threadData.status) // "pending" | "completed" | "failed"
console.log(threadData.messages)

// Poll until the thread completes
const result = await thread.poll({
  maxAttempts: 60,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  initialDelayMs: 1000,
  onPending: (thread, attempt) => {
    console.log(`Waiting... (attempt ${attempt})`)
  },
  onThreadNotFound: (attempt) => {
    console.log(`Thread not found yet (attempt ${attempt})`)
  },
})
```

### Convenience methods

The `Agent` class also provides convenience methods for thread operations:

```typescript
// Get thread directly
const threadData = await agent.getThread(threadId)

// Poll thread directly
const result = await agent.pollThread(threadId, {
  maxAttempts: 30,
  onPending: (thread, attempt) => {
    console.log(`Status: ${thread.status}`)
  },
})
```

## API reference

### NotionAgentsClient

Main client class extending the Notion SDK.

```typescript
const client = new NotionAgentsClient(options: ClientOptions);
```

#### ClientOptions

- `auth` (required): Your Notion API token
- `baseUrl` (optional): API base URL, defaults to `https://api.notion.com`
- `notionVersion` (optional): Notion API version, defaults to `2025-09-03`

### AgentOperations

Accessed via `client.agents`.

#### list(options?)

Lists all accessible custom agents.

```typescript
await client.agents.list({ name?: string });
```

Returns: `Promise<Array<Agent>>`

### Agent

Represents a custom agent.

#### Properties

- `id`: Agent ID
- `name`: Agent name
- `instruction`: Agent instructions (nullable)

#### Methods

##### chat(args)

Starts or continues a chat conversation.

```typescript
await agent.chat({
  message: string,
  threadId?: string
});
```

Returns: `Promise<ChatInvocationResponse>`

##### chatStream(args)

Streams a chat conversation in real-time.

```typescript
agent.chatStream({
  message: string,
  threadId?: string,
  onMessage?: (message: { role: "user" | "agent", content: string }) => void
});
```

Returns: `AsyncGenerator<StreamChunk, ThreadInfo, undefined>`

##### thread(threadId)

Creates a thread reference.

```typescript
agent.thread(threadId: string);
```

Returns: `Thread`

##### getThread(threadId)

Convenience method to get thread state.

```typescript
await agent.getThread(threadId: string);
```

Returns: `Promise<ThreadData>`

##### pollThread(threadId, options?)

Convenience method to poll thread until completion.

```typescript
await agent.pollThread(threadId: string, options?: PollThreadOptions);
```

Returns: `Promise<ThreadData>`

### Thread

Represents a chat thread.

#### Properties

- `threadId`: Thread ID
- `agentId`: Associated agent ID

#### Methods

##### get()

Retrieves the current thread state.

```typescript
await thread.get()
```

Returns: `Promise<ThreadData>`

##### poll(options?)

Polls the thread until completion with exponential backoff.

```typescript
await thread.poll(options?: PollThreadOptions);
```

Returns: `Promise<ThreadData>`

#### PollThreadOptions

- `maxAttempts` (default: 60): Maximum polling attempts
- `baseDelayMs` (default: 1000): Base delay between attempts
- `maxDelayMs` (default: 10000): Maximum delay between attempts
- `initialDelayMs` (default: 1000): Initial delay before first attempt
- `onPending`: Callback when thread is pending
- `onThreadNotFound`: Callback when thread is not found

## Environment setup

Create a `.env` file:

```bash
NOTION_API_TOKEN=your_token_here
```

Then in your code:

```typescript
import dotenv from "dotenv"
dotenv.config()

const client = new NotionAgentsClient({
  auth: process.env.NOTION_API_TOKEN,
})
```

## Prerequisites

- Custom agents feature enabled for your workspace
- Bot token from an internal integration or public integration
- Minimum capabilities: "Read content", "Insert content"

## Getting a bot token

### Internal integration (recommended)

1. In Notion: Settings & members → Connections → Develop or manage integrations
2. Click "New integration" → "Internal integration"
3. Set name and capabilities
4. Copy the "Internal Integration Secret"

### Public integration

1. Create a public integration at https://www.notion.so/my-integrations
2. Complete OAuth authorization flow
3. Use the access token

## License

MIT
