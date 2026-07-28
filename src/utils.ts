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
  return text.replace(/<\/?lang(?=[\s/>])[^>]*>/g, "")
}

/**
 * @deprecated Personal agent access is unsupported and should not be
 * used for new integrations.
 */
export function isPersonalAgent(agentId: string): boolean {
  return agentId === PERSONAL_AGENT_ID
}
