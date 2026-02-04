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

  const agentsResponse = await client.agents.list()

  if (agentsResponse.results.length === 0) {
    console.log("No agents found. Create one in Notion first!")
    return
  }

  const agentData = agentsResponse.results[0]
  const agent = client.agents.agent(agentData.id)
  console.log(`Chatting with: ${agentData.name}\n`)

  const messages = [
    "What is the capital of France?",
    "What is its population?",
    "Tell me an interesting fact about it.",
  ]

  let threadId: string | undefined

  for (const message of messages) {
    console.log(`User: ${message}`)

    const invocation = await agent.chat({
      message,
      threadId,
    })

    threadId = invocation.thread_id

    await agent.pollThread(threadId, {
      onPending: () => {
        process.stdout.write(".")
      },
    })

    const thread = agent.thread(threadId)
    const messagesResponse = await thread.listMessages({
      role: "agent",
      page_size: 1,
    })

    if (messagesResponse.results.length > 0) {
      // Messages are returned in reverse chronological order (most recent first)
      const agentMessage = messagesResponse.results[0]
      console.log(`\nAgent: ${agentMessage.content}\n`)
    }
  }

  console.log(`\nFull conversation thread ID: ${threadId}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
