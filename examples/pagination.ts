import { NotionAgentsClient } from "../dist/index.js"
import * as dotenv from "dotenv"

dotenv.config()

async function main() {
  if (!process.env.NOTION_API_TOKEN) {
    console.error(
      "Error: NOTION_API_TOKEN environment variable is not set.\n" +
        "Please create a .env file with: NOTION_API_TOKEN=your_token_here",
    )
    process.exit(1)
  }

  const client = new NotionAgentsClient({
    auth: process.env.NOTION_API_TOKEN,
    ...(process.env.NOTION_BASE_URL && {
      baseUrl: process.env.NOTION_BASE_URL,
    }),
  })

  console.log("=== Pagination Example ===\n")

  console.log("Listing agents with pagination...")
  let agentsCursor: string | null = null
  let agentsPage = 1

  do {
    const response = await client.agents.list({
      page_size: 5,
      ...(agentsCursor ? { start_cursor: agentsCursor } : {}),
    })

    console.log(`\nPage ${agentsPage}:`)
    response.results.forEach((agent) => {
      console.log(`  - ${agent.name} (${agent.id})`)
    })

    console.log(
      `  Has more: ${response.has_more}, Next cursor: ${response.next_cursor}`,
    )

    agentsCursor = response.next_cursor
    agentsPage++
  } while (agentsCursor)

  const firstAgent = await client.agents.list({ page_size: 1 })
  if (firstAgent.results.length === 0) {
    console.log("\nNo agents found. Create one in Notion first!")
    return
  }

  const agentData = firstAgent.results[0]
  const agent = client.agents.agent(agentData.id)

  console.log(`\n\nListing threads for agent: ${agentData.name}`)
  let threadsCursor: string | null = null
  let threadsPage = 1

  do {
    const response = await agent.listThreads({
      page_size: 10,
      ...(threadsCursor ? { start_cursor: threadsCursor } : {}),
    })

    if (response.results.length > 0) {
      console.log(`\nPage ${threadsPage}:`)
      response.results.forEach((thread) => {
        console.log(
          `  - ${thread.title} (${thread.id}) - ${thread.status} - Created by: ${thread.created_by.type}`,
        )
      })

      console.log(
        `  Has more: ${response.has_more}, Next cursor: ${response.next_cursor}`,
      )
    } else {
      console.log("  No threads found")
    }

    threadsCursor = response.next_cursor
    threadsPage++
  } while (threadsCursor)

  const threadsResponse = await agent.listThreads({ page_size: 1 })
  if (threadsResponse.results.length > 0) {
    const thread = agent.thread(threadsResponse.results[0].id)

    console.log(
      `\n\nListing messages for thread: ${threadsResponse.results[0].title}`,
    )
    let messagesCursor: string | null = null
    let messagesPage = 1

    do {
      const response = await thread.listMessages({
        page_size: 10,
        ...(messagesCursor ? { start_cursor: messagesCursor } : {}),
      })

      if (response.results.length > 0) {
        console.log(`\nPage ${messagesPage}:`)
        response.results.forEach((message) => {
          console.log(
            `  - [${message.role}]: ${message.content.substring(0, 100)}...`,
          )
        })

        console.log(
          `  Has more: ${response.has_more}, Next cursor: ${response.next_cursor}`,
        )
      } else {
        console.log("  No messages found")
      }

      messagesCursor = response.next_cursor
      messagesPage++
    } while (messagesCursor)
  }

  console.log("\n\n=== Filtering Example ===\n")

  console.log("Listing only completed threads:")
  const completedThreads = await agent.listThreads({
    status: "completed",
    page_size: 5,
  })

  if (completedThreads.results.length > 0) {
    completedThreads.results.forEach((thread) => {
      console.log(`  - ${thread.title} (${thread.status})`)
    })
  } else {
    console.log("  No completed threads found")
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
