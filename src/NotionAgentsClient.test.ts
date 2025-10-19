import { describe, it, expect } from "vitest"
import { NotionAgentsClient } from "./NotionAgentsClient.js"

describe("NotionAgentsClient", () => {
  it("should throw error if auth token is missing", () => {
    expect(() => {
      new NotionAgentsClient({ auth: "" })
    }).toThrow("Notion API token is required")
  })

  it("should initialize with default values", () => {
    const client = new NotionAgentsClient({ auth: "test_token" })

    expect(client.agents).toBeDefined()
  })

  it("should accept custom baseUrl", () => {
    const client = new NotionAgentsClient({
      auth: "test_token",
      baseUrl: "https://custom.api.com",
    })

    expect(client.agents).toBeDefined()
  })

  it("should accept custom notionVersion", () => {
    const client = new NotionAgentsClient({
      auth: "test_token",
      notionVersion: "2024-01-01",
    })

    expect(client.agents).toBeDefined()
  })
})
