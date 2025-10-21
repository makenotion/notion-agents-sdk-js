import { NotionAgentsClient, stripLangTags } from "../dist/index.js"
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

  console.log("=== Personal Agent (Notion AI) Example ===\n")

  // Access the personal agent using the convenience method
  const personalAgent = client.agents.personal()
  console.log("Accessing personal agent with ID:", personalAgent.id)

  console.log("\n--- Streaming Chat Example ---")
  console.log("User: What can you help me with?\n")
  console.log("Agent: ")

  let threadId: string | undefined

  for await (const chunk of personalAgent.chatStream({
    message: "What can you help me with?",
  })) {
    if (chunk.type === "started") {
      threadId = chunk.thread_id
    } else if (chunk.type === "message" && chunk.role === "agent") {
      const cleanContent = stripLangTags(chunk.content)
      process.stdout.write(cleanContent)
    }
  }

  console.log("\n\n--- Non-streaming Chat Example ---")
  if (!threadId) {
    console.error("No thread ID from previous chat")
    return
  }

  console.log("User: Tell me more about searching my workspace\n")

  const invocation = await personalAgent.chat({
    message: "Tell me more about searching my workspace",
    threadId,
  })

  console.log(`Thread ID: ${invocation.thread_id}`)
  console.log("Status:", invocation.status)

  console.log("\nPolling for response...")
  const thread = personalAgent.thread(invocation.thread_id)
  const result = await thread.poll({
    onPending: (thread, attempt) => {
      console.log(
        `Waiting... (attempt ${attempt + 1}, status: ${thread.status})`,
      )
    },
  })

  console.log(`\nThread completed with status: ${result.status}`)

  console.log("\n--- Fetching Conversation ---")
  const messagesResponse = await thread.listMessages()

  for (const message of messagesResponse.results) {
    const content = stripLangTags(message.content)
    console.log(`\n${message.role.toUpperCase()}: ${content}`)
  }

  console.log("\n--- Listing Personal Agent Threads ---")
  const threadsResponse = await personalAgent.listThreads({ page_size: 5 })
  console.log(`\nFound ${threadsResponse.results.length} thread(s)`)

  for (const threadItem of threadsResponse.results) {
    console.log(`- ${threadItem.title} (${threadItem.status})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
