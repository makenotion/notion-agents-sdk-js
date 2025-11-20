import { PERSONAL_AGENT_ID } from "./types.js"

/**
 * Removes `<lang>` XML tags from agent response text.
 *
 * These tags are metadata added by the API that aren't useful for most
 * display contexts (terminals, web UIs, etc.). They indicate the language
 * of the response but are typically not needed in the rendered output.
 *
 * @param text - The text containing lang tags to strip
 * @returns The text with all lang tags removed
 *
 * @example
 * ```typescript
 * const cleaned = stripLangTags('<lang primary="en-US"/>Hello world')
 * // Returns: "Hello world"
 *
 * const multiline = stripLangTags(
 *   '<lang primary="en-US">Hello</lang>\n<lang primary="fr-FR">Bonjour</lang>'
 * )
 * // Returns: "Hello\nBonjour"
 * ```
 */
export function stripLangTags(text: string): string {
  return text.replace(/<\/?lang[^>]*>/g, "")
}

/**
 * Checks if an agent ID represents the Personal Agent (Notion AI).
 *
 * The personal agent uses a reserved UUID identifier.
 *
 * @param agentId - The agent ID to check
 * @returns `true` if the agent ID is the personal agent, `false` otherwise
 *
 * @example
 * ```typescript
 * const agent = client.agents.personal()
 * console.log(isPersonalAgent(agent.id)) // true
 *
 * const customAgent = client.agents.agent("some-uuid")
 * console.log(isPersonalAgent(customAgent.id)) // false
 *
 * if (isPersonalAgent(agentData.id)) {
 *   console.log("This is the Notion AI assistant")
 * }
 * ```
 */
export function isPersonalAgent(agentId: string): boolean {
  return agentId === PERSONAL_AGENT_ID
}
