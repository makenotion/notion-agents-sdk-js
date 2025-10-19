import React from "react"
import { Box, Text, useInput } from "ink"
import type { AgentData } from "@notionhq/agents-client"

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
        {agents.map((agent, index) => (
          <Box key={agent.id}>
            <Text
              color={index === selectedIndex ? "green" : "white"}
              bold={index === selectedIndex}
            >
              {index === selectedIndex ? "→ " : "  "}
              {agent.name}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
