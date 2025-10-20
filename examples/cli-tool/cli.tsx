#!/usr/bin/env tsx
import React, { useState, useCallback } from "react"
import { render } from "ink"
import type { Config } from "./types.js"
import { loadConfig } from "./utils/config.js"
import { SetupScreen } from "./components/SetupScreen.js"
import { ChatApp } from "./components/ChatApp.js"

/**
 * Root component that manages the configuration state and routes between
 * the setup wizard and main chat interface.
 */
function App() {
  const [config, setConfig] = useState<Config | null>(loadConfig())

  const handleReconfigure = useCallback(() => {
    setConfig(null)
  }, [])

  if (!config) {
    return <SetupScreen onComplete={setConfig} />
  }

  return <ChatApp config={config} onReconfigure={handleReconfigure} />
}

render(<App />)
