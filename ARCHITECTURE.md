# Architecture

This document explains the design decisions and architecture of the Notion Agents SDK.

## Class structure

The SDK is organized into clean, focused classes:

```text
NotionAgentsClient (extends Notion Client)
  ├── agents: AgentOperations
  │     └── list() → Agent[]
  └── sessions: SessionOperations
        └── query() → Session[]

Agent
  ├── chat()
  ├── chatStream()
  └── thread() → Thread

Thread
  ├── get()
  ├── poll()
  ├── listMessages()
  └── sendMessage()
```

## Design decisions

### 1. Thread as a first-class object

Instead of having thread operations scattered across the Agent class, we introduced a dedicated `Thread` class. This provides several benefits:

**Before (monolithic approach):**

```typescript
const thread = await agent.getThread(threadId)
const result = await agent.pollThread(threadId, options)
```

**After (with Thread class):**

```typescript
const thread = agent.thread(threadId)
const state = await thread.get()
const result = await thread.poll(options)
```

**Benefits:**

- **Encapsulation**: Thread operations are grouped together
- **Reusability**: Create a thread reference once, use it multiple times
- **Clarity**: Clear separation between agent and thread responsibilities
- **Extensibility**: Easy to add new thread-specific methods

### 2. Convenience methods

We kept the convenience methods on `Agent` for backwards compatibility and simple use cases:

```typescript
agent.getThread(threadId) // Shorthand for agent.thread(threadId).get()
agent.pollThread(threadId) // Shorthand for agent.thread(threadId).poll()
```

This gives users flexibility to choose their preferred style.

### 3. Extending vs wrapping

The `NotionAgentsClient` extends the official Notion `Client` class rather than wrapping it. This means:

- All standard Notion SDK functionality is available
- No need to maintain wrapper methods for standard APIs
- Users get both agent operations and standard Notion APIs in one client

```typescript
const client = new NotionAgentsClient({ auth: token })

// Agent operations
const agents = await client.agents.list()

// Standard Notion operations
const pages = await client.pages.retrieve({ page_id: "..." })
```

### 4. Type safety

All public APIs are fully typed:

- Request parameters
- Response types
- Stream chunks
- Options objects

This provides excellent IDE support and catches errors at compile time.

### 5. Streaming with generators

The streaming API uses async generators, which is idiomatic JavaScript for handling streams:

```typescript
for await (const chunk of agent.chatStream({ message: "..." })) {
  // Handle each chunk as it arrives
}
```

This provides:

- Backpressure handling
- Clean syntax
- Easy error handling with try/catch

## File organization

```text
src/
├── types.ts                 # Type definitions
├── Thread.ts                # Thread class
├── Agent.ts                 # Agent class
├── AgentOperations.ts       # Agent listing and management
├── SessionOperations.ts     # Cross-agent session search
├── NotionAgentsClient.ts    # Main client
└── index.ts                 # Public exports
```

Each class is in its own file, making the codebase easy to navigate and maintain.

## Dependencies

The SDK has minimal dependencies:

- `@notionhq/client`: Official Notion SDK (required)
- `dotenv`: Environment variable loading (dev only)

All runtime dependencies are peer dependencies, keeping the bundle small.

## Error handling

Errors follow the Notion API error format:

- HTTP errors are preserved with status codes
- Stream errors include error codes matching the REST API
- Polling timeouts throw descriptive error messages

## Testing strategy

The SDK is designed to be testable:

- Dependency injection via constructor
- Pure functions where possible
- Minimal side effects
- Clear separation of concerns

## Future extensions

The architecture makes it easy to add:

- Thread deletion
- Agent creation/updating
- Webhook support
- Additional polling strategies

Each would be added to the appropriate class without affecting others.
