export class NotionAgentsError extends Error {
  public readonly code: string

  constructor(message: string, code = "unknown_error") {
    super(message)
    this.name = "NotionAgentsError"
    this.code = code
    Object.setPrototypeOf(this, NotionAgentsError.prototype)
  }
}

export class AgentNotFoundError extends NotionAgentsError {
  public readonly agentId: string

  constructor(agentId: string) {
    super(`Agent ${agentId} not found`, "agent_not_found")
    this.name = "AgentNotFoundError"
    this.agentId = agentId
    Object.setPrototypeOf(this, AgentNotFoundError.prototype)
  }
}

export class ThreadNotFoundError extends NotionAgentsError {
  public readonly threadId: string

  constructor(threadId: string) {
    super(`Thread ${threadId} not found`, "thread_not_found")
    this.name = "ThreadNotFoundError"
    this.threadId = threadId
    Object.setPrototypeOf(this, ThreadNotFoundError.prototype)
  }
}

export class PollingTimeoutError extends NotionAgentsError {
  public readonly attempts: number

  constructor(attempts: number) {
    super(
      `Thread polling timed out after ${attempts} attempts`,
      "polling_timeout",
    )
    this.name = "PollingTimeoutError"
    this.attempts = attempts
    Object.setPrototypeOf(this, PollingTimeoutError.prototype)
  }
}

export class StreamError extends NotionAgentsError {
  constructor(message: string, code: string) {
    super(message, code)
    this.name = "StreamError"
    Object.setPrototypeOf(this, StreamError.prototype)
  }
}
