# @notionhq/agents-client

A TypeScript SDK for interacting with Notion Custom Agents via the public API.

## Features

- Clean, type-safe wrapper around the official Notion SDK
- `Agent` class for agent-specific operations
- `Thread` class for managing chat threads
- Streaming support for real-time responses
- Built-in polling with exponential backoff
- Pagination support for agents, threads, and messages
- Filtering and sorting capabilities
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
const agentsResponse = await client.agents.list()
const agentData = agentsResponse.results[0]
const agent = client.agents.agent(agentData.id)

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
// List all agents with pagination
const agentsResponse = await client.agents.list({
  page_size: 10,
  start_cursor: undefined,
})

console.log(`Found ${agentsResponse.results.length} agents`)
console.log(`Has more: ${agentsResponse.has_more}`)

// Get an agent instance by ID
const agent = client.agents.agent(agentsResponse.results[0].id)

// Filter by name
const salesAgents = await client.agents.list({
  name: "Sales",
  page_size: 5,
})

// Paginate through all agents
let cursor = undefined
do {
  const response = await client.agents.list({
    page_size: 10,
    start_cursor: cursor,
  })

  for (const agentData of response.results) {
    console.log(agentData.name)
  }

  cursor = response.next_cursor
} while (cursor)
```

### Chatting with agents

#### Async mode

```typescript
// Get an agent instance
const agentsResponse = await client.agents.list({ page_size: 1 })
const agent = client.agents.agent(agentsResponse.results[0].id)

// Start a new conversation
const invocation = await agent.chat({ message: "Hello!" })
console.log(invocation.thread_id)

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

### Listing threads

```typescript
// List threads for an agent
const threadsResponse = await agent.listThreads({
  page_size: 10,
  start_cursor: undefined,
})

console.log(`Found ${threadsResponse.results.length} threads`)

// Get a specific thread by ID (useful for polling)
const specificThread = await agent.listThreads({
  id: "thread_123",
})

// Filter by status
const completedThreads = await agent.listThreads({
  status: "completed",
  page_size: 20,
})

// Filter by creator
const botThreads = await agent.listThreads({
  created_by_type: "bot",
})

// Combine filters with pagination
const filteredThreads = await agent.listThreads({
  status: "completed",
  created_by_type: "bot",
  page_size: 10,
  start_cursor: cursor,
})
```

### Listing thread messages

```typescript
const thread = agent.thread(threadId)

// List all messages
const messagesResponse = await thread.listMessages({
  page_size: 20,
})

// Filter by role
const agentMessages = await thread.listMessages({
  role: "agent",
  page_size: 10,
})

// Paginate through messages
let cursor = undefined
do {
  const response = await thread.listMessages({
    page_size: 20,
    start_cursor: cursor,
  })

  for (const message of response.results) {
    console.log(`${message.role}: ${message.content}`)
  }

  cursor = response.next_cursor
} while (cursor)
```

### Working with threads

The `Thread` class provides a clean API for managing chat threads:

```typescript
// Create a thread reference
const thread = agent.thread(threadId)

// Get the current thread metadata (status, title, etc.)
const threadInfo = await thread.get()
console.log(threadInfo.status) // "pending" | "completed" | "failed"
console.log(threadInfo.title)

// Get messages separately
const messages = await thread.listMessages({ page_size: 20 })
console.log(messages.results)

// Poll until the thread completes
const result = await thread.poll({
  maxAttempts: 60,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  initialDelayMs: 1000,
  onPending: (thread, attempt) => {
    console.log(`Waiting... status: ${thread.status} (attempt ${attempt})`)
  },
  onThreadNotFound: (attempt) => {
    console.log(`Thread not found yet (attempt ${attempt})`)
  },
})
```

### Convenience methods

The `Agent` class also provides convenience methods for thread operations:

```typescript
// Get thread metadata directly
const threadInfo = await agent.getThread(threadId)
console.log(threadInfo.status, threadInfo.title)

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

#### list(params?)

Lists all accessible custom agents with pagination.

```typescript
await client.agents.list({
  name?: string,
  page_size?: number,
  start_cursor?: string
});
```

Returns: `Promise<AgentListResponse>`

Response includes:

- `results`: Array of agent data
- `has_more`: Boolean indicating if more results exist
- `next_cursor`: Cursor for the next page (null if no more results)

#### agent(agentId)

Creates an agent instance by ID.

```typescript
client.agents.agent(agentId: string);
```

Returns: `Agent`

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

Convenience method to get thread metadata.

```typescript
await agent.getThread(threadId: string);
```

Returns: `Promise<ThreadListItem>`

##### pollThread(threadId, options?)

Convenience method to poll thread until completion.

```typescript
await agent.pollThread(threadId: string, options?: PollThreadOptions);
```

Returns: `Promise<ThreadListItem>`

##### listThreads(params?)

Lists threads for the agent with pagination and filtering.

```typescript
await agent.listThreads({
  id?: string,
  title?: string,
  status?: "pending" | "completed" | "failed",
  created_by_type?: "user" | "bot",
  created_by_id?: string,
  page_size?: number,
  start_cursor?: string
});
```

Returns: `Promise<ThreadListResponse>`

### Thread

Represents a chat thread.

#### Properties

- `threadId`: Thread ID
- `agentId`: Associated agent ID

#### Methods

##### get()

Retrieves the current thread metadata (status, title, created_by).

```typescript
await thread.get()
```

Returns: `Promise<ThreadListItem>`

##### poll(options?)

Polls the thread until completion with exponential backoff.

```typescript
await thread.poll(options?: PollThreadOptions);
```

Returns: `Promise<ThreadListItem>`

##### listMessages(params?)

Lists messages in the thread with pagination and filtering.

```typescript
await thread.listMessages({
  role?: "user" | "agent",
  page_size?: number,
  start_cursor?: string
});
```

Returns: `Promise<ThreadMessageListResponse>`

#### PollThreadOptions

- `maxAttempts` (default: 60): Maximum polling attempts
- `baseDelayMs` (default: 1000): Base delay between attempts
- `maxDelayMs` (default: 10000): Maximum delay between attempts
- `initialDelayMs` (default: 1000): Initial delay before first attempt
- `onPending`: Callback when thread is pending
- `onThreadNotFound`: Callback when thread is not found

## Error handling

The SDK provides specific error classes for different failure scenarios:

```typescript
import {
  NotionAgentsError,
  AgentNotFoundError,
  ThreadNotFoundError,
  PollingTimeoutError,
  StreamError,
} from "@notionhq/agents-client"

try {
  const agent = client.agents.agent("invalid_id")
  await agent.chat({ message: "Hello" })
} catch (error) {
  if (error instanceof AgentNotFoundError) {
    console.error(`Agent ${error.agentId} not found`)
  } else if (error instanceof ThreadNotFoundError) {
    console.error(`Thread ${error.threadId} not found`)
  } else if (error instanceof PollingTimeoutError) {
    console.error(`Polling timed out after ${error.attempts} attempts`)
  } else if (error instanceof StreamError) {
    console.error(`Stream error [${error.code}]: ${error.message}`)
  } else if (error instanceof NotionAgentsError) {
    console.error(`Agents error [${error.code}]: ${error.message}`)
  } else {
    throw error
  }
}
```

### Error classes

All SDK errors extend `NotionAgentsError`, which provides:

- `message`: Human-readable error message
- `code`: Machine-readable error code
- `name`: Error class name

**Specific errors:**

- **`AgentNotFoundError`**: Agent doesn't exist or isn't accessible
  - Additional property: `agentId`
- **`ThreadNotFoundError`**: Thread doesn't exist or isn't accessible
  - Additional property: `threadId`
- **`PollingTimeoutError`**: Thread polling exceeded max attempts
  - Additional property: `attempts`
- **`StreamError`**: Error occurred during streaming
  - Includes API error codes like `rate_limited`, `unauthorized`, etc.

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

## Development

### Running tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

See [README.test.md](./README.test.md) for the full testing guide.

### Building

```bash
npm run build
```

### Type checking

```bash
# Typecheck source code
npm run typecheck

# Typecheck examples
npm run typecheck:examples
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
