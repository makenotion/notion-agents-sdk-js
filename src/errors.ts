import { APIErrorCode, APIResponseError } from "@notionhq/client"

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

type NotionApiErrorLike = {
  code?: unknown
  message?: unknown
}

export type NotionApiObjectType = "agent" | "thread"

function getErrorCode(error: unknown): string | undefined {
  if (APIResponseError.isAPIResponseError(error)) {
    return error.code
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = (error as NotionApiErrorLike).code
    if (typeof code === "string") {
      return code
    }
  }
  return undefined
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as NotionApiErrorLike).message
    if (typeof message === "string") {
      return message
    }
  }
  return undefined
}

function parseObjectNotFoundTypeFromMessage(
  message: string,
): NotionApiObjectType | undefined {
  const match = message.match(/Could not find (agent|thread) with ID:/)
  if (!match) {
    return undefined
  }
  return match[1] as NotionApiObjectType
}

export function isObjectNotFoundErrorForType(
  error: unknown,
  objectType: NotionApiObjectType,
): boolean {
  const code = getErrorCode(error)
  if (code !== APIErrorCode.ObjectNotFound) {
    return false
  }

  const message = getErrorMessage(error)
  if (!message) {
    return false
  }

  return parseObjectNotFoundTypeFromMessage(message) === objectType
}
