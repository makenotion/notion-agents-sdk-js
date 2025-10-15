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

  const agents = await client.agents.list()

  if (agents.length === 0) {
    console.log("No agents found. Create one in Notion first!")
    return
  }

  const agent = agents[0]
  console.log(`Chatting with: ${agent.name}\n`)

  console.log("User: Hello!\n")
  console.log("Agent: ")

  for await (const chunk of agent.chatStream({
    message: "Hello!",
    onMessage: (message) => {
      if (message.role === "agent") {
        process.stdout.write(message.content)
      }
    },
  })) {
    if (chunk.type === "started") {
      console.log(`[Thread started: ${chunk.thread_id}]`)
    } else if (chunk.type === "done") {
      console.log("\n\n[Conversation complete]")
    } else if (chunk.type === "error") {
      console.error(`\nError: ${chunk.message}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
