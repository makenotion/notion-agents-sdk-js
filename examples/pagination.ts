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

  const firstAgent = await client.agents.list({ page_size: 1 })
  if (firstAgent.results.length === 0) {
    console.log("\nNo agents found. Create one in Notion first!")
    return
  }

  const agentData = firstAgent.results[0]
  const agent = client.agents.agent(agentData.id)

  console.log(`\n\nListing threads for agent: ${agentData.name}`)
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

  const threadsResponse = await agent.listThreads({ page_size: 1 })
  if (threadsResponse.results.length > 0) {
    const thread = agent.thread(threadsResponse.results[0].id)

    console.log(
      `\n\nListing messages for thread: ${threadsResponse.results[0].title}`,
    )
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
  }

  console.log("\n\n=== Filtering Example ===\n")

  console.log("Collecting completed threads:")
  const completedThreads = await collectThreads(agent, { status: "completed" })
  console.log(`Found ${completedThreads.length} completed threads`)
  completedThreads.forEach((thread) => {
    console.log(`  - ${thread.title} (${thread.status})`)
  })
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
