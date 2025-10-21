import React from "react"
import { Box, Text, useInput } from "ink"
import type { AgentData } from "@notionhq/agents-client"
import { isPersonalAgent } from "@notionhq/agents-client"

/**
 * Interactive agent selector component with arrow key navigation.
 * Displays a list of agents and allows the user to select one using
 * up/down arrow keys.
 */
export function AgentSelector({
  agents,
  selectedIndex,
  onSelect,
}: {
  agents: AgentData[]
  selectedIndex: number
  onSelect: (index: number) => void
}) {
  useInput((input, key) => {
    if (key.upArrow) {
      onSelect(Math.max(0, selectedIndex - 1))
    } else if (key.downArrow) {
      onSelect(Math.min(agents.length - 1, selectedIndex + 1))
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Select an agent (use arrow keys, press Enter to confirm):
      </Text>
      <Box marginTop={1} flexDirection="column">
        {agents.map((agent, index) => {
          const isPersonalAgentItem = isPersonalAgent(agent.id)
          const isSelected = index === selectedIndex

          return (
            <Box key={agent.id}>
              <Text color={isSelected ? "green" : "white"} bold={isSelected}>
                {isSelected ? "→ " : "  "}
                {agent.name}
                {isPersonalAgentItem && (
                  <Text color="blue" dimColor={!isSelected}>
                    {" "}
                    (Notion AI)
                  </Text>
                )}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
