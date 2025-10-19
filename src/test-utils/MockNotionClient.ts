import type { Client } from "@notionhq/client"

type MockResponse = unknown
type MockFetchResponse = Response

export interface MockRequestHandler {
  (params: {
    path: string
    method: string
    query?: Record<string, unknown>
    body?: Record<string, unknown>
  }): Promise<MockResponse>
}

export interface MockFetchHandler {
  (url: string, init?: RequestInit): Promise<MockFetchResponse>
}

export class MockNotionClient {
  private requestHandler: MockRequestHandler
  private fetchHandler?: MockFetchHandler

  constructor(
    requestHandler: MockRequestHandler,
    fetchHandler?: MockFetchHandler,
  ) {
    this.requestHandler = requestHandler
    this.fetchHandler = fetchHandler
  }

  async request<T>(params: {
    path: string
    method: string
    query?: Record<string, unknown>
    body?: Record<string, unknown>
  }): Promise<T> {
    return (await this.requestHandler(params)) as T
  }

  getFetchHandler(): MockFetchHandler | undefined {
    return this.fetchHandler
  }
}

export function createMockClient(
  requestHandler: MockRequestHandler,
  fetchHandler?: MockFetchHandler,
): Client {
  return new MockNotionClient(requestHandler, fetchHandler) as unknown as Client
}

export function createReadableStream(
  chunks: string[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index++
      } else {
        controller.close()
      }
    },
  })
}

export function mockStreamResponse(chunks: string[]): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    body: createReadableStream(chunks),
  } as Response
}

export function mockHTTPErrorResponse(
  status: number,
  statusText: string,
  body?: { code: string; message: string },
): Response {
  const bodyContent = body
    ? JSON.stringify(body)
    : JSON.stringify({
        code: "internal_server_error",
        message: "An error occurred",
      })

  return {
    ok: false,
    status,
    statusText,
    body: createReadableStream([bodyContent]),
    json: async () => JSON.parse(bodyContent),
    text: async () => bodyContent,
  } as Response
}
