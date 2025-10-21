import { NotionAgentsClient, isPersonalAgent } from "../dist/index.js"
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

  console.log("Listing agents...")
  const agentsResponse = await client.agents.list()
  console.log(`Found ${agentsResponse.results.length} agent(s)`)

  if (agentsResponse.results.length === 0) {
    console.log("No agents found. Create one in Notion first!")
    return
  }

  const agentData = agentsResponse.results[0]

  // Note: The first agent is always the personal agent (Notion AI) on the first page
  if (isPersonalAgent(agentData.id)) {
    console.log(`First agent is the personal agent: ${agentData.name}`)
  }

  const agent = client.agents.agent(agentData.id)
  console.log(`\nChatting with: ${agentData.name}`)

  console.log("Starting chat...")
  const invocation = await agent.chat({ message: "Hello!" })
  console.log(`Thread ID: ${invocation.thread_id}`)

  console.log("\nPolling for response...")
  const thread = agent.thread(invocation.thread_id)
  const threadInfo = await thread.poll({
    onPending: (thread, attempt) => {
      console.log(
        `Waiting... (attempt ${attempt + 1}, status: ${thread.status})`,
      )
    },
  })

  console.log(`\nThread completed with status: ${threadInfo.status}`)

  console.log("\nFetching conversation messages...")
  const messagesResponse = await thread.listMessages()

  console.log("\nConversation:")
  for (const message of messagesResponse.results) {
    console.log(`${message.role}: ${message.content}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
