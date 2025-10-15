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

  console.log("Listing agents...")
  const agents = await client.agents.list()
  console.log(`Found ${agents.length} agent(s)`)

  if (agents.length === 0) {
    console.log("No agents found. Create one in Notion first!")
    return
  }

  const agent = agents[0]
  console.log(`\nChatting with: ${agent.name}`)

  console.log("Starting chat...")
  const invocation = await agent.chat({ message: "Hello!" })
  console.log(`Thread ID: ${invocation.thread_id}`)

  console.log("\nPolling for response...")
  const thread = agent.thread(invocation.thread_id)
  const result = await thread.poll({
    onPending: (thread, attempt) => {
      console.log(
        `Waiting... (attempt ${attempt + 1}, status: ${thread.status})`,
      )
    },
  })

  console.log("\nConversation:")
  for (const message of result.messages) {
    console.log(`${message.role}: ${message.content}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
