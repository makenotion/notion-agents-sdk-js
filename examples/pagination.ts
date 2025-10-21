import {
  NotionAgentsClient,
  iterateAgents,
  collectAgents,
  iterateThreads,
  collectThreads,
  iterateMessages,
  collectMessages,
} from "../dist/index.js"
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

  // Method 1: Using pagination helpers (recommended)
  console.log("Method 1: Using pagination helpers\n")

  console.log("Listing all agents using iterateAgents()...")
  let count = 0
  for await (const agent of iterateAgents(client)) {
    console.log(`  - ${agent.name} (${agent.id})`)
    count++
  }
  console.log(`Total: ${count} agents\n`)

  console.log("Collecting all agents using collectAgents()...")
  const allAgents = await collectAgents(client)
  console.log(`Collected ${allAgents.length} agents in memory\n`)

  // Method 2: Manual pagination (for more control)
  console.log("\nMethod 2: Manual pagination\n")

  console.log("Listing agents with manual pagination...")
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

  // Using helper
  console.log("Using iterateThreads() helper:")
  let threadCount = 0
  for await (const thread of iterateThreads(agent)) {
    console.log(
      `  - ${thread.title} (${thread.id}) - ${thread.status} - Created by: ${thread.created_by.type}`,
    )
    threadCount++
  }
  if (threadCount === 0) {
    console.log("  No threads found")
  }

  // Manual approach
  console.log("\nUsing manual pagination:")
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

    // Using helper
    console.log("Using collectMessages() helper:")
    const allMessages = await collectMessages(thread)
    if (allMessages.length > 0) {
      allMessages.forEach((message) => {
        console.log(
          `  - [${message.role}]: ${message.content.substring(0, 100)}...`,
        )
      })
      console.log(`Total: ${allMessages.length} messages`)
    } else {
      console.log("  No messages found")
    }

    // Manual approach
    console.log("\nUsing manual pagination:")
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

  console.log("Listing only completed threads using helper:")
  let completedCount = 0
  for await (const thread of iterateThreads(agent, { status: "completed" })) {
    console.log(`  - ${thread.title} (${thread.status})`)
    completedCount++
  }
  if (completedCount === 0) {
    console.log("  No completed threads found")
  }

  console.log("\nCollecting completed threads:")
  const completedThreads = await collectThreads(agent, { status: "completed" })
  console.log(`Found ${completedThreads.length} completed threads`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
