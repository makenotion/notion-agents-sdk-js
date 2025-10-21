# Copilot instructions for notion-agents-sdk-js

## Project overview

This is a TypeScript SDK for Notion Custom Agents. It wraps the official `@notionhq/client` SDK and adds agent-specific functionality with a clean, object-oriented API.

**Module format**: ES Modules (ESM) - all imports must use `.js` extensions for local files.

## Architecture

### Class hierarchy

```text
NotionAgentsClient (extends Client)
  └── agents: AgentOperations
        └── list() → Agent[]

Agent
  ├── chat()
  ├── chatStream()
  └── thread() → Thread

Thread
  ├── get()
  └── poll()
```

### Key design patterns

1. **Thread as a first-class object**: Thread operations are encapsulated in the `Thread` class, accessed via `agent.thread(threadId)`
2. **Inheritance over composition**: `NotionAgentsClient` extends the Notion `Client` class
3. **Constructor dependency injection**: All classes receive dependencies via constructor
4. **Async generators for streaming**: Use `async function*` for streaming APIs

## Code style

### TypeScript

- **Strict mode**: All strict TypeScript checks enabled
- **No escape hatches**: Avoid `as any`, `@ts-ignore`, or other type safety bypasses
- **Explicit types**: Use explicit return types for public methods
- **Readonly where possible**: Mark properties readonly when they shouldn't change
- **No semicolons**: Don't use semicolons at the end of statements (Prettier enforces this)
- **ESM imports**: Always include `.js` extension for local module imports (e.g., `from "./Thread.js"`)

### Comments

- **No redundant comments**: Don't explain what code obviously does
- **Explain why, not what**: Use comments to explain reasoning, not mechanics
- **80 character limit**: Wrap long comments to multiple lines
- **Multiline format**: Use `/* */` for block comments

### Naming

- **PascalCase**: Classes, types, interfaces
- **camelCase**: Functions, methods, variables
- **Descriptive names**: Prefer `threadId` over `id`, `baseDelayMs` over `delay`

### File organization

- **One class per file**: Each major class in its own file
- **Colocate types**: Keep related types in `types.ts`
- **Barrel exports**: Use `index.ts` for public API
- **Examples separate**: Keep examples in `examples/` directory

## SDK-specific patterns

### Error handling

```typescript
// Let errors propagate naturally, don't swallow them
const thread = await agent.getThread(threadId)

// For expected errors, check explicitly
if (thread.status === "failed") {
  console.error(thread.error)
}
```

### Streaming

```typescript
// Always use async generators for streams
async *chatStream(): AsyncGenerator<StreamChunk, ThreadInfo, undefined> {
  // Implementation
}

// Always clean up resources
try {
  // Stream processing
} finally {
  reader.releaseLock();
}
```

### Polling

```typescript
// Use exponential backoff with jitter
const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
const jitter = Math.random() * baseDelayMs
const delay = Math.min(exponentialDelay + jitter, maxDelayMs)
```

### Options objects

```typescript
// Use optional options parameter with defaults
async poll(options: PollThreadOptions = {}): Promise<ThreadData> {
  const {
    maxAttempts = 60,
    baseDelayMs = 1000,
    // ... more defaults
  } = options;
}
```

## Testing considerations

When writing tests:

- Mock the Notion Client, not the network
- Test public APIs, not implementation details
- Use dependency injection for testability
- Test error cases (polling timeouts, stream errors, etc.)

## Dependencies

- **Minimize dependencies**: Only add dependencies if absolutely necessary
- **Prefer native APIs**: Use native `fetch` over `node-fetch`
- **No internal imports**: Never import from `@notionhq/*` internal packages
- **Peer dependencies**: Core dependencies should be peer dependencies

## Documentation

### JSDoc

Use JSDoc for public APIs:

```typescript
/**
 * Polls the thread until completion with exponential backoff.
 */
async poll(options?: PollThreadOptions): Promise<ThreadData>
```

### README

- Keep API reference up to date with code changes
- Provide working examples
- Show both simple and advanced usage
- Document error cases

## Common pitfalls to avoid

1. **Don't mix concerns**: Keep agent operations separate from thread operations
2. **Don't mutate**: Classes should be immutable after construction
3. **Don't block**: Always use async/await, never block the event loop
4. **Don't guess types**: Use the official Notion SDK types when available

## When adding new features

1. Consider which class it belongs in (Agent, Thread, or AgentOperations)
2. Add types to `types.ts` first
3. Implement with tests in mind
4. Update README and examples
5. Keep backwards compatibility when possible

## Code review checklist

- [ ] No type casts or escape hatches
- [ ] Public methods have explicit return types
- [ ] Error handling is appropriate
- [ ] Resources are cleaned up (streams, readers, etc.)
- [ ] Follows existing patterns and conventions
- [ ] README updated if public API changed
- [ ] Examples still work
