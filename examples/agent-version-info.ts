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

  console.log("=== Agent Version Information ===\n")

  console.log("Listing all agents with version info...")
  const agentsResponse = await client.agents.list()

  if (agentsResponse.results.length === 0) {
    console.log("No agents found. Create one in Notion first!")
    return
  }

  console.log(`Found ${agentsResponse.results.length} agent(s)\n`)

  for (const agent of agentsResponse.results) {
    console.log(`Agent: ${agent.name}`)
    console.log(`  ID: ${agent.id}`)
    console.log(`  Instruction: ${agent.instruction || "(none)"}`)

    if (agent.version) {
      console.log(`  Version:`)
      console.log(`    ID: ${agent.version.id}`)
      console.log(`    Number: ${agent.version.number}`)
      console.log(`    Published At: ${agent.version.published_at}`)
    } else {
      console.log(`  Version: null (no published version metadata)`)
    }
    console.log()
  }

  // Get threads for the first agent and show agent_version
  const firstAgent = agentsResponse.results[0]
  const agentInstance = client.agents.agent(firstAgent.id)

  console.log(`\n=== Thread Version Information ===\n`)
  console.log(`Listing threads for agent: ${firstAgent.name}\n`)

  const threadsResponse = await agentInstance.listThreads({ page_size: 10 })

  if (threadsResponse.results.length === 0) {
    console.log("No threads found for this agent.")
  } else {
    console.log(`Found ${threadsResponse.results.length} thread(s)\n`)

    for (const thread of threadsResponse.results) {
      console.log(`Thread: ${thread.title}`)
      console.log(`  ID: ${thread.id}`)
      console.log(`  Status: ${thread.status}`)
      console.log(`  Created By: ${thread.created_by.type} (${thread.created_by.id})`)

      if (thread.agent_version) {
        console.log(`  Agent Version:`)
        console.log(`    ID: ${thread.agent_version.id}`)
        console.log(`    Number: ${thread.agent_version.number}`)
        console.log(`    Published At: ${thread.agent_version.published_at}`)
      } else {
        console.log(`  Agent Version: null (no version metadata recorded)`)
      }
      console.log()
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
