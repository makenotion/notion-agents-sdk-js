# Examples

This directory contains example scripts demonstrating how to use the Notion Agents SDK.

## Setup

1. Create a `.env` file in the root directory:

```bash
NOTION_API_TOKEN=your_token_here
# Optional: override the base URL for testing against different environments
# NOTION_BASE_URL=http://localhost:3000
```

2. Install dependencies:

```bash
npm install
```

3. Run any example:

```bash
npx tsx examples/basic-usage.ts
```

## Available examples

### `basic-usage.ts`

Demonstrates the basic flow:

- Listing agents
- Starting a chat
- Using the `Thread` class to poll for completion
- Displaying the conversation

### `streaming.ts`

Shows real-time streaming:

- Using `chatStream()` for instant responses
- Handling stream chunks
- Displaying agent responses as they arrive

### `continue-conversation.ts`

Demonstrates multi-turn conversations:

- Continuing a thread across multiple messages
- Maintaining conversation context
- Using the same thread ID for follow-up questions

## Key patterns

### Using the Thread class

The SDK provides a clean `Thread` class for managing chat threads:

```typescript
// Create a thread reference
const thread = agent.thread(threadId)

// Get current state
const state = await thread.get()

// Poll until complete
const result = await thread.poll({
  maxAttempts: 60,
  onPending: (thread, attempt) => {
    console.log(`Waiting... ${thread.status}`)
  },
})
```

### Convenience methods

The `Agent` class also provides convenience methods:

```typescript
// Get thread directly
await agent.getThread(threadId)

// Poll thread directly
await agent.pollThread(threadId, options)
```

Both patterns are valid - use whichever fits your code style better!

## Error handling

```typescript
try {
  const result = await thread.poll()
  console.log(result.messages)
} catch (error) {
  if (error.message.includes("timed out")) {
    console.error("Thread took too long to complete")
  } else {
    console.error("Unexpected error:", error)
  }
}
```

## Streaming error handling

```typescript
try {
  for await (const chunk of agent.chatStream({ message: "Hello" })) {
    if (chunk.type === "error") {
      console.error(`Stream error [${chunk.code}]: ${chunk.message}`)
      break
    }
  }
} catch (error) {
  console.error("Stream failed:", error)
}
```
